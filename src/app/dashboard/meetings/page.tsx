import { createClient } from "@/lib/supabase/server";
import { MeetingsClient } from "./meetings-client";

export const dynamic = "force-dynamic";

export default async function MeetingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: rawBookings } = await supabase
    .from("bookings")
    .select("*, event_types!inner(title, color)")
    .eq("event_types.user_id", user.id)
    .order("start_time", { ascending: true });

  return <MeetingsClient bookings={(rawBookings || []) as unknown as Array<{
    id: string;
    event_type_id: string;
    attendee_name: string;
    attendee_email: string;
    attendee_phone: string | null;
    start_time: string;
    end_time: string;
    status: string;
    amount_paid: number;
    currency: string;
    notes: string | null;
    meeting_link: string | null;
    created_at: string;
    event_types: { title: string; color: string } | null;
  }>} />;
}
