import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerAuthClient, createServiceClient } from "@/lib/supabase/server";
import { sendCancellationEmail } from "@/lib/resend";
import { canCancelBooking, calculateCancellationRefund, DEFAULT_CANCELLATION_POLICY } from "@/lib/cancellation";
import { createRefund } from "@/lib/stripe";
import { format, parseISO, isValid } from "date-fns";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id || typeof id !== "string") {
      return NextResponse.json({ error: "Invalid booking ID" }, { status: 400 });
    }

    let body: Record<string, unknown> = {};
    try {
      body = await request.json();
    } catch {
      // Body may be empty for simple POST requests
    }

    const { cancellationToken, attendeeEmail } = body as {
      cancellationToken?: string;
      attendeeEmail?: string;
    };

    const supabase = createServiceClient();

    // Fetch booking
    const { data: rawBooking, error: bookingFetchError } = await supabase
      .from("bookings")
      .select("id, event_type_id, attendee_name, attendee_email, start_time, end_time, status, stripe_payment_intent_id, amount_paid, currency")
      .eq("id", id)
      .single();

    if (bookingFetchError || !rawBooking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    const booking = rawBooking as {
      id: string;
      event_type_id: string;
      attendee_name: string;
      attendee_email: string;
      start_time: string;
      end_time: string;
      status: string;
      stripe_payment_intent_id: string | null;
      amount_paid: number;
      currency: string;
    };

    // Fetch Event Type and Host Profile
    const { data: rawEvent } = await supabase
      .from("event_types")
      .select("title, user_id")
      .eq("id", booking.event_type_id)
      .single();

    const eventType = rawEvent as { title: string; user_id: string } | null;
    const hostUserId = eventType?.user_id;

    // Check authorization: Authenticated host OR matching attendee
    let isHost = false;
    try {
      const authClient = await createServerAuthClient();
      const { data: { user } } = await authClient.auth.getUser();
      if (user && hostUserId && user.id === hostUserId) {
        isHost = true;
      }
    } catch {
      // Unauthenticated caller
    }

    const isAttendee =
      (attendeeEmail && attendeeEmail.toLowerCase().trim() === booking.attendee_email.toLowerCase().trim()) ||
      (cancellationToken && cancellationToken.trim() !== "");

    if (!isHost && !isAttendee) {
      return NextResponse.json(
        { error: "Unauthorized. Must be the host or the attendee to cancel this booking." },
        { status: 403 }
      );
    }

    // Policy check: If not host (i.e. attendee self-cancelling), enforce notice policy
    if (!isHost) {
      const cancelCheck = canCancelBooking(
        { start_time: booking.start_time, status: booking.status },
        DEFAULT_CANCELLATION_POLICY
      );

      if (!cancelCheck.canCancel) {
        return NextResponse.json({ error: cancelCheck.reason }, { status: 400 });
      }
    } else {
      if (booking.status === "cancelled") {
        return NextResponse.json({ error: "Booking is already cancelled." }, { status: 400 });
      }
    }

    // Process refund if applicable
    let refundDetails = null;
    if (booking.amount_paid > 0 && booking.stripe_payment_intent_id) {
      const refundCalc = calculateCancellationRefund(
        {
          start_time: booking.start_time,
          amount_paid: booking.amount_paid,
          currency: booking.currency,
        },
        DEFAULT_CANCELLATION_POLICY
      );

      if (refundCalc.eligibleForRefund && refundCalc.refundAmount > 0) {
        try {
          const stripeRefund = await createRefund(
            booking.stripe_payment_intent_id,
            refundCalc.refundAmount,
            "requested_by_customer"
          );
          refundDetails = {
            refundId: stripeRefund.id,
            amount: refundCalc.refundAmount,
            currency: booking.currency,
            status: stripeRefund.status,
          };
        } catch (refundErr) {
          console.error("Stripe refund error during cancellation:", refundErr);
          // Don't fail the entire cancellation if refund fails, but log it
        }
      }
    }

    // Update status in DB
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: updateError } = await (supabase.from("bookings") as any)
      .update({ status: "cancelled" })
      .eq("id", id);

    if (updateError) {
      console.error("Cancel update error:", updateError);
      return NextResponse.json({ error: "Failed to cancel booking" }, { status: 500 });
    }

    // Fetch Host details for email
    const { data: rawHost } = await supabase
      .from("profiles")
      .select("display_name, timezone")
      .eq("id", hostUserId || "")
      .single();

    const host = rawHost as { display_name?: string; timezone?: string } | null;
    const hostTz = host?.timezone || "UTC";

    const startDate = parseISO(booking.start_time);
    let dateStr = "";
    let timeStr = "";
    if (isValid(startDate)) {
      dateStr = format(startDate, "EEEE, MMMM d, yyyy");
      timeStr = format(startDate, "h:mm a");
    }

    // Send Cancellation Email
    await sendCancellationEmail(booking.attendee_email, {
      attendeeName: booking.attendee_name,
      hostName: host?.display_name || "Host",
      eventTitle: eventType?.title || "Meeting",
      date: dateStr,
      time: timeStr,
    }).catch((e) => console.error("Cancellation email failed:", e));

    return NextResponse.json({
      success: true,
      refund: refundDetails,
    });
  } catch (err) {
    console.error("Cancellation API error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
