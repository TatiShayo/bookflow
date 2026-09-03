import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createServiceClient } from "@/lib/supabase/server";
import { isValidEmail } from "@/lib/validation";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { eventTypeId, attendeeEmail, attendeeName, startTime, endTime, attendeePhone, notes } = body;

    if (!eventTypeId || typeof eventTypeId !== "string") {
      return NextResponse.json({ error: "Missing or invalid eventTypeId" }, { status: 400 });
    }

    if (!attendeeEmail || !isValidEmail(attendeeEmail)) {
      return NextResponse.json({ error: "Valid email address is required" }, { status: 400 });
    }

    if (!startTime || !endTime) {
      return NextResponse.json({ error: "Start time and end time are required" }, { status: 400 });
    }

    const supabase = createServiceClient();
    const { data: rawEvent, error: eventTypeError } = await supabase
      .from("event_types")
      .select("id, price, currency, is_active, title, user_id")
      .eq("id", eventTypeId)
      .single();

    if (eventTypeError || !rawEvent) {
      return NextResponse.json({ error: "Event type not found" }, { status: 404 });
    }

    const eventType = rawEvent as {
      id: string;
      price: number;
      currency: string;
      is_active: boolean;
      title: string;
      user_id: string;
    };

    if (!eventType.is_active) {
      return NextResponse.json({ error: "This event type is currently not active" }, { status: 400 });
    }

    const price = Number(eventType.price || 0);
    if (price <= 0) {
      return NextResponse.json(
        { error: "Event type is free. No payment intent required." },
        { status: 400 }
      );
    }

    const currency = (eventType.currency || "USD").toLowerCase();
    const truncatedNotes = notes ? String(notes).trim().substring(0, 450) : "";

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(price * 100),
      currency,
      metadata: {
        eventTypeId,
        hostUserId: eventType.user_id,
        attendeeEmail: attendeeEmail.trim().toLowerCase(),
        attendeeName: (attendeeName || "").trim(),
        startTime: startTime,
        endTime: endTime,
        attendeePhone: (attendeePhone || "").trim(),
        notes: truncatedNotes,
        amount: price.toString(),
        currency: eventType.currency || "USD",
      },
    });

    return NextResponse.json({ clientSecret: paymentIntent.client_secret });
  } catch (err) {
    console.error("Payment intent error:", err);
    return NextResponse.json({ error: "Failed to create payment" }, { status: 500 });
  }
}
