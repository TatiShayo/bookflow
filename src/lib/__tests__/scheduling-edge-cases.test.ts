import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { generateSlots } from "../slots";
import { Availability, Booking, EventType } from "../types";

describe("Advanced Scheduling Engine Edge Cases", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const baseEventType: EventType = {
    id: "evt-edge",
    user_id: "host-edge",
    title: "Deep Dive",
    slug: "deep-dive",
    description: null,
    duration_minutes: 60,
    price: 100,
    currency: "USD",
    color: "#10b981",
    is_active: true,
    max_bookings_per_day: null,
    buffer_before_minutes: 0,
    buffer_after_minutes: 0,
    location_type: "video",
    location_value: null,
    created_at: new Date().toISOString(),
  };

  it("should handle leap year dates (Feb 29, 2028) properly", () => {
    // 2028 is a leap year. Feb 29, 2028 is Tuesday (day_of_week = 2)
    const leapDate = new Date(2028, 1, 29); // Feb 29, 2028
    const availability: Availability[] = [
      {
        id: "avail-leap",
        user_id: "host-edge",
        day_of_week: 2,
        start_time: "09:00",
        end_time: "12:00",
        is_available: true,
      },
    ];

    const slots = generateSlots(leapDate, availability, [], baseEventType, { stepMinutes: 60 });
    expect(slots).toHaveLength(3);
    expect(slots[0].start.getDate()).toBe(29);
    expect(slots[0].start.getMonth()).toBe(1); // February
    expect(slots[0].start.getFullYear()).toBe(2028);
  });

  it("should return empty slots when duration is longer than the availability window", () => {
    const longEventType: EventType = {
      ...baseEventType,
      duration_minutes: 180, // 3 hours
    };

    const shortWindow: Availability[] = [
      {
        id: "avail-short",
        user_id: "host-edge",
        day_of_week: 2,
        start_time: "09:00",
        end_time: "11:00", // Only 2 hours long
        is_available: true,
      },
    ];

    const slots = generateSlots(new Date(2026, 5, 30), shortWindow, [], longEventType);
    expect(slots).toEqual([]);
  });

  it("should handle large buffer sizes (e.g. 60m buffer before & 60m buffer after a 30m event)", () => {
    const hugeBufferEventType: EventType = {
      ...baseEventType,
      duration_minutes: 30,
      buffer_before_minutes: 60,
      buffer_after_minutes: 60,
    };

    // Total footprint per slot = 60 + 30 + 60 = 150 minutes (2.5 hours)
    // Window is 09:00 to 14:00 (5 hours = 300 minutes)
    const availability: Availability[] = [
      {
        id: "avail-huge-buf",
        user_id: "host-edge",
        day_of_week: 2,
        start_time: "09:00",
        end_time: "14:00",
        is_available: true,
      },
    ];

    const slots = generateSlots(new Date(2026, 5, 30), availability, [], hugeBufferEventType, {
      stepMinutes: 30,
    });

    // Slot 1: cursor 09:00 -> slotStart 10:00, slotEnd 10:30 (footprint 09:00 - 11:30)
    // Slot 2: cursor 09:30 -> slotStart 10:30, slotEnd 11:00 (footprint 09:30 - 12:00)
    // Slot 3: cursor 10:00 -> slotStart 11:00, slotEnd 11:30 (footprint 10:00 - 12:30)
    // Slot 4: cursor 10:30 -> slotStart 11:30, slotEnd 12:00 (footprint 10:30 - 13:00)
    // Slot 5: cursor 11:00 -> slotStart 12:00, slotEnd 12:30 (footprint 11:00 - 13:30)
    // Slot 6: cursor 11:30 -> slotStart 12:30, slotEnd 13:00 (footprint 11:30 - 14:00)
    expect(slots).toHaveLength(6);
    expect(slots[0]).toEqual({
      start: new Date(2026, 5, 30, 10, 0),
      end: new Date(2026, 5, 30, 10, 30),
    });
    expect(slots[slots.length - 1]).toEqual({
      start: new Date(2026, 5, 30, 12, 30),
      end: new Date(2026, 5, 30, 13, 0),
    });
  });

  it("should find the exact single available gap between multiple back-to-back bookings", () => {
    const targetDate = new Date(2026, 5, 30);
    const availability: Availability[] = [
      {
        id: "avail-day",
        user_id: "host-edge",
        day_of_week: 2,
        start_time: "09:00",
        end_time: "17:00",
        is_available: true,
      },
    ];

    // Host is booked 09:00-11:00 and 12:00-17:00
    // Exactly 1 hour slot (11:00 - 12:00) is open
    const bookings: Booking[] = [
      {
        id: "b-morning",
        event_type_id: "evt-edge",
        attendee_name: "Client 1",
        attendee_email: "c1@test.com",
        attendee_phone: null,
        start_time: new Date(2026, 5, 30, 9, 0).toISOString(),
        end_time: new Date(2026, 5, 30, 11, 0).toISOString(),
        status: "confirmed",
        stripe_payment_intent_id: null,
        amount_paid: 100,
        currency: "USD",
        notes: null,
        meeting_link: null,
        created_at: new Date().toISOString(),
      },
      {
        id: "b-afternoon",
        event_type_id: "evt-edge",
        attendee_name: "Client 2",
        attendee_email: "c2@test.com",
        attendee_phone: null,
        start_time: new Date(2026, 5, 30, 12, 0).toISOString(),
        end_time: new Date(2026, 5, 30, 17, 0).toISOString(),
        status: "confirmed",
        stripe_payment_intent_id: null,
        amount_paid: 100,
        currency: "USD",
        notes: null,
        meeting_link: null,
        created_at: new Date().toISOString(),
      },
    ];

    const slots = generateSlots(targetDate, availability, bookings, baseEventType, {
      stepMinutes: 15,
    });

    // Exactly one slot: 11:00 - 12:00
    expect(slots).toHaveLength(1);
    expect(slots[0]).toEqual({
      start: new Date(2026, 5, 30, 11, 0),
      end: new Date(2026, 5, 30, 12, 0),
    });
  });

  it("should return empty array if availability window has inverted start and end times (e.g. 17:00 to 09:00)", () => {
    const invertedAvailability: Availability[] = [
      {
        id: "avail-inverted",
        user_id: "host-edge",
        day_of_week: 2,
        start_time: "17:00",
        end_time: "09:00",
        is_available: true,
      },
    ];

    const slots = generateSlots(new Date(2026, 5, 30), invertedAvailability, [], baseEventType);
    expect(slots).toEqual([]);
  });
});
