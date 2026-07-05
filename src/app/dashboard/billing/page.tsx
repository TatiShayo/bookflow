import { createClient } from "@/lib/supabase/server";
import { BillingClient } from "./billing-client";
import { FREE_TIER_EVENT_LIMIT } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function BillingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: rawProfile } = await supabase
    .from("profiles")
    .select("subscription_tier, stripe_customer_id")
    .eq("id", user.id)
    .single();

  const profile = rawProfile as Record<string, unknown> | null;
  const subscription = (profile?.subscription_tier as string) || "free";

  const { count } = await supabase
    .from("event_types")
    .select("id", { count: "exact" })
    .eq("user_id", user.id)
    .eq("is_active", true);

  return (
    <BillingClient
      subscription={subscription}
      activeCount={count || 0}
      maxFree={FREE_TIER_EVENT_LIMIT}
    />
  );
}
