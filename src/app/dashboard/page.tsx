import { createClient } from "@/lib/supabase/server";
import { DashboardClient } from "./dashboard-client";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: rawProfile } = await supabase
    .from("profiles")
    .select("username, display_name")
    .eq("id", user.id)
    .single();
  const profile = rawProfile as Record<string, unknown> | null;
  const username = (profile?.username as string) || (profile?.display_name as string)?.toLowerCase().replace(/\s+/g, "-") || "";

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfToday = new Date(startOfToday.getTime() + 86400000);
  const weekEnd = new Date(startOfToday.getTime() + 7 * 86400000);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthAgo = new Date(now.getTime() - 30 * 86400000);

  // Get user's event_type ids first
  const { data: userEventTypes } = await supabase
    .from("event_types")
    .select("id")
    .eq("user_id", user.id);
  const eventTypeIds = (userEventTypes || []).map((et: Record<string, unknown>) => et.id as string);

  const [
    { data: todayBookings },
    { data: weekRevRaw },
    { count: monthBookings },
    { count: cancelRate },
    { data: upcomingBookings },
    { data: recentBookings },
  ] = await Promise.all([
    supabase.from("bookings").select("id, start_time")
      .in("event_type_id", eventTypeIds)
      .gte("start_time", startOfToday.toISOString())
      .lt("start_time", endOfToday.toISOString())
      .eq("status", "confirmed"),
    supabase.from("bookings").select("amount_paid")
      .in("event_type_id", eventTypeIds)
      .gte("start_time", now.toISOString())
      .lt("start_time", weekEnd.toISOString())
      .eq("status", "confirmed"),
    supabase.from("bookings").select("id, start_time", { count: "exact" })
      .in("event_type_id", eventTypeIds)
      .gte("start_time", monthStart.toISOString())
      .eq("status", "confirmed"),
    supabase.from("bookings").select("id, start_time", { count: "exact" })
      .in("event_type_id", eventTypeIds)
      .gte("start_time", monthStart.toISOString())
      .eq("status", "cancelled"),
    supabase.from("bookings").select("*, event_types(title, color)")
      .in("event_type_id", eventTypeIds)
      .gte("start_time", now.toISOString())
      .lt("start_time", weekEnd.toISOString())
      .eq("status", "confirmed")
      .order("start_time", { ascending: true })
      .limit(10),
    supabase.from("bookings").select("*, event_types(title)")
      .in("event_type_id", eventTypeIds)
      .gte("start_time", monthAgo.toISOString())
      .eq("status", "confirmed")
      .order("start_time", { ascending: false })
      .limit(30),
  ]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const weekRev: any[] = (weekRevRaw as any[]) || [];
  const todayTotal = (todayBookings as any[])?.length || 0;
  const monthTotal = monthBookings || 0;
  const cancelledTotal = cancelRate || 0;
  const cancelPercent = monthTotal + cancelledTotal > 0
    ? Math.round((cancelledTotal / (monthTotal + cancelledTotal)) * 100)
    : 0;

  const weekRevTotal = weekRev.reduce((acc: number, b: any) => acc + (b.amount_paid || 0), 0);

  const revenueByDay: Record<string, number> = {};
  for (const b of ((recentBookings as any[]) || [])) {
    const d = new Date(b.start_time).toLocaleDateString("en-US", { month: "short", day: "numeric" });
    revenueByDay[d] = (revenueByDay[d] || 0) + (b.amount_paid || 0);
  }
  const chartData = Object.entries(revenueByDay).map(([date, amount]) => ({ date, amount }));

  return (
    <DashboardClient
      username={username}
      todayTotal={todayTotal}
      weekRevenue={weekRevTotal}
      monthTotal={monthTotal}
      cancelPercent={cancelPercent}
      upcomingBookings={(upcomingBookings as any[]) || []}
      chartData={chartData}
    />
  );
}
