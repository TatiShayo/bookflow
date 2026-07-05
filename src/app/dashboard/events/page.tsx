import { createClient } from "@/lib/supabase/server";
import { EventTypesClient } from "./events-client";
import { FREE_TIER_EVENT_LIMIT } from "@/lib/constants";
import type { EventType } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function EventTypesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: rawProfile } = await supabase
    .from("profiles")
    .select("subscription_tier, username, display_name")
    .eq("id", user.id)
    .single();
  const profile = rawProfile as Record<string, unknown> | null;

  const { data: rawEvents } = await supabase
    .from("event_types")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });
  const eventTypes = (rawEvents || []) as unknown as EventType[];

  const username = (profile?.username as string) || (profile?.display_name as string)?.toLowerCase().replace(/\s+/g, "-") || "";

  const activeCount = eventTypes.filter((e) => e.is_active).length;
  const isFree = (profile?.subscription_tier as string) !== "pro";
  const limitReached = isFree && activeCount >= FREE_TIER_EVENT_LIMIT;

  return (
    <EventTypesClient
      username={username}
      eventTypes={eventTypes}
      isFree={isFree}
      limitReached={limitReached}
      activeCount={activeCount}
    />
  );
}
