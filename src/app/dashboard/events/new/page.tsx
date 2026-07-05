import { createClient } from "@/lib/supabase/server";
import { EventTypeForm } from "../event-type-form";

export const dynamic = "force-dynamic";

export default async function NewEventTypePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">New Event Type</h1>
        <p className="text-muted-foreground text-sm mt-1">Create a new service you offer.</p>
      </div>
      <EventTypeForm userId={user.id} />
    </div>
  );
}
