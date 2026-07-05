import { format, differenceInMinutes, addMinutes, setHours, setMinutes, isAfter, startOfDay, isBefore, isToday, parseISO } from "date-fns";
import { Availability, Booking, EventType, TimeSlot } from "./types";

export function generateSlots(
  date: Date,
  availabilities: Availability[],
  existingBookings: Booking[],
  eventType: EventType
): TimeSlot[] {
  const dayOfWeek = date.getDay();
  const dayWindows = availabilities.filter(
    (a) => a.day_of_week === dayOfWeek && a.is_available
  );

  if (dayWindows.length === 0) return [];

  const slots: TimeSlot[] = [];

  for (const window of dayWindows) {
    const [sh, sm] = window.start_time.split(":").map(Number);
    const [eh, em] = window.end_time.split(":").map(Number);

    const windowStart = setMinutes(setHours(startOfDay(date), sh), sm);
    const windowEnd = setMinutes(setHours(startOfDay(date), eh), em);

    let cursor = windowStart;
    while (
      differenceInMinutes(windowEnd, cursor) >=
      eventType.duration_minutes + eventType.buffer_before_minutes + eventType.buffer_after_minutes
    ) {
      const slotStart = addMinutes(cursor, eventType.buffer_before_minutes);
      const slotEnd = addMinutes(slotStart, eventType.duration_minutes);

      const overlaps = existingBookings.some((b) => {
        if (b.status === "cancelled") return false;
        const bStart = parseISO(b.start_time);
        const bEnd = parseISO(b.end_time);
        return slotStart < bEnd && slotEnd > bStart;
      });

      if (
        !overlaps &&
        (isToday(date) ? isAfter(slotStart, new Date()) : true)
      ) {
        slots.push({ start: slotStart, end: slotEnd });
      }

      cursor = addMinutes(cursor, 15);
    }
  }

  return slots;
}

export function formatSlotTime(slot: TimeSlot, timezone?: string): string {
  const tz = timezone || "UTC";
  const fmt = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: tz,
  });
  return `${fmt.format(slot.start)} - ${fmt.format(slot.end)}`;
}

export function formatTime(date: Date): string {
  return format(date, "h:mm a");
}

export function formatDate(date: Date): string {
  return format(date, "EEE, MMM d, yyyy");
}

export function formatDateTime(iso: string): string {
  const d = parseISO(iso);
  return format(d, "MMM d, yyyy 'at' h:mm a");
}
