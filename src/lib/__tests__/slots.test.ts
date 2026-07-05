import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { generateSlots, formatSlotTime, formatTime, formatDate, formatDateTime } from "../slots";
import { Availability, Booking, EventType } from "../types";

describe("generateSlots", () => {
  // June 30, 2026 is Tuesday (getDay() = 2) in local time
  const mockDate = new Date(2026, 5, 30);

  const defaultEventType: EventType = {
    id: "event-1",
    user_id: "user-1",
    title: "Intro Meeting",
    slug: "intro",
    description: null,
    duration_minutes: 30,
    price: 0,
    currency: "USD",
    color: "blue",
    is_active: true,
    max_bookings_per_day: null,
    buffer_before_minutes: 0,
    buffer_after_minutes: 0,
    location_type: "video",
    location_value: "https://zoom.us/mock",
    created_at: new Date(2026, 5, 29, 12, 0).toISOString(),
  };

  const defaultAvailability: Availability[] = [
    {
      id: "avail-1",
      user_id: "user-1",
      day_of_week: 2, // Tuesday
      start_time: "09:00",
      end_time: "17:00",
      is_available: true,
    },
  ];

  beforeEach(() => {
    // Mock the current date/time to be Monday, June 29, 2026 at 12:00 PM local time
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 5, 29, 12, 0));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should generate basic slots (e.g. 9 AM - 5 PM) when no bookings exist", () => {
    const slots = generateSlots(mockDate, defaultAvailability, [], defaultEventType);

    // With a 9:00 - 17:00 window, 30m duration, and 15m step (cursor increment):
    // First slot: start 09:00, end 09:30
    // Second slot: start 09:15, end 09:45
    // ...
    // Last slot: start 16:30, end 17:00 (since 17:00 - 16:30 = 30 >= 30, and next cursor is 16:45 where 17:00 - 16:45 = 15 < 30)
    expect(slots.length).toBe(31); // (16.5 - 9) * 4 + 1 = 31 slots

    expect(slots[0]).toEqual({
      start: new Date(2026, 5, 30, 9, 0),
      end: new Date(2026, 5, 30, 9, 30),
    });

    expect(slots[slots.length - 1]).toEqual({
      start: new Date(2026, 5, 30, 16, 30),
      end: new Date(2026, 5, 30, 17, 0),
    });
  });

  it("should return empty array if no availability exists for the day of the week", () => {
    const slots = generateSlots(
      new Date(2026, 5, 29), // Monday (getDay() = 1)
      defaultAvailability,
      [],
      defaultEventType
    );
    expect(slots).toEqual([]);
  });

  it("should filter out slots that overlap with existing confirmed bookings", () => {
    const existingBookings: Booking[] = [
      {
        id: "booking-1",
        event_type_id: "event-1",
        attendee_name: "Alice",
        attendee_email: "alice@example.com",
        attendee_phone: null,
        start_time: new Date(2026, 5, 30, 10, 0).toISOString(),
        end_time: new Date(2026, 5, 30, 10, 30).toISOString(),
        status: "confirmed",
        stripe_payment_intent_id: null,
        amount_paid: 0,
        currency: "USD",
        notes: null,
        meeting_link: null,
        created_at: new Date(2026, 5, 29, 12, 0).toISOString(),
      },
    ];

    const slots = generateSlots(mockDate, defaultAvailability, existingBookings, defaultEventType);

    // Check that slots starting at 09:45, 10:00, and 10:15 are filtered out
    // Slot 09:45 (ends 10:15) overlaps 10:00 - 10:30
    // Slot 10:00 (ends 10:30) overlaps 10:00 - 10:30
    // Slot 10:15 (ends 10:45) overlaps 10:00 - 10:30
    // Slot 09:30 (ends 10:00) and Slot 10:30 (ends 11:00) should be available.
    const startTimes = slots.map((s) => s.start.toISOString());

    expect(startTimes).toContain(new Date(2026, 5, 30, 9, 30).toISOString());
    expect(startTimes).not.toContain(new Date(2026, 5, 30, 9, 45).toISOString());
    expect(startTimes).not.toContain(new Date(2026, 5, 30, 10, 0).toISOString());
    expect(startTimes).not.toContain(new Date(2026, 5, 30, 10, 15).toISOString());
    expect(startTimes).toContain(new Date(2026, 5, 30, 10, 30).toISOString());
  });

  it("should NOT filter out slots that overlap with cancelled bookings", () => {
    const existingBookings: Booking[] = [
      {
        id: "booking-1",
        event_type_id: "event-1",
        attendee_name: "Alice",
        attendee_email: "alice@example.com",
        attendee_phone: null,
        start_time: new Date(2026, 5, 30, 10, 0).toISOString(),
        end_time: new Date(2026, 5, 30, 10, 30).toISOString(),
        status: "cancelled",
        stripe_payment_intent_id: null,
        amount_paid: 0,
        currency: "USD",
        notes: null,
        meeting_link: null,
        created_at: new Date(2026, 5, 29, 12, 0).toISOString(),
      },
    ];

    const slots = generateSlots(mockDate, defaultAvailability, existingBookings, defaultEventType);
    const startTimes = slots.map((s) => s.start.toISOString());

    expect(startTimes).toContain(new Date(2026, 5, 30, 10, 0).toISOString());
  });

  it("should respect buffer_before_minutes and buffer_after_minutes", () => {
    const eventWithBuffers: EventType = {
      ...defaultEventType,
      duration_minutes: 30,
      buffer_before_minutes: 15,
      buffer_after_minutes: 15,
    };

    const slots = generateSlots(mockDate, defaultAvailability, [], eventWithBuffers);

    // Total slot cost (cursor space needed) = 30 (duration) + 15 (before) + 15 (after) = 60 minutes
    // Loop condition: differenceInMinutes(windowEnd, cursor) >= 60
    // Cursor starts at 09:00:
    // Slot 1:
    // - start: cursor + buffer_before = 09:00 + 15m = 09:15
    // - end: start + duration = 09:15 + 30m = 09:45
    // - next cursor: cursor + 15m = 09:15
    // Slot 2 (cursor = 09:15):
    // - start: cursor + buffer_before = 09:15 + 15m = 09:30
    // - end: start + duration = 09:30 + 30m = 10:00
    // ...
    expect(slots[0]).toEqual({
      start: new Date(2026, 5, 30, 9, 15),
      end: new Date(2026, 5, 30, 9, 45),
    });

    expect(slots[1]).toEqual({
      start: new Date(2026, 5, 30, 9, 30),
      end: new Date(2026, 5, 30, 10, 0),
    });

    // Last slot:
    // Window ends at 17:00. Last cursor is 16:00. Slot starts at 16:15, ends 16:45.
    expect(slots[slots.length - 1]).toEqual({
      start: new Date(2026, 5, 30, 16, 15),
      end: new Date(2026, 5, 30, 16, 45),
    });
  });

  it("should filter out slots in the past if the slot day is today", () => {
    // Set system time to 12:00 PM on Tuesday, June 30, 2026
    vi.setSystemTime(new Date(2026, 5, 30, 12, 0));

    const slots = generateSlots(mockDate, defaultAvailability, [], defaultEventType);
    
    // Any slot starting at or before 12:00 PM should be filtered out
    // The first available slot start time must be after 12:00 PM (i.e. >= 12:15 PM)
    const firstSlot = slots[0];
    expect(firstSlot.start.getTime()).toBeGreaterThan(new Date(2026, 5, 30, 12, 0).getTime());

    const startTimes = slots.map((s) => s.start.toISOString());
    expect(startTimes).not.toContain(new Date(2026, 5, 30, 11, 45).toISOString());
    expect(startTimes).not.toContain(new Date(2026, 5, 30, 12, 0).toISOString());
    expect(startTimes).toContain(new Date(2026, 5, 30, 12, 15).toISOString());
  });
});

