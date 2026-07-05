"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Plus, Trash2, X } from "lucide-react";

interface TimeSlot {
  id?: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_available: boolean;
}

interface BlockedDate {
  id?: string;
  blocked_date: string;
  reason: string | null;
}

interface Props {
  userId: string;
  grouped: Record<number, TimeSlot[]>;
  days: string[];
  blocked: BlockedDate[];
}

function padTime(val: string): string {
  const parts = val.split(":");
  if (parts.length === 2) return val + ":00";
  return val;
}

export function AvailabilityClient({ userId, grouped, days, blocked }: Props) {
  const router = useRouter();
  const supabase = createClient();
  const [slots, setSlots] = useState<Record<number, TimeSlot[]>>(grouped);
  const [blockedDates, setBlockedDates] = useState<BlockedDate[]>(blocked);
  const [newBlockDate, setNewBlockDate] = useState("");
  const [saving, setSaving] = useState(false);

  function addSlot(day: number) {
    setSlots((prev) => ({
      ...prev,
      [day]: [...(prev[day] || []), { day_of_week: day, start_time: "09:00", end_time: "17:00", is_available: true }],
    }));
  }

  function removeSlot(day: number, idx: number) {
    setSlots((prev) => ({
      ...prev,
      [day]: prev[day].filter((_, i) => i !== idx),
    }));
  }

  function updateSlot(day: number, idx: number, field: "start_time" | "end_time" | "is_available", value: string | boolean) {
    setSlots((prev) => ({
      ...prev,
      [day]: prev[day].map((s, i) => (i === idx ? { ...s, [field]: value } : s)),
    }));
  }

  function addBlockDate() {
    if (!newBlockDate) return;
    if (blockedDates.some((b) => b.blocked_date === newBlockDate)) {
      toast.error("Date already blocked");
      return;
    }
    setBlockedDates((prev) => [...prev, { blocked_date: newBlockDate, reason: null }]);
    setNewBlockDate("");
  }

  function removeBlockDate(date: string) {
    setBlockedDates((prev) => prev.filter((b) => b.blocked_date !== date));
  }

  async function handleSave() {
    setSaving(true);

    // Delete all existing availability and blocked dates for this user, then re-insert
    await supabase.from("availability").delete().eq("user_id", userId);
    await supabase.from("blocked_dates").delete().eq("user_id", userId);

    const toInsert: { user_id: string; day_of_week: number; start_time: string; end_time: string; is_available: boolean }[] = [];
    for (const daySlots of Object.values(slots)) {
      for (const s of daySlots) {
        toInsert.push({
          user_id: userId,
          day_of_week: s.day_of_week,
          start_time: padTime(s.start_time),
          end_time: padTime(s.end_time),
          is_available: s.is_available,
        });
      }
    }

    if (toInsert.length > 0) {
      const { error: availErr } = await supabase.from("availability").insert(toInsert);
      if (availErr) {
        toast.error(availErr.message);
        setSaving(false);
        return;
      }
    }

    if (blockedDates.length > 0) {
      const { error: blockErr } = await supabase.from("blocked_dates").insert(
        blockedDates.map((b) => ({
          user_id: userId,
          blocked_date: b.blocked_date,
          reason: b.reason,
        }))
      );
      if (blockErr) {
        toast.error(blockErr.message);
        setSaving(false);
        return;
      }
    }

    setSaving(false);
    toast.success("Availability saved!");
    router.refresh();
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Availability</h1>
          <p className="text-muted-foreground text-sm mt-1">Set your weekly schedule.</p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </div>

      {/* Weekly grid */}
      <Card>
        <CardHeader>
          <CardTitle>Weekly Hours</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {days.map((day, idx) => {
            const daySlots = slots[idx] || [];
            return (
              <div key={idx}>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium w-24">{day}</span>
                    <div className="flex-1 space-y-2">
                      {daySlots.length === 0 ? (
                        <p className="text-sm text-muted-foreground">Unavailable</p>
                      ) : (
                        daySlots.map((slot, si) => (
                          <div key={si} className="flex items-center gap-2">
                            <Input
                              type="time"
                              value={slot.start_time.substring(0, 5)}
                              onChange={(e) => updateSlot(idx, si, "start_time", e.target.value)}
                              className="w-32"
                            />
                            <span className="text-muted-foreground">to</span>
                            <Input
                              type="time"
                              value={slot.end_time.substring(0, 5)}
                              onChange={(e) => updateSlot(idx, si, "end_time", e.target.value)}
                              className="w-32"
                            />
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => removeSlot(idx, si)}
                              className="shrink-0"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => addSlot(idx)}
                    className="ml-24"
                  >
                    <Plus className="h-3 w-3 mr-1" /> Add hours
                  </Button>
                </div>
                {idx < 6 && <Separator className="mt-4" />}
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Blocked dates */}
      <Card>
        <CardHeader>
          <CardTitle>Blocked Dates</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3">
            <Input
              type="date"
              value={newBlockDate}
              onChange={(e) => setNewBlockDate(e.target.value)}
              className="flex-1"
            />
            <Button onClick={addBlockDate} variant="outline">
              <Plus className="h-4 w-4 mr-1" /> Block Date
            </Button>
          </div>
          {blockedDates.length > 0 ? (
            <div className="space-y-2">
              {blockedDates.map((b) => (
                <div key={b.blocked_date} className="flex items-center justify-between p-2 rounded bg-muted/30">
                  <span className="text-sm">{b.blocked_date}</span>
                  <Button variant="ghost" size="icon" onClick={() => removeBlockDate(b.blocked_date)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No blocked dates.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
