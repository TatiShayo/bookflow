import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { sendBookingConfirmation, sendHostNotification } from "@/lib/resend";
import { generateSlots, getZonedDateString, isValidTimezone } from "@/lib/slots";
import { validateBookingInput } from "@/lib/validation";
import { parseISO, isValid } from "date-fns";
import type { Availability, Booking, EventType, Profile } from "@/lib/types";
import { stripe } from "@/lib/stripe";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      eventTypeId,
      attendeeName,
      attendeeEmail,
      attendeePhone,
      startTime,
      endTime,
      notes,
      stripePaymentIntentId,
      amountPaid,
      currency,
    } = body;

    const supabase = createServiceClient();

    // 1. Fetch Event Type
    if (!eventTypeId || typeof eventTypeId !== "string") {
      return NextResponse.json({ error: "Event type ID is required" }, { status: 400 });
    }

    const { data: rawEvent, error: eventError } = await supabase
      .from("event_types")
      .select("*")
      .eq("id", eventTypeId)
      .eq("is_active", true)
      .single();

    if (eventError || !rawEvent) {
      return NextResponse.json({ error: "Event type not found or inactive" }, { status: 404 });
    }
    const eventType = rawEvent as unknown as EventType;

    // 2. Validate booking inputs
    const validation = validateBookingInput(
      {
        eventTypeId,
        attendeeName,
        attendeeEmail,
        startTime,
        endTime,
        attendeePhone,
        notes,
        amountPaid: Number(amountPaid) || 0,
        currency,
        stripePaymentIntentId,
      },
      eventType.duration_minutes
    );

    if (!validation.isValid) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.errors },
        { status: 400 }
      );
    }

    // 3. Get Host Profile to check Timezone & Email
    const { data: rawHost } = await supabase
      .from("profiles")
      .select("id, display_name, timezone")
      .eq("id", eventType.user_id)
      .single();

    const hostProfile = rawHost as unknown as Profile | null;
    if (!hostProfile) {
      return NextResponse.json({ error: "Host profile not found" }, { status: 404 });
    }

    const hostTimezone = isValidTimezone(hostProfile.timezone) ? hostProfile.timezone : "UTC";

    // 4. Timezone-aware Blocked Dates Check
    const startDate = parseISO(startTime);
    if (!isValid(startDate)) {
      return NextResponse.json({ error: "Invalid start time date format" }, { status: 400 });
    }

    const blockedDateStr = getZonedDateString(startDate, hostTimezone);
    const { data: blockedDate } = await supabase
      .from("blocked_dates")
      .select("id")
      .eq("user_id", eventType.user_id)
      .eq("blocked_date", blockedDateStr)
      .maybeSingle();

    if (blockedDate) {
      return NextResponse.json({ error: "This date is blocked by the host." }, { status: 409 });
    }

    // 5. Fetch host availability
    const { data: rawAvail } = await supabase
      .from("availability")
      .select("*")
      .eq("user_id", eventType.user_id);

    // 6. Fetch ALL event types for this host to prevent cross-event double bookings
    const { data: rawHostEvents } = await supabase
      .from("event_types")
      .select("id")
      .eq("user_id", eventType.user_id);

    const hostEventTypeIds = (rawHostEvents || []).map((e: { id: string }) => e.id);

    let rawBookings: unknown[] = [];
    if (hostEventTypeIds.length > 0) {
      const { data: bookingsData } = await supabase
        .from("bookings")
        .select("id, start_time, end_time, status, event_type_id, event_types(buffer_before_minutes, buffer_after_minutes)")
        .in("event_type_id", hostEventTypeIds)
        .neq("status", "cancelled");
      rawBookings = bookingsData || [];
    }

    // 7. Verify slot availability with buffer & max_bookings_per_day
    const slots = generateSlots(
      startDate,
      (rawAvail || []) as unknown as Availability[],
      (rawBookings || []) as unknown as Booking[],
      eventType,
      { timezone: hostTimezone }
    );

    const requestedStart = parseISO(startTime);
    const requestedEnd = parseISO(endTime);
    const slotAvailable = slots.some(
      (s) => s.start.getTime() === requestedStart.getTime() && s.end.getTime() === requestedEnd.getTime()
    );

    if (!slotAvailable) {
      return NextResponse.json(
        { error: "This time slot is no longer available." },
        { status: 409 }
      );
    }

    // 8. Enforce Max Bookings Per Day if set
    if (eventType.max_bookings_per_day && eventType.max_bookings_per_day > 0) {
      const targetDateStr = getZonedDateString(startDate, hostTimezone);
      const activeBookingsCount = (rawBookings as unknown as Booking[]).filter((b) => {
        if (b.status === "cancelled") return false;
        const bDate = parseISO(b.start_time);
        return isValid(bDate) && getZonedDateString(bDate, hostTimezone) === targetDateStr;
      }).length;

      if (activeBookingsCount >= eventType.max_bookings_per_day) {
        return NextResponse.json({ error: "This day is fully booked." }, { status: 409 });
      }
    }

    // 9. Stripe Payment Verification & Replay Protection
    let verifiedPaymentIntentId: string | null = null;
    let verifiedAmountPaid = 0;
    let verifiedCurrency = eventType.currency || "USD";

    if (eventType.price > 0) {
      if (!stripePaymentIntentId || typeof stripePaymentIntentId !== "string") {
        return NextResponse.json({ error: "Payment is required for this booking." }, { status: 400 });
      }

      let paymentIntent;
      try {
        paymentIntent = await stripe.paymentIntents.retrieve(stripePaymentIntentId);
      } catch (err) {
        console.error("Stripe retrieval error:", err);
        return NextResponse.json({ error: "Invalid payment intent." }, { status: 400 });
      }

      if (paymentIntent.status !== "succeeded") {
        return NextResponse.json({ error: "Payment has not succeeded." }, { status: 400 });
      }

      const expectedAmount = Math.round(eventType.price * 100);
      if (paymentIntent.amount !== expectedAmount) {
        return NextResponse.json({ error: "Payment intent amount mismatch." }, { status: 400 });
      }

      if (paymentIntent.currency !== eventType.currency.toLowerCase()) {
        return NextResponse.json({ error: "Payment intent currency mismatch." }, { status: 400 });
      }

      if (paymentIntent.metadata?.eventTypeId !== eventTypeId) {
        return NextResponse.json({ error: "Payment intent event type mismatch." }, { status: 400 });
      }

      // Check if PaymentIntent was already attached to a booking
      const { data: existingPaymentBooking } = await supabase
        .from("bookings")
        .select("id")
        .eq("stripe_payment_intent_id", stripePaymentIntentId)
        .maybeSingle();

      if (existingPaymentBooking) {
        return NextResponse.json(
          { error: "This payment has already been used for another booking." },
          { status: 409 }
        );
      }

      verifiedPaymentIntentId = stripePaymentIntentId;
      verifiedAmountPaid = eventType.price;
      verifiedCurrency = eventType.currency;
    } else {
      verifiedPaymentIntentId = null;
      verifiedAmountPaid = 0;
      verifiedCurrency = eventType.currency || "USD";
    }

    // 10. Atomic Insert of the Booking
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: rawBooking, error: bookingError } = await (supabase.from("bookings") as any)
      .insert({
        event_type_id: eventTypeId,
        attendee_name: attendeeName.trim(),
        attendee_email: attendeeEmail.trim().toLowerCase(),
        attendee_phone: attendeePhone?.trim() || null,
        start_time: startTime,
        end_time: endTime,
        status: "confirmed",
        stripe_payment_intent_id: verifiedPaymentIntentId,
        amount_paid: verifiedAmountPaid,
        currency: verifiedCurrency,
        notes: notes ? String(notes).trim().substring(0, 500) : null,
        meeting_link: eventType.location_value || null,
      })
      .select("*")
      .single();

    if (bookingError || !rawBooking) {
      console.error("Booking insert error:", bookingError);
      if (bookingError?.code === "23505") {
        return NextResponse.json(
          { error: "This time slot or payment was already booked concurrently." },
          { status: 409 }
        );
      }
      return NextResponse.json({ error: "Failed to create booking" }, { status: 500 });
    }

    const booking = rawBooking as unknown as Booking;

    // 11. Send Confirmation and Notification Emails Asynchronously
    const dateFormatted = new Intl.DateTimeFormat("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
      timeZone: hostTimezone,
    }).format(startDate);

    const timeFormatted = new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "2-digit",
      timeZone: hostTimezone,
      timeZoneName: "short",
    }).format(startDate);

    Promise.allSettled([
      sendBookingConfirmation(attendeeEmail.trim(), {
        attendeeName: attendeeName.trim(),
        hostName: hostProfile.display_name || "Host",
        eventTitle: eventType.title,
        date: dateFormatted,
        time: timeFormatted,
        duration: eventType.duration_minutes,
        joinLink: eventType.location_value || undefined,
        amount: verifiedAmountPaid || undefined,
        currency: verifiedCurrency || undefined,
      }),
    ]).catch((e) => console.error("Email delivery error:", e));

    return NextResponse.json({ booking }, { status: 201 });
  } catch (err) {
    console.error("Booking API error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
