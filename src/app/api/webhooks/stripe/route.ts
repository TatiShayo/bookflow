import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createServiceClient } from "@/lib/supabase/server";
import Stripe from "stripe";
import { parseISO } from "date-fns";
import { sendBookingConfirmation } from "@/lib/resend";

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature")!;

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const supabase = createServiceClient();

  try {
    switch (event.type) {
      case "payment_intent.succeeded": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        
        // Check if booking already exists for this payment intent
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
          const amountStr = metadata.amount;
          const currency = metadata.currency || "USD";

          if (eventTypeId && attendeeName && attendeeEmail && startTime && endTime) {
            // Get event type details
            const { data: rawEvent } = await supabase
              .from("event_types")
              .select("*")
              .eq("id", eventTypeId)
              .single();
            const eventType = rawEvent as any;

            if (eventType) {
              const expectedAmount = Math.round((eventType.price || 0) * 100);
              if (paymentIntent.amount !== expectedAmount || paymentIntent.currency.toLowerCase() !== (eventType.currency || "USD").toLowerCase()) {
                console.error("Stripe Webhook: PaymentIntent amount or currency mismatch. Expected:", expectedAmount, eventType.currency, "Got:", paymentIntent.amount, paymentIntent.currency);
                return NextResponse.json({ error: "Amount or currency mismatch" }, { status: 400 });
              }

              const amountPaid = eventType.price;
              const truncatedNotes = notes ? String(notes).substring(0, 450) : null;

              const { data: rawBooking, error: bookingError } = await supabase
                .from("bookings")
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
                } as any)
                .select("*")
                .single();

              if (bookingError || !rawBooking) {
                console.error("Stripe Webhook: Failed to create booking:", bookingError);
              } else {
                const booking = rawBooking as any;
                console.log("Stripe Webhook: Successfully created booking:", booking.id);

                // Get host profile
                const { data: rawHost } = await supabase
                  .from("profiles")
                  .select("display_name")
                  .eq("id", eventType.user_id)
                  .single();
                const hostProfile = rawHost as any;

                const dateStr = parseISO(startTime).toLocaleDateString("en-US", {
                  weekday: "long", month: "long", day: "numeric", year: "numeric",
                });
                const timeStr = parseISO(startTime).toLocaleTimeString("en-US", {
                  hour: "numeric", minute: "2-digit", timeZoneName: "short",
                });

                // Trigger confirmation emails
                await Promise.all([
                  sendBookingConfirmation(attendeeEmail, {
                    attendeeName, hostName: hostProfile?.display_name || "Host",
                    eventTitle: eventType.title, date: dateStr, time: timeStr,
                    duration: eventType.duration_minutes,
                    joinLink: eventType.location_value || undefined,
                    amount: amountPaid || undefined, currency: (eventType.currency || "USD") || undefined,
                  }).catch((e) => console.error("Stripe Webhook: Attendee email failed:", e)),
                ]);
              }
            } else {
              console.error("Stripe Webhook: Event type not found for id:", eventTypeId);
            }
          } else {
            console.error("Stripe Webhook: Missing required booking metadata:", metadata);
          }
        } else {
          console.log("Stripe Webhook: Booking already exists for PaymentIntent:", paymentIntent.id);
        }
        break;
      }
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.userId;
        const customerId = session.customer as string;

        if (userId) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (supabase.from("profiles") as any)
            .update({ subscription_tier: "pro", stripe_customer_id: customerId })
            .eq("id", userId);
        }
        break;
      }
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = sub.customer as string;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: rawProfile } = await supabase
          .from("profiles")
          .select("id")
          .eq("stripe_customer_id", customerId as any)
          .single();

        if (rawProfile) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (supabase.from("profiles") as any)
            .update({ subscription_tier: "free" })
            .eq("id", (rawProfile as any).id);
        }
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("Webhook error:", err);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }
}
