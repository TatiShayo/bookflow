import {
  format,
  differenceInMinutes,
  addMinutes,
  setHours,
  setMinutes,
  setSeconds,
  setMilliseconds,
  isAfter,
  startOfDay,
  parseISO,
  isValid,
} from "date-fns";
import { Availability, Booking, EventType, TimeSlot } from "./types";

export interface GenerateSlotsOptions {
  timezone?: string;
  stepMinutes?: number;
  now?: Date;
  minNoticeMinutes?: number;
}

/**
 * Validates if an IANA timezone string is recognized by the runtime.
 */
export function isValidTimezone(tz?: string): boolean {
  if (!tz || typeof tz !== "string") return false;
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/**
 * Returns the date formatted as YYYY-MM-DD in the specified timezone.
 */
export function getZonedDateString(date: Date, timezone?: string): string {
  if (!timezone || !isValidTimezone(timezone)) {
    return format(date, "yyyy-MM-dd");
  }
  try {
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    return formatter.format(date);
  } catch {
    return format(date, "yyyy-MM-dd");
  }
}

/**
 * Offset in milliseconds between `timeZone` wall-clock and UTC, evaluated at the
 * instant `date`. DST-aware: the offset is derived from the actual instant, not
 * from a static table.
 */
function getTimeZoneOffsetMs(timeZone: string, date: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(date);

  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? "0");
  const asUtcMs = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    get("hour") % 24, // Intl can emit hour "24" for midnight in some ICU builds
    get("minute"),
    get("second")
  );
  // Truncate to whole seconds so sub-second drift cannot accumulate.
  return asUtcMs - Math.floor(date.getTime() / 1000) * 1000;
}

/**
 * Converts a wall-clock time on a zoned calendar day into the matching UTC
 * instant.
 *
 * `zonedDateStr` is a `YYYY-MM-DD` calendar date as observed in `timeZone` (see
 * `getZonedDateString`), and `hours`/`minutes` are wall-clock in that same zone.
 *
 * Two passes resolve the DST boundary: the offset is measured at the naive
 * instant, then re-measured at the corrected instant. For a 09:00 availability
 * window this returns 09:00 in `timeZone` regardless of the server's own zone.
 */
export function zonedWallClockToUtc(
  zonedDateStr: string,
  hours: number,
  minutes: number,
  timeZone?: string
): Date {
  const [y, mo, d] = zonedDateStr.split("-").map(Number);

  // Without a timezone, interpret in the host's LOCAL zone — matching the
  // original `setHours(startOfDay(date), …)` semantics that callers without a
  // host timezone depend on. `new Date(y, m, d, …)` is local by construction.
  if (!timeZone || !isValidTimezone(timeZone)) {
    return new Date(y, (mo ?? 1) - 1, d ?? 1, hours, minutes, 0, 0);
  }
  const naiveUtcMs = Date.UTC(y, (mo ?? 1) - 1, d ?? 1, hours, minutes, 0, 0);

  let ts = naiveUtcMs;
  for (let pass = 0; pass < 2; pass++) {
    const offsetMs = getTimeZoneOffsetMs(timeZone, new Date(ts));
    const next = naiveUtcMs - offsetMs;
    if (next === ts) break; // converged
    ts = next;
  }
  return new Date(ts);
}

/**
 * Returns the day of week (0=Sun, 1=Mon, ..., 6=Sat) in the specified timezone.
 */
export function getZonedDayOfWeek(date: Date, timezone?: string): number {
  if (!timezone || !isValidTimezone(timezone)) {
    return date.getDay();
  }
  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      weekday: "short",
    });
    const weekdayStr = formatter.format(date);
    const dayMap: Record<string, number> = {
      Sun: 0,
      Mon: 1,
      Tue: 2,
      Wed: 3,
      Thu: 4,
      Fri: 5,
      Sat: 6,
    };
    return dayMap[weekdayStr] ?? date.getDay();
  } catch {
    return date.getDay();
  }
}

/**
 * Checks if two time intervals overlap, taking into account optional buffer times.
 */
export function isSlotOverlapping(
  slotA: { start: Date; end: Date },
  slotB: { start: Date; end: Date },
  buffers?: {
    beforeA?: number;
    afterA?: number;
    beforeB?: number;
    afterB?: number;
  }
): boolean {
  const startA = addMinutes(slotA.start, -(buffers?.beforeA ?? 0));
  const endA = addMinutes(slotA.end, buffers?.afterA ?? 0);
  const startB = addMinutes(slotB.start, -(buffers?.beforeB ?? 0));
  const endB = addMinutes(slotB.end, buffers?.afterB ?? 0);

  return startA < endB && endA > startB;
}

/**
 * Checks if a date string is in the blocked dates collection.
 */
export function isDateBlocked(
  date: Date,
  blockedDates: Set<string> | string[],
  timezone?: string
): boolean {
  const dateStr = getZonedDateString(date, timezone);
  if (blockedDates instanceof Set) {
    return blockedDates.has(dateStr);
  }
  return blockedDates.includes(dateStr);
}

/**
 * Generates available booking time slots for a given date, event type, and existing bookings.
 */
