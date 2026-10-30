import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createServiceClient } from "@/lib/supabase/server";
import Stripe from "stripe";
import { parseISO, isValid } from "date-fns";
import { sendBookingConfirmation } from "@/lib/resend";
import { generateCancellationToken } from "@/lib/cancellation-token";
import { assertSlotAvailable } from "@/lib/booking-service";
import { isValidTimezone } from "@/lib/slots";

export async function POST(req: NextRequest) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("STRIPE_WEBHOOK_SECRET is not configured");
    return NextResponse.json({ error: "Webhook secret missing" }, { status: 500 });
  }

  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const supabase = createServiceClient();

  try {
    switch (event.type) {
      case "payment_intent.succeeded": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;

        // Idempotency: Check if booking already exists for this payment intent
        const { data: existingBooking } = await supabase
          .from("bookings")
          .select("id")
          .eq("stripe_payment_intent_id", paymentIntent.id)
          .maybeSingle();

        if (!existingBooking) {
          const metadata = paymentIntent.metadata || {};
          const eventTypeId = metadata.eventTypeId;
          const attendeeName = metadata.attendeeName;
          const attendeeEmail = metadata.attendeeEmail;
          const attendeePhone = metadata.attendeePhone || null;
          const startTime = metadata.startTime;
          const endTime = metadata.endTime;
          const notes = metadata.notes || null;

          if (eventTypeId && attendeeName && attendeeEmail && startTime && endTime) {
            const { data: rawEvent } = await supabase
              .from("event_types")
              .select("*")
              .eq("id", eventTypeId)
              .single();

            const eventType = rawEvent as {
              id: string;
              user_id: string;
              title: string;
              price: number;
              currency: string;
              duration_minutes: number;
              location_value: string | null;
            } | null;

            if (eventType) {
              const expectedAmount = Math.round((eventType.price || 0) * 100);
              if (
                paymentIntent.amount !== expectedAmount ||
                paymentIntent.currency.toLowerCase() !== (eventType.currency || "USD").toLowerCase()
              ) {
                console.error(
                  "Stripe Webhook: PaymentIntent amount or currency mismatch. Expected:",
                  expectedAmount,
                  eventType.currency,
                  "Got:",
                  paymentIntent.amount,
                  paymentIntent.currency
                );
                // 200 (not 400/500): a permanently-invalid payload should not be
                // retried forever. Logged for alerting.
                return NextResponse.json({ received: true, ignored: "amount_mismatch" });
              }

              const amountPaid = eventType.price;
              const truncatedNotes = notes ? String(notes).substring(0, 450) : null;

              // Re-check availability server-side. The webhook previously
              // created a confirmed booking with only an amount check, so a paid
              // guest could be confirmed into an already-booked slot.
              const { data: hostProfile } = await supabase
                .from("profiles")
                .select("timezone")
                .eq("id", eventType.user_id)
                .maybeSingle();
              const rawTimezone = (hostProfile as { timezone?: string } | null)?.timezone;
              const hostTimezone =
                rawTimezone && isValidTimezone(rawTimezone) ? rawTimezone : "UTC";

              const [{ data: rawAvail }, { data: rawBookings }] = await Promise.all([
                supabase
                  .from("availability")
                  .select("day_of_week, start_time, end_time, is_available")
                  .eq("user_id", eventType.user_id),
                supabase
                  .from("bookings")
                  .select(
                    "start_time, end_time, status, event_types(buffer_before_minutes, buffer_after_minutes)"
                  )
                  .eq("event_type_id", eventTypeId)
                  .neq("status", "cancelled"),
              ]);

              const slotCheck = assertSlotAvailable({
                startTime,
                endTime,
                timezone: hostTimezone,
                availability: (rawAvail || []) as never,
                existingBookings: (rawBookings || []) as never,
                eventType: eventType as never,
              });

              if (!slotCheck.ok) {
                console.error(
                  `Stripe Webhook: slot unavailable for payment ${paymentIntent.id}: ${slotCheck.reason}`
                );
                // Refund rather than silently keeping the money.
                try {
                  await stripe.refunds.create({
                    payment_intent: paymentIntent.id,
                    reason: "requested_by_customer",
                  });
                } catch (refundErr) {
                  console.error("Stripe Webhook: auto-refund failed:", refundErr);
                }
                return NextResponse.json({ received: true, ignored: "slot_unavailable" });
              }

              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const { data: rawBooking, error: bookingError } = await (supabase.from("bookings") as any)
                .insert({
                  event_type_id: eventTypeId,
                  attendee_name: attendeeName,
                  attendee_email: attendeeEmail,
                  attendee_phone: attendeePhone || null,
                  start_time: startTime,
                  end_time: endTime,
                  status: "confirmed",
                  stripe_payment_intent_id: paymentIntent.id,
                  amount_paid: amountPaid,
                  currency: eventType.currency || "USD",
                  notes: truncatedNotes,
                  meeting_link: eventType.location_value || null,
                  cancellation_token: generateCancellationToken(),
                })
                .select("*")
                .single();

              if (bookingError) {
                // If concurrent insert occurred, ignore duplicate key error
                if (bookingError.code === "23505") {
                  console.log("Stripe Webhook: Booking already inserted concurrently for payment:", paymentIntent.id);
                } else {
                  console.error("Stripe Webhook: Failed to create booking:", bookingError);
                }
              } else if (rawBooking) {
                console.log("Stripe Webhook: Successfully created booking:", rawBooking.id);

                const { data: rawHost } = await supabase
                  .from("profiles")
                  .select("display_name, timezone")
                  .eq("id", eventType.user_id)
                  .single();

                const hostProfile = rawHost as { display_name?: string; timezone?: string } | null;
                const hostTz = hostProfile?.timezone || "UTC";

                const startDate = parseISO(startTime);
                const dateStr = isValid(startDate)
                  ? new Intl.DateTimeFormat("en-US", {
                      weekday: "long",
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                      timeZone: hostTz,
                    }).format(startDate)
                  : startTime;

                const timeStr = isValid(startDate)
                  ? new Intl.DateTimeFormat("en-US", {
                      hour: "numeric",
                      minute: "2-digit",
                      timeZone: hostTz,
                      timeZoneName: "short",
                    }).format(startDate)
                  : "";

                // Trigger confirmation email
                await sendBookingConfirmation(attendeeEmail, {
                  attendeeName,
                  hostName: hostProfile?.display_name || "Host",
                  eventTitle: eventType.title,
                  date: dateStr,
                  time: timeStr,
                  duration: eventType.duration_minutes,
                  joinLink: eventType.location_value || undefined,
                  amount: amountPaid || undefined,
                  currency: eventType.currency || undefined,
                }).catch((e) => console.error("Stripe Webhook: Attendee email failed:", e));
              }
            } else {
              console.error("Stripe Webhook: Event type not found for id:", eventTypeId);
            }
          } else {
            console.error("Stripe Webhook: Missing required booking metadata:", metadata);
          }
        }
        break;
      }

      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.userId;
        const customerId = (session.customer as string) || null;

        if (userId) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (supabase.from("profiles") as any)
            .update({ subscription_tier: "pro", stripe_customer_id: customerId })
            .eq("id", userId);
        }
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        const isProStatus = subscription.status === "active" || subscription.status === "trialing";

        if (customerId) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { data: rawProfile } = await (supabase.from("profiles") as any)
            .select("id")
            .eq("stripe_customer_id", customerId)
            .maybeSingle();

          if (rawProfile) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await (supabase.from("profiles") as any)
              .update({ subscription_tier: isProStatus ? "pro" : "free" })
              .eq("id", rawProfile.id);
          }
        }
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = sub.customer as string;

        if (customerId) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { data: rawProfile } = await (supabase.from("profiles") as any)
            .select("id")
            .eq("stripe_customer_id", customerId)
            .maybeSingle();

          if (rawProfile) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await (supabase.from("profiles") as any)
              .update({ subscription_tier: "free" })
              .eq("id", rawProfile.id);
          }
        }
        break;
      }

      case "charge.refunded": {
        const charge = event.data.object as Stripe.Charge;
        const paymentIntentId = charge.payment_intent as string;
        const amountRefunded = charge.amount_refunded ?? 0;
        const amountCharged = charge.amount ?? 0;
        const isFullyRefunded = amountCharged > 0 && amountRefunded >= amountCharged;
        // `charge.refunded` also fires on PARTIAL refunds. Cancelling the booking
        // on a 50% courtesy refund silently voids the host's record, so only act
        // when the charge has been refunded in full.
        if (paymentIntentId && isFullyRefunded) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (supabase.from("bookings") as any)
            .update({ status: "cancelled" })
            .eq("stripe_payment_intent_id", paymentIntentId)
            .neq("status", "cancelled");
        }
        break;
      }

      default:
        console.log(`Unhandled Stripe event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("Webhook error:", err);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }
}
