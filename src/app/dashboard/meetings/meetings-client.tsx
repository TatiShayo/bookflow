"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { formatDateTime } from "@/lib/slots";
import { toast } from "sonner";
import { Mail, X } from "lucide-react";

interface BookingRow {
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
}

export function MeetingsClient({ bookings }: { bookings: BookingRow[] }) {
  const router = useRouter();
  const supabase = createClient();
  const [cancelling, setCancelling] = useState<string | null>(null);

  const now = new Date();

  const upcoming = bookings.filter(
    (b) => b.status === "confirmed" && new Date(b.start_time) > now
  );
  const past = bookings.filter(
    (b) => b.status === "confirmed" && new Date(b.start_time) <= now
  );
  const cancelled = bookings.filter((b) => b.status === "cancelled");

  async function handleCancel(id: string) {
    if (!confirm("Cancel this booking? An email will be sent to the attendee.")) return;
    setCancelling(id);

    const res = await fetch(`/api/bookings/${id}/cancel`, { method: "POST" });
    const json = await res.json();

    if (json.error) {
      toast.error(json.error);
    } else {
      toast.success("Booking cancelled");
      router.refresh();
    }
    setCancelling(null);
  }

  function renderList(items: BookingRow[]) {
    if (items.length === 0) {
      return <p className="text-muted-foreground text-sm py-8 text-center">No bookings found.</p>;
    }
    return (
      <div className="space-y-3">
        {items.map((b) => (
          <Card key={b.id}>
            <CardContent className="py-4 flex items-center gap-4">
              <Avatar className="h-10 w-10 shrink-0">
                <AvatarFallback
                  style={{
                    backgroundColor: `${b.event_types?.color || "#8b5cf6"}20`,
                    color: b.event_types?.color || "#8b5cf6",
                  }}
                  className="text-sm"
                >
                  {b.attendee_name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{b.attendee_name}</p>
                <p className="text-xs text-muted-foreground truncate">{b.attendee_email}</p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge
                    variant="outline"
                    className="text-xs"
                    style={{ borderColor: b.event_types?.color, color: b.event_types?.color }}
                  >
                    {b.event_types?.title || "Meeting"}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {formatDateTime(b.start_time)}
                  </span>
                </div>
              </div>
              <div className="text-right shrink-0 flex flex-col items-end gap-2">
                <Badge variant={b.amount_paid > 0 ? "default" : "outline"}>
                  {b.amount_paid > 0 ? `$${b.amount_paid}` : "Free"}
                </Badge>
                {b.status === "confirmed" && new Date(b.start_time) > now && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs text-destructive"
                    onClick={() => handleCancel(b.id)}
                    disabled={cancelling === b.id}
                  >
                    <X className="h-3 w-3 mr-1" /> Cancel
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Meetings</h1>
        <p className="text-muted-foreground text-sm mt-1">Manage your bookings.</p>
      </div>

      <Tabs defaultValue="upcoming">
        <TabsList>
          <TabsTrigger value="upcoming">Upcoming ({upcoming.length})</TabsTrigger>
          <TabsTrigger value="past">Past ({past.length})</TabsTrigger>
          <TabsTrigger value="cancelled">Cancelled ({cancelled.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="upcoming" className="mt-4">
          {renderList(upcoming)}
        </TabsContent>
        <TabsContent value="past" className="mt-4">
          {renderList(past)}
        </TabsContent>
        <TabsContent value="cancelled" className="mt-4">
          {renderList(cancelled)}
        </TabsContent>
      </Tabs>
    </div>
  );
}
