import { createClient } from "@/lib/supabase/server";
import { AvailabilityClient } from "./availability-client";
import { DAYS } from "@/lib/constants";

export const dynamic = "force-dynamic";

interface TimeSlotRow {
  id: string;
  user_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_available: boolean;
}

interface BlockedDateRow {
  id: string;
  user_id: string;
  blocked_date: string;
  reason: string | null;
}

export default async function AvailabilityPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: avail }, { data: blocked }] = await Promise.all([
    supabase.from("availability").select("*").eq("user_id", user.id).order("day_of_week"),
    supabase.from("blocked_dates").select("*").eq("user_id", user.id).order("blocked_date"),
  ]);

  const grouped: Record<number, TimeSlotRow[]> = {};
  for (let i = 0; i < 7; i++) grouped[i] = [];
  for (const row of (avail || []) as TimeSlotRow[]) {
    grouped[row.day_of_week]?.push(row);
  }

  return (
    <AvailabilityClient
      userId={user.id}
      grouped={grouped}
      days={DAYS}
      blocked={blocked as BlockedDateRow[] || []}
    />
  );
}
