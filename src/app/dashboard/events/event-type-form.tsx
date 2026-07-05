"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { createClient } from "@/lib/supabase/client";
import { DURATIONS, COLORS, BUFFER_TIMES, CURRENCIES, FREE_TIER_EVENT_LIMIT } from "@/lib/constants";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { EventType } from "@/lib/types";

interface Props {
  userId: string;
  eventType?: EventType;
}

export function EventTypeForm({ userId, eventType }: Props) {
  const router = useRouter();
  const supabase = createClient();
  const isEditing = !!eventType;

  const [title, setTitle] = useState(eventType?.title || "");
  const [slug, setSlug] = useState(eventType?.slug || "");
  const [description, setDescription] = useState(eventType?.description || "");
  const [duration, setDuration] = useState(eventType?.duration_minutes?.toString() || "60");
  const [customDuration, setCustomDuration] = useState("");
  const [price, setPrice] = useState(eventType?.price?.toString() || "0");
  const [currency, setCurrency] = useState(eventType?.currency || "USD");
  const [color, setColor] = useState(eventType?.color || "#8b5cf6");
  const [isActive, setIsActive] = useState(eventType?.is_active ?? true);
  const [bufferBefore, setBufferBefore] = useState(eventType?.buffer_before_minutes?.toString() || "0");
  const [bufferAfter, setBufferAfter] = useState(eventType?.buffer_after_minutes?.toString() || "0");
  const [locationType, setLocationType] = useState(eventType?.location_type || "video");
  const [locationValue, setLocationValue] = useState(eventType?.location_value || "");
  const [maxPerDay, setMaxPerDay] = useState(eventType?.max_bookings_per_day?.toString() || "");
  const [loading, setLoading] = useState(false);
  const [isPaid, setIsPaid] = useState((eventType?.price || 0) > 0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const finalDuration = duration === "custom" ? parseInt(customDuration) || 60 : parseInt(duration);
    const finalPrice = isPaid ? parseFloat(price) || 0 : 0;

    const slugValue = slug || title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

    // Check active limit on free tier
    if (!isEditing && isActive && finalPrice === 0) {
      const { data: profile } = await supabase.from("profiles").select("subscription_tier").eq("id", userId).single();
      if (profile?.subscription_tier !== "pro") {
        const { data: activeEvents } = await supabase
          .from("event_types")
          .select("id")
          .eq("user_id", userId)
          .eq("is_active", true);
        if ((activeEvents?.length || 0) >= FREE_TIER_EVENT_LIMIT) {
          toast.error(`Free tier limited to ${FREE_TIER_EVENT_LIMIT} active event types.`);
          setLoading(false);
          return;
        }
      }
    }

    const payload = {
      title,
      slug: slugValue,
      description: description || null,
      duration_minutes: finalDuration,
      price: finalPrice,
      currency,
      color,
      is_active: isActive,
      buffer_before_minutes: parseInt(bufferBefore) || 0,
      buffer_after_minutes: parseInt(bufferAfter) || 0,
      location_type: locationType,
      location_value: locationValue || null,
      max_bookings_per_day: maxPerDay ? parseInt(maxPerDay) : null,
    };

    let error;
    if (isEditing && eventType) {
      ({ error } = await supabase.from("event_types").update(payload).eq("id", eventType.id));
    } else {
      ({ error } = await supabase.from("event_types").insert({ ...payload, user_id: userId }));
    }

    setLoading(false);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success(isEditing ? "Event type updated!" : "Event type created!");
      router.push("/dashboard/events");
      router.refresh();
    }
  }

  function handleTitleChange(val: string) {
    setTitle(val);
    if (!isEditing) {
      setSlug(val.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""));
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Title & Slug */}
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            placeholder="30 Minute Coaching Call"
            value={title}
            onChange={(e) => handleTitleChange(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="slug">URL Slug</Label>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-sm">/book/you/</span>
            <Input
              id="slug"
              placeholder="30-minute-coaching"
              value={slug}
              onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
              required
              className="flex-1"
            />
          </div>
        </div>
      </div>

      {/* Duration */}
      <div className="space-y-2">
        <Label htmlFor="duration">Duration</Label>
        <Select value={duration} onValueChange={(v) => setDuration(v || "60")}>
          <SelectTrigger>
            <SelectValue placeholder="Select duration" />
          </SelectTrigger>
          <SelectContent>
            {DURATIONS.map((d) => (
              <SelectItem key={d.value} value={d.value.toString()}>{d.label}</SelectItem>
            ))}
            <SelectItem value="custom">Custom (minutes)</SelectItem>
          </SelectContent>
        </Select>
        {duration === "custom" && (
          <Input
            type="number"
            placeholder="Custom minutes"
            value={customDuration}
            onChange={(e) => setCustomDuration(e.target.value)}
            min={5}
            className="mt-2"
          />
        )}
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="description">Description (optional)</Label>
        <Textarea
          id="description"
          placeholder="Tell your bookers what this session is about..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
        />
      </div>

      {/* Price */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Payment</Label>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">{isPaid ? "Paid" : "Free"}</span>
            <Switch checked={isPaid} onCheckedChange={setIsPaid} />
          </div>
        </div>
        {isPaid && (
          <div className="flex gap-3">
            <Select value={currency} onValueChange={(v) => setCurrency(v || "USD")}>
              <SelectTrigger className="w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CURRENCIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="number"
              placeholder="0.00"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              min={0}
              step="0.01"
              className="flex-1"
            />
          </div>
        )}
      </div>

      {/* Color */}
      <div className="space-y-2">
        <Label>Color</Label>
        <div className="flex gap-2">
          {COLORS.map((c) => (
            <button
              key={c.value}
              type="button"
              className={`w-8 h-8 rounded-full border-2 transition-all ${
                color === c.value ? "border-white scale-110" : "border-transparent"
              }`}
              style={{ backgroundColor: c.value }}
              onClick={() => setColor(c.value)}
              title={c.label}
            />
          ))}
        </div>
      </div>

      {/* Location */}
      <div className="space-y-3">
        <Label>Location Type</Label>
        <Select value={locationType} onValueChange={(v) => setLocationType((v as "video" | "phone" | "inperson") || "video")}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="video">Video Call (Zoom/Meet/Teams)</SelectItem>
            <SelectItem value="phone">Phone Call</SelectItem>
            <SelectItem value="inperson">In-Person</SelectItem>
          </SelectContent>
        </Select>
        <Input
          placeholder={
            locationType === "video"
              ? "https://meet.google.com/..."
              : locationType === "phone"
              ? "+1 555-0000"
              : "123 Main St, City"
          }
          value={locationValue}
          onChange={(e) => setLocationValue(e.target.value)}
        />
      </div>

      {/* Buffer */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Buffer Before</Label>
          <Select value={bufferBefore} onValueChange={(v) => setBufferBefore(v || "0")}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {BUFFER_TIMES.map((b) => (
                <SelectItem key={b} value={b.toString()}>{b === 0 ? "None" : `${b} min`}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Buffer After</Label>
          <Select value={bufferAfter} onValueChange={(v) => setBufferAfter(v || "0")}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {BUFFER_TIMES.map((b) => (
                <SelectItem key={b} value={b.toString()}>{b === 0 ? "None" : `${b} min`}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Max bookings */}
      <div className="space-y-2">
        <Label htmlFor="maxPerDay">Max bookings per day (optional)</Label>
        <Input
          id="maxPerDay"
          type="number"
          placeholder="No limit"
          value={maxPerDay}
          onChange={(e) => setMaxPerDay(e.target.value)}
          min={1}
        />
      </div>

      {/* Active toggle */}
      <div className="flex items-center justify-between py-2 border-t border-border">
        <Label>Active</Label>
        <Switch checked={isActive} onCheckedChange={setIsActive} />
      </div>

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Saving..." : isEditing ? "Save Changes" : "Create Event Type"}
      </Button>
    </form>
  );
}
