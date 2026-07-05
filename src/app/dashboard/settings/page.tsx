import { createClient } from "@/lib/supabase/server";
import { SettingsClient } from "./settings-client";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: rawProfile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  const profile = rawProfile as Record<string, unknown> | null;

  return <SettingsClient user={{ id: user.id, email: user.email || "" }} profile={profile as unknown as { id: string; username: string | null; display_name: string | null; avatar_url: string | null; bio: string | null; timezone: string; booking_page_title: string | null; booking_page_description: string | null; } | null} />;
}