export function generateSlots(
  date: Date,
  availabilities: Availability[],
  existingBookings: Booking[],
  eventType: EventType,
  options?: GenerateSlotsOptions
): TimeSlot[] {
  if (!date || !isValid(date)) return [];

  const timezone = options?.timezone && isValidTimezone(options.timezone) ? options.timezone : undefined;
  const stepMinutes = options?.stepMinutes && options.stepMinutes > 0 ? options.stepMinutes : 15;
  const now = options?.now ?? new Date();
  const minNoticeMinutes = Math.max(0, options?.minNoticeMinutes ?? 0);
  const earliestAllowedTime = addMinutes(now, minNoticeMinutes);

  const duration = Math.max(1, eventType.duration_minutes || 60);
  const bufferBefore = Math.max(0, eventType.buffer_before_minutes || 0);
  const bufferAfter = Math.max(0, eventType.buffer_after_minutes || 0);
  const totalSlotFootprint = duration + bufferBefore + bufferAfter;

  // Filter out cancelled bookings
  const activeBookings = existingBookings.filter((b) => b.status !== "cancelled");

  // Check max bookings per day limit if configured
  if (eventType.max_bookings_per_day && eventType.max_bookings_per_day > 0) {
    const targetDateStr = getZonedDateString(date, timezone);
    const dayBookingsCount = activeBookings.filter((b) => {
      const bDate = parseISO(b.start_time);
      if (!isValid(bDate)) return false;
      return getZonedDateString(bDate, timezone) === targetDateStr;
    }).length;

    if (dayBookingsCount >= eventType.max_bookings_per_day) {
      return [];
    }
  }

  const dayOfWeek = getZonedDayOfWeek(date, timezone);
  const dayWindows = availabilities.filter(
    (a) => a.day_of_week === dayOfWeek && a.is_available
  );

  if (dayWindows.length === 0) return [];

  const slots: TimeSlot[] = [];

  for (const window of dayWindows) {
    if (!window.start_time || !window.end_time) continue;

    const [sh, sm] = window.start_time.split(":").map(Number);
    const [eh, em] = window.end_time.split(":").map(Number);

    if (
      isNaN(sh) ||
      isNaN(sm) ||
      isNaN(eh) ||
      isNaN(em) ||
      sh < 0 ||
      sh > 23 ||
      eh < 0 ||
      eh > 23 ||
      sm < 0 ||
      sm > 59 ||
      em < 0 ||
      em > 59
    ) {
      continue;
    }

    const windowStartMinutes = sh * 60 + sm;
    const windowEndMinutes = eh * 60 + em;
    if (windowEndMinutes <= windowStartMinutes) {
      continue; // Invalid or inverted window
    }

    // Build the availability window in the HOST's timezone. The previous
    // implementation used `setHours(startOfDay(date), sh)`, which interprets
    // `sh` in the SERVER's local zone — so on a UTC host (Vercel), a 09:00
    // window for an Asia/Tokyo host silently became 09:00 UTC.
    const zonedDay = getZonedDateString(date, timezone);
    const windowStart = zonedWallClockToUtc(zonedDay, sh, sm, timezone);
    const windowEnd = zonedWallClockToUtc(zonedDay, eh, em, timezone);

    let cursor = windowStart;
    while (differenceInMinutes(windowEnd, cursor) >= totalSlotFootprint) {
      const slotStart = addMinutes(cursor, bufferBefore);
      const slotEnd = addMinutes(slotStart, duration);

      // Verify the slot start is not in the past
      const isFutureSlot = isAfter(slotStart, earliestAllowedTime);

      if (isFutureSlot) {
        const overlaps = activeBookings.some((b) => {
          const bStart = parseISO(b.start_time);
          const bEnd = parseISO(b.end_time);
          if (!isValid(bStart) || !isValid(bEnd)) return false;

          const bBufBefore = b.event_types?.buffer_before_minutes ?? 0;
          const bBufAfter = b.event_types?.buffer_after_minutes ?? 0;

          return isSlotOverlapping(
            { start: slotStart, end: slotEnd },
            { start: bStart, end: bEnd },
            {
              beforeA: bufferBefore,
              afterA: bufferAfter,
              beforeB: bBufBefore,
              afterB: bBufAfter,
            }
          );
        });

        if (!overlaps) {
          slots.push({ start: slotStart, end: slotEnd });
        }
      }

      cursor = addMinutes(cursor, stepMinutes);
    }
  }

  // Deduplicate and sort slots chronologically
  return slots
    .filter(
      (slot, index, self) =>
        index === self.findIndex((s) => s.start.getTime() === slot.start.getTime())
    )
    .sort((a, b) => a.start.getTime() - b.start.getTime());
}

/**
 * Formats a slot start and end time in a specific timezone.
 */
export function formatSlotTime(slot: TimeSlot, timezone?: string): string {
  const tz = isValidTimezone(timezone) ? timezone! : "UTC";
  const fmt = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: tz,
  });
  return `${fmt.format(slot.start)} - ${fmt.format(slot.end)}`;
}

/**
 * Formats a Date object to a time string.
 */
export function formatTime(date: Date, timezone?: string): string {
  if (timezone && isValidTimezone(timezone)) {
    return new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "2-digit",
      timeZone: timezone,
    }).format(date);
  }
  return format(date, "h:mm a");
}

/**
 * Formats a Date object to a standard date string.
 */
export function formatDate(date: Date, timezone?: string): string {
  if (timezone && isValidTimezone(timezone)) {
    return new Intl.DateTimeFormat("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
      timeZone: timezone,
    }).format(date);
  }
  return format(date, "EEE, MMM d, yyyy");
}

/**
 * Formats an ISO string to a human-readable datetime string.
 */
export function formatDateTime(iso: string, timezone?: string): string {
  const d = parseISO(iso);
  if (!isValid(d)) return "";
  if (timezone && isValidTimezone(timezone)) {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZone: timezone,
    }).format(d).replace(",", " at");
  }
  return format(d, "MMM d, yyyy 'at' h:mm a");
}
