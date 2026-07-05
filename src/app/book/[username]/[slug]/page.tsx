import { createServiceClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { BookingFlow } from "./booking-flow";
import type { EventType, Availability, Booking } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function BookEventPage({
  params,
}: {
  params: Promise<{ username: string; slug: string }>;
}) {
  const { username, slug } = await params;
  const supabase = createServiceClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: rawProfile } = await supabase
    .from("profiles")
    .select("*")
    .eq("username", username)
    .single();
  const profile = rawProfile as Record<string, unknown> | null;
  if (!profile) notFound();

  const { data: rawEvent } = await supabase
    .from("event_types")
    .select("*")
    .eq("user_id", profile.id as string)
    .eq("slug", slug)
    .eq("is_active", true)
    .single();
  const eventType = rawEvent as Record<string, unknown> | null;
  if (!eventType) notFound();

  const { data: rawAvail } = await supabase
    .from("availability")
    .select("*")
    .eq("user_id", profile.id as string)
    .order("day_of_week");

  const { data: rawBlocked } = await supabase
    .from("blocked_dates")
    .select("blocked_date")
    .eq("user_id", profile.id as string);

  const { data: rawBookings } = await supabase
    .from("bookings")
    .select("start_time, end_time, status")
    .eq("event_type_id", eventType.id as string)
    .neq("status", "cancelled");

  const blocked = new Set(((rawBlocked || []) as Array<Record<string, unknown>>).map((b) => b.blocked_date as string));

  return (
    <BookingFlow
      eventType={eventType as unknown as EventType}
      profile={profile as unknown as { display_name: string; avatar_url: string | null; timezone: string; bio: string | null; username: string }}
      availability={(rawAvail || []) as unknown as Availability[]}
      existingBookings={(rawBookings || []) as unknown as Booking[]}
      blockedDates={blocked}
    />
  );
}
