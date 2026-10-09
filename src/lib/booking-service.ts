import { parseISO, isValid } from "date-fns";
import { generateSlots, getZonedDateString } from "@/lib/slots";
import type { Availability, Booking, EventType } from "@/lib/types";

export type SlotCheck = { ok: true } | { ok: false; reason: string };

type AvailabilityRow = Availability;
type BookingRow = Booking;

type EventTypeLike = EventType;

/**
 * Single source of truth for "is this slot bookable?".
 *
 * Extracted because the API route and the Stripe webhook each need to answer
 * it, and they previously diverged: the API route validated availability,
 * blocked dates and the daily cap, while the webhook created a confirmed
 * booking with only an amount check. A paid guest could therefore be confirmed
 * into an already-booked slot purely through the webhook path.
 *
 * Returns a discriminated result rather than throwing, so both callers can map
 * it to their own HTTP status codes.
 */
export function assertSlotAvailable(input: {
  startTime: string;
  endTime: string;
  timezone?: string;
  availability: AvailabilityRow[];
  existingBookings: BookingRow[];
  eventType: EventTypeLike;
  blockedDates?: Array<{ date: string }>;
}): SlotCheck {
  const { startTime, endTime, timezone, availability, existingBookings, eventType, blockedDates } = input;

  const requestedStart = parseISO(startTime);
  const requestedEnd = parseISO(endTime);
  if (!isValid(requestedStart) || !isValid(requestedEnd)) {
    return { ok: false, reason: "Invalid start or end time." };
  }
  if (requestedEnd.getTime() <= requestedStart.getTime()) {
    return { ok: false, reason: "End time must be after start time." };
  }

  // Blocked dates are stored as zoned calendar dates.
  if (blockedDates && blockedDates.length > 0) {
    const targetDateStr = getZonedDateString(requestedStart, timezone);
    const isBlocked = blockedDates.some((b) => b?.date === targetDateStr);
    if (isBlocked) {
      return { ok: false, reason: "This date is blocked by the host." };
    }
  }

  const slots = generateSlots(requestedStart, availability, existingBookings, eventType, {
    timezone,
  });

  const slotAvailable = slots.some(
    (s) =>
      s.start.getTime() === requestedStart.getTime() &&
      s.end.getTime() === requestedEnd.getTime()
  );

  if (!slotAvailable) {
    return { ok: false, reason: "This time slot is no longer available." };
  }

  // Daily cap. Counted on zoned calendar dates so a host in UTC+13 and one in
  // UTC-8 both see "per day" mean their own day.
  const dailyCap = eventType.max_bookings_per_day;
  if (dailyCap && dailyCap > 0) {
    const targetDateStr = getZonedDateString(requestedStart, timezone);
    const activeCount = existingBookings.filter((b) => {
      if (b.status === "cancelled") return false;
      const bStart = parseISO(b.start_time);
      return isValid(bStart) && getZonedDateString(bStart, timezone) === targetDateStr;
    }).length;

    if (activeCount >= dailyCap) {
      return { ok: false, reason: "This day is fully booked." };
    }
  }

  return { ok: true };
}