describe("Timezone conversion and formatting helpers", () => {
  describe("formatSlotTime", () => {
    const slot = {
      start: new Date("2026-06-30T12:00:00Z"),
      end: new Date("2026-06-30T12:30:00Z"),
    };

    it("should format slot correctly in default UTC timezone", () => {
      const formatted = formatSlotTime(slot, "UTC");
      expect(formatted).toBe("12:00 PM - 12:30 PM");
    });

    it("should format slot correctly for America/New_York (UTC-4 in summer)", () => {
      const formatted = formatSlotTime(slot, "America/New_York");
      expect(formatted).toBe("8:00 AM - 8:30 AM");
    });

    it("should format slot correctly for Asia/Tokyo (UTC+9)", () => {
      const formatted = formatSlotTime(slot, "Asia/Tokyo");
      expect(formatted).toBe("9:00 PM - 9:30 PM");
    });
  });

  describe("formatTime", () => {
    it("should format Date to h:mm a format", () => {
      const date = new Date("2026-06-30T14:05:00Z");
      const formatted = formatTime(date);
      expect(formatted).toMatch(/^\d{1,2}:\d{2}\s(AM|PM)$/i);
    });
  });

  describe("formatDate", () => {
    it("should format Date to EEE, MMM d, yyyy format", () => {
      const date = new Date("2026-06-30T12:00:00Z");
      const formatted = formatDate(date);
      expect(formatted).toMatch(/^[a-zA-Z]{3},\s[a-zA-Z]{3}\s\d{1,2},\s\d{4}$/);
    });
  });

  describe("formatDateTime", () => {
    it("should format ISO string to MMM d, yyyy 'at' h:mm a", () => {
      const iso = "2026-06-30T14:30:00.000Z";
      const formatted = formatDateTime(iso);
      expect(formatted).toMatch(/^[a-zA-Z]{3}\s\d{1,2},\s\d{4}\sat\s\d{1,2}:\d{2}\s(AM|PM)$/i);
    });
  });
});
