import { createClient } from "@/lib/supabase/server";
import { AnalyticsClient } from "./analytics-client";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: raw } = await supabase
    .from("bookings")
    .select("*, event_types!inner(title, color)")
    .eq("event_types.user_id", user.id)
    .eq("status", "confirmed")
    .order("start_time", { ascending: true });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const bookings = (raw || []) as any[];
  const total = bookings.length;
  const totalRevenue = bookings.reduce((acc: number, b: any) => acc + (b.amount_paid || 0), 0);
  const avgValue = total > 0 ? totalRevenue / total : 0;

  // Most popular
  const typeCount: Record<string, { title: string; color: string; count: number }> = {};
  for (const b of bookings) {
    const title = b.event_types?.title || "Unknown";
    if (!typeCount[title]) typeCount[title] = { title, color: b.event_types?.color || "#8b5cf6", count: 0 };
    typeCount[title].count++;
  }
  const mostPopular = Object.values(typeCount).sort((a, b) => b.count - a.count)[0] || null;

  // DOW
  const dowCount = [0, 0, 0, 0, 0, 0, 0];
  const dowNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  for (const b of bookings) {
    const dow = new Date(b.start_time).getDay();
    dowCount[dow]++;
  }
  const dowData = dowCount.map((count, i) => ({ day: dowNames[i], bookings: count }));

  // Revenue by month
  const revByMonth: Record<string, number> = {};
  for (const b of bookings) {
    const d = new Date(b.start_time);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    revByMonth[key] = (revByMonth[key] || 0) + (b.amount_paid || 0);
  }
  const revData = Object.entries(revByMonth).sort().map(([month, amount]) => ({ month, amount }));

  return (
    <AnalyticsClient
      totalBookings={total}
      totalRevenue={totalRevenue}
      avgValue={avgValue}
      mostPopular={mostPopular}
      dowData={dowData}
      revData={revData}
    />
  );
}
