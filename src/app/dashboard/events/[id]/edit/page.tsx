import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { EventTypeForm } from "../../event-type-form";
import type { EventType } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function EditEventTypePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: raw } = await supabase
    .from("event_types")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!raw) notFound();
  const eventType = raw as unknown as EventType;

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Edit Event Type</h1>
        <p className="text-muted-foreground text-sm mt-1">Update your event details.</p>
      </div>
      <EventTypeForm userId={user.id} eventType={eventType} />
    </div>
  );
}
