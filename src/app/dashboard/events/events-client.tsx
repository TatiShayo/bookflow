"use client";

import { EventType } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Copy, MessageCircle, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { FREE_TIER_EVENT_LIMIT } from "@/lib/constants";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface Props {
  username: string;
  eventTypes: EventType[];
  isFree: boolean;
  limitReached: boolean;
  activeCount: number;
}

export function EventTypesClient({ username, eventTypes, isFree, limitReached, activeCount }: Props) {
  const router = useRouter();
  const supabase = createClient();
  const [toggling, setToggling] = useState<string | null>(null);

  async function toggleActive(et: EventType) {
    if (toggling) return;
    setToggling(et.id);
    const { error } = await supabase
      .from("event_types")
      .update({ is_active: !et.is_active })
      .eq("id", et.id);
    setToggling(null);
    if (error) {
      toast.error(error.message);
    } else {
      router.refresh();
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this event type?")) return;
    const { error } = await supabase.from("event_types").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Event type deleted");
      router.refresh();
    }
  }

  function copyLink(slug: string) {
    const url = `${window.location.origin}/book/${username}/${slug}`;
    navigator.clipboard.writeText(url).then(
      () => toast.success("Booking link copied!"),
      () => toast.error("Failed to copy")
    );
  }

  function shareWhatsApp(slug: string) {
    const url = `${window.location.origin}/book/${username}/${slug}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(`Book a session with me: ${url}`)}`, "_blank");
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Event Types</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {isFree
              ? `Free tier: ${activeCount}/${FREE_TIER_EVENT_LIMIT} active event types`
              : "Pro tier: unlimited event types"}
          </p>
        </div>
        <Link href="/dashboard/events/new">
          <Button disabled={limitReached}>
            <Plus className="h-4 w-4 mr-2" /> New Event Type
          </Button>
        </Link>
      </div>

      {eventTypes.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">No event types yet.</p>
            <Link href="/dashboard/events/new">
              <Button>
                <Plus className="h-4 w-4 mr-2" /> Create Your First Event
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {eventTypes.map((et) => (
            <Card
              key={et.id}
              className={`relative overflow-hidden transition-opacity ${et.is_active ? "" : "opacity-60"}`}
            >
              <div className="absolute top-0 left-0 right-0 h-1" style={{ backgroundColor: et.color }} />
              <CardContent className="pt-5 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-foreground">{et.title}</h3>
                    <p className="text-xs text-muted-foreground">
                      {et.duration_minutes} min · {et.location_type}
                    </p>
                  </div>
                  <Badge variant={et.price > 0 ? "default" : "outline"} className="shrink-0">
                    {et.price > 0 ? `${et.currency} ${et.price}` : "Free"}
                  </Badge>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    onClick={() => copyLink(et.slug)}
                  >
                    <Copy className="h-3 w-3 mr-1" /> Copy Link
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    onClick={() => shareWhatsApp(et.slug)}
                  >
                    <MessageCircle className="h-3 w-3 mr-1" /> WhatsApp
                  </Button>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-border">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 text-xs text-muted-foreground"
                    onClick={() => toggleActive(et)}
                    disabled={toggling === et.id}
                  >
                    {et.is_active ? "Deactivate" : "Activate"}
                  </Button>
                  <Link href={`/dashboard/events/${et.id}/edit`}>
                    <Button size="sm" variant="ghost" className="h-8">
                      <Pencil className="h-3 w-3" />
                    </Button>
                  </Link>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 text-destructive"
                    onClick={() => handleDelete(et.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
