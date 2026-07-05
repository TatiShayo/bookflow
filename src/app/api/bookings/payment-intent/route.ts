import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createServiceClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const { eventTypeId, attendeeEmail, attendeeName, startTime, endTime, attendeePhone, notes } = await req.json();

    if (!eventTypeId) {
      return NextResponse.json({ error: "Missing eventTypeId" }, { status: 400 });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!attendeeEmail || typeof attendeeEmail !== "string" || !emailRegex.test(attendeeEmail)) {
      return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
    }

    const supabase = createServiceClient();
    const { data: rawEvent, error: eventTypeError } = await supabase
      .from("event_types")
      .select("price, currency")
      .eq("id", eventTypeId)
      .single();

    if (eventTypeError || !rawEvent) {
      return NextResponse.json({ error: "Event type not found" }, { status: 404 });
    }

    const eventType = rawEvent as any;
    const price = Number(eventType.price || 0);
    const currency = eventType.currency || "USD";
    const truncatedNotes = notes ? String(notes).substring(0, 450) : "";

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(price * 100),
      currency: currency.toLowerCase(),
      metadata: {
        eventTypeId,
        attendeeEmail: attendeeEmail || "",
        attendeeName: attendeeName || "",
        startTime: startTime || "",
        endTime: endTime || "",
        attendeePhone: attendeePhone || "",
        notes: truncatedNotes,
        amount: price.toString(),
        currency: currency,
      },
    });

    return NextResponse.json({ clientSecret: paymentIntent.client_secret });
  } catch (err) {
    console.error("Payment intent error:", err);
    return NextResponse.json({ error: "Failed to create payment" }, { status: 500 });
  }
}
