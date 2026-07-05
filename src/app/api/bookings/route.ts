import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { sendBookingConfirmation, sendHostNotification } from "@/lib/resend";
import { generateSlots } from "@/lib/slots";
import { parseISO, addMinutes } from "date-fns";
import type { Availability, Booking, EventType, Profile } from "@/lib/types";
import { stripe } from "@/lib/stripe";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      eventTypeId, attendeeName, attendeeEmail, attendeePhone,
      startTime, endTime, notes, stripePaymentIntentId, amountPaid, currency,
    } = body;

    if (!eventTypeId || !attendeeName || !attendeeEmail || !startTime || !endTime) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const supabase = createServiceClient();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: rawEvent } = await supabase
      .from("event_types")
      .select("*")
      .eq("id", eventTypeId)
      .eq("is_active", true)
      .single();
    const eventType = rawEvent as any;
    if (!eventType) return NextResponse.json({ error: "Event type not found" }, { status: 404 });

    // Get host profile to get timezone and name
    const { data: rawHost } = await supabase
      .from("profiles")
      .select("display_name, timezone")
      .eq("id", eventType.user_id)
      .single();
    const hostProfile = rawHost as any;
    if (!hostProfile) {
      return NextResponse.json({ error: "Host profile not found" }, { status: 404 });
    }

    const hostTimezone = hostProfile.timezone || "UTC";

    // Timezone-aware blocked dates checking
    const startDate = new Date(startTime);
    const blockedDateStr = new Intl.DateTimeFormat("en-CA", {
      timeZone: hostTimezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(startDate);

    const { data: blockedDate } = await supabase
      .from("blocked_dates")
      .select("*")
      .eq("user_id", eventType.user_id)
      .eq("blocked_date", blockedDateStr)
      .maybeSingle();

    if (blockedDate) {
      return NextResponse.json({ error: "This date is blocked." }, { status: 409 });
    }

    const { data: rawAvail } = await supabase
      .from("availability")
      .select("*")
      .eq("user_id", eventType.user_id);

    const date = parseISO(startTime);
    const { data: rawBookings } = await supabase
      .from("bookings")
      .select("start_time, end_time, status")
      .eq("event_type_id", eventTypeId)
      .neq("status", "cancelled");

    const slots = generateSlots(
      date,
      (rawAvail || []) as Availability[],
      (rawBookings || []) as Booking[],
      eventType as EventType
    );

    const requestedStart = parseISO(startTime);
    const requestedEnd = parseISO(endTime);
    const slotAvailable = slots.some(
      (s) => s.start.getTime() === requestedStart.getTime() && s.end.getTime() === requestedEnd.getTime()
    );

    if (!slotAvailable) {
      return NextResponse.json({ error: "This time slot is no longer available." }, { status: 409 });
    }

    // Check max bookings per day
    if (eventType.max_bookings_per_day) {
      const dateStr = date.toISOString().split("T")[0];
      const nextDay = new Date(date.getTime() + 86400000).toISOString().split("T")[0];
      const { count } = await supabase
        .from("bookings")
        .select("id", { count: "exact" })
        .eq("event_type_id", eventTypeId)
        .eq("status", "confirmed")
        .gte("start_time", dateStr)
        .lt("start_time", nextDay);

      if ((count || 0) >= eventType.max_bookings_per_day) {
        return NextResponse.json({ error: "This day is fully booked." }, { status: 409 });
      }
    }

    // Stripe Payment Verification & Replay Protection
    let verifiedPaymentIntentId = null;
    let verifiedAmountPaid = 0;
    let verifiedCurrency = "USD";

    if (eventType.price > 0) {
      if (!stripePaymentIntentId) {
        return NextResponse.json({ error: "Missing stripePaymentIntentId for paid event." }, { status: 400 });
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

      const { data: existingBooking } = await supabase
        .from("bookings")
        .select("id")
        .eq("stripe_payment_intent_id", stripePaymentIntentId)
        .maybeSingle();

      if (existingBooking) {
        return NextResponse.json({ error: "This payment has already been used for a booking." }, { status: 409 });
      }

      verifiedPaymentIntentId = stripePaymentIntentId;
      verifiedAmountPaid = eventType.price;
      verifiedCurrency = eventType.currency;
    } else {
      // Free events: explicitly ignore client-provided stripePaymentIntentId, amountPaid and currency fields
      verifiedPaymentIntentId = null;
      verifiedAmountPaid = 0;
      verifiedCurrency = "USD";
    }

    // Create booking
    const { data: rawBooking, error: bookingError } = await supabase
      .from("bookings")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .insert({
        event_type_id: eventTypeId,
        attendee_name: attendeeName,
        attendee_email: attendeeEmail,
        attendee_phone: attendeePhone || null,
        start_time: startTime,
        end_time: endTime,
        status: "confirmed",
        stripe_payment_intent_id: verifiedPaymentIntentId,
        amount_paid: verifiedAmountPaid,
        currency: verifiedCurrency,
        notes: notes || null,
        meeting_link: eventType.location_value || null,
      } as any)
      .select("*")
      .single();

    if (bookingError || !rawBooking) {
      console.error("Booking insert error:", bookingError);
      return NextResponse.json({ error: "Failed to create booking" }, { status: 500 });
    }
    const booking = rawBooking as any;

    const dateStr = parseISO(startTime).toLocaleDateString("en-US", {
      weekday: "long", month: "long", day: "numeric", year: "numeric",
    });
    const timeStr = parseISO(startTime).toLocaleTimeString("en-US", {
      hour: "numeric", minute: "2-digit", timeZoneName: "short",
    });

    Promise.all([
      sendBookingConfirmation(attendeeEmail, {
        attendeeName, hostName: hostProfile?.display_name || "Host",
        eventTitle: eventType.title, date: dateStr, time: timeStr,
        duration: eventType.duration_minutes,
        joinLink: eventType.location_value || undefined,
        amount: verifiedAmountPaid || undefined, currency: verifiedCurrency || undefined,
      }).catch((e) => console.error("Attendee email failed:", e)),
    ]);

    return NextResponse.json({ booking });
  } catch (err) {
    console.error("Booking API error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
