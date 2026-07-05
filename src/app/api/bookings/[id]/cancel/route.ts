import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { sendCancellationEmail } from "@/lib/resend";
import { format } from "date-fns";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = createServiceClient();

  const { data: rawBooking } = await supabase
    .from("bookings")
    .select("event_type_id, attendee_name, attendee_email, start_time")
    .eq("id", id)
    .single();

  const booking = rawBooking as Record<string, unknown> | null;
  if (!booking) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }

  const { data: rawEvent } = await supabase
    .from("event_types")
    .select("title, user_id")
    .eq("id", booking.event_type_id as string)
    .single();

  const eventType = rawEvent as Record<string, unknown> | null;

  const { data: rawHost } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", (eventType?.user_id as string) || "")
    .single();

  const host = rawHost as Record<string, unknown> | null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: updateError } = await (supabase.from("bookings") as any)
    .update({ status: "cancelled" })
    .eq("id", id);

  if (updateError) {
    console.error("Cancel update error:", updateError);
    return NextResponse.json({ error: "Failed to cancel booking" }, { status: 500 });
  }

  const startDate = new Date(booking.start_time as string);
  const dateStr = format(startDate, "EEEE, MMMM d, yyyy");
  const timeStr = format(startDate, "h:mm a");

  await sendCancellationEmail(booking.attendee_email as string, {
    attendeeName: booking.attendee_name as string,
    hostName: (host?.display_name as string) || "Host",
    eventTitle: (eventType?.title as string) || "Meeting",
    date: dateStr,
    time: timeStr,
  }).catch((e) => console.error("Cancellation email failed:", e));

  return NextResponse.json({ success: true });
}
