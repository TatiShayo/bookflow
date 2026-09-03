import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  generateSlots,
  formatSlotTime,
  formatTime,
  formatDate,
  formatDateTime,
  isDateBlocked,
  getZonedDateString,
  getZonedDayOfWeek,
  isValidTimezone,
} from "../slots";
import { Availability, Booking, EventType } from "../types";

describe("generateSlots Engine", () => {
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
    // Mock the current date/time to Monday, June 29, 2026 at 12:00 PM local time
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 5, 29, 12, 0));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should generate basic slots (09:00 - 17:00) when no bookings exist", () => {
    const slots = generateSlots(mockDate, defaultAvailability, [], defaultEventType);
    expect(slots.length).toBe(31);

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

  it("should return empty array if availability is marked is_available: false", () => {
    const inactiveAvail: Availability[] = [
      {
        id: "avail-1",
        user_id: "user-1",
        day_of_week: 2,
        start_time: "09:00",
        end_time: "17:00",
        is_available: false,
      },
    ];
    const slots = generateSlots(mockDate, inactiveAvail, [], defaultEventType);
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

  it("should respect buffer_before_minutes and buffer_after_minutes on prospective slots", () => {
    const eventWithBuffers: EventType = {
      ...defaultEventType,
      duration_minutes: 30,
      buffer_before_minutes: 15,
      buffer_after_minutes: 15,
    };

    const slots = generateSlots(mockDate, defaultAvailability, [], eventWithBuffers);

    expect(slots[0]).toEqual({
      start: new Date(2026, 5, 30, 9, 15),
      end: new Date(2026, 5, 30, 9, 45),
    });

    expect(slots[1]).toEqual({
      start: new Date(2026, 5, 30, 9, 30),
      end: new Date(2026, 5, 30, 10, 0),
    });

    expect(slots[slots.length - 1]).toEqual({
      start: new Date(2026, 5, 30, 16, 15),
      end: new Date(2026, 5, 30, 16, 45),
    });
  });

  it("should filter out slots in the past if the target date is today", () => {
    // Set system time to 12:00 PM on Tuesday, June 30, 2026
    vi.setSystemTime(new Date(2026, 5, 30, 12, 0));

    const slots = generateSlots(mockDate, defaultAvailability, [], defaultEventType);

    const firstSlot = slots[0];
    expect(firstSlot.start.getTime()).toBeGreaterThan(new Date(2026, 5, 30, 12, 0).getTime());

    const startTimes = slots.map((s) => s.start.toISOString());
    expect(startTimes).not.toContain(new Date(2026, 5, 30, 11, 45).toISOString());
    expect(startTimes).not.toContain(new Date(2026, 5, 30, 12, 0).toISOString());
    expect(startTimes).toContain(new Date(2026, 5, 30, 12, 15).toISOString());
  });

  it("should enforce max_bookings_per_day limit and return [] if limit is reached", () => {
    const limitedEventType: EventType = {
      ...defaultEventType,
      max_bookings_per_day: 2,
    };

    const twoBookings: Booking[] = [
      {
        id: "b1",
        event_type_id: "event-1",
        attendee_name: "Alice",
        attendee_email: "alice@test.com",
        attendee_phone: null,
        start_time: new Date(2026, 5, 30, 9, 0).toISOString(),
        end_time: new Date(2026, 5, 30, 9, 30).toISOString(),
        status: "confirmed",
        stripe_payment_intent_id: null,
        amount_paid: 0,
        currency: "USD",
        notes: null,
        meeting_link: null,
        created_at: new Date().toISOString(),
      },
      {
        id: "b2",
        event_type_id: "event-1",
        attendee_name: "Bob",
        attendee_email: "bob@test.com",
        attendee_phone: null,
        start_time: new Date(2026, 5, 30, 14, 0).toISOString(),
        end_time: new Date(2026, 5, 30, 14, 30).toISOString(),
        status: "confirmed",
        stripe_payment_intent_id: null,
        amount_paid: 0,
        currency: "USD",
        notes: null,
        meeting_link: null,
        created_at: new Date().toISOString(),
      },
    ];

    const slots = generateSlots(mockDate, defaultAvailability, twoBookings, limitedEventType);
    expect(slots).toEqual([]);
  });

  it("should handle multiple split availability windows on the same day", () => {
    const splitAvailability: Availability[] = [
      {
        id: "avail-morning",
        user_id: "user-1",
        day_of_week: 2,
        start_time: "09:00",
        end_time: "12:00",
        is_available: true,
      },
      {
        id: "avail-afternoon",
        user_id: "user-1",
        day_of_week: 2,
        start_time: "14:00",
        end_time: "17:00",
        is_available: true,
      },
    ];

    const slots = generateSlots(mockDate, splitAvailability, [], defaultEventType);

    // Morning slots: 09:00, 09:15, ..., 11:30 (ends 12:00) -> 11 slots
    // Afternoon slots: 14:00, 14:15, ..., 16:30 (ends 17:00) -> 11 slots
    expect(slots.length).toBe(22);

    const slotStartTimes = slots.map((s) => s.start.getHours() * 60 + s.start.getMinutes());
    // Lunch gap (12:00 - 14:00) must have zero slots
    const lunchSlots = slotStartTimes.filter((t) => t >= 12 * 60 && t < 14 * 60);
    expect(lunchSlots).toHaveLength(0);
  });

  it("should support custom step minutes (e.g. 30 min step)", () => {
    const slots = generateSlots(mockDate, defaultAvailability, [], defaultEventType, {
      stepMinutes: 30,
    });

    // 09:00 to 17:00 with 30m duration and 30m step:
    // 09:00, 09:30, 10:00, 10:30, 11:00, 11:30, 12:00, 12:30, 13:00, 13:30, 14:00, 14:30, 15:00, 15:30, 16:00, 16:30
    expect(slots.length).toBe(16);
    expect(slots[0].start.getMinutes()).toBe(0);
    expect(slots[1].start.getMinutes()).toBe(30);
  });

  it("should return empty array for an invalid date", () => {
    const slots = generateSlots(new Date("invalid-date"), defaultAvailability, [], defaultEventType);
    expect(slots).toEqual([]);
  });

  it("should enforce minimum notice minutes option", () => {
    // Current time 09:00 AM on June 30
    vi.setSystemTime(new Date(2026, 5, 30, 9, 0));

    // Require 120 minutes (2 hours) notice
    const slots = generateSlots(mockDate, defaultAvailability, [], defaultEventType, {
      minNoticeMinutes: 120,
    });

    // Earliest slot must start at or after 11:00 AM
    expect(slots[0].start.getTime()).toBeGreaterThanOrEqual(
      new Date(2026, 5, 30, 11, 0).getTime()
    );
  });
});

describe("isDateBlocked and Zone Helpers", () => {
  it("should check if date is in blocked set", () => {
    const blocked = new Set(["2026-06-30", "2026-07-04"]);
    expect(isDateBlocked(new Date("2026-06-30T10:00:00Z"), blocked, "UTC")).toBe(true);
    expect(isDateBlocked(new Date("2026-07-01T10:00:00Z"), blocked, "UTC")).toBe(false);
  });

  it("should validate recognized IANA timezones", () => {
    expect(isValidTimezone("America/New_York")).toBe(true);
    expect(isValidTimezone("Europe/London")).toBe(true);
    expect(isValidTimezone("Asia/Tokyo")).toBe(true);
    expect(isValidTimezone("UTC")).toBe(true);
    expect(isValidTimezone("Invalid/Zone_Name")).toBe(false);
    expect(isValidTimezone("")).toBe(false);
  });

  it("should get zoned date string correctly", () => {
    // 2026-07-01 02:00 UTC is 2026-06-30 in America/New_York
    const d = new Date("2026-07-01T02:00:00Z");
    expect(getZonedDateString(d, "America/New_York")).toBe("2026-06-30");
    expect(getZonedDateString(d, "UTC")).toBe("2026-07-01");
  });

  it("should get zoned day of week correctly", () => {
    const d = new Date("2026-07-01T02:00:00Z"); // Wed in UTC, Tue in New York
    expect(getZonedDayOfWeek(d, "America/New_York")).toBe(2); // Tuesday
    expect(getZonedDayOfWeek(d, "UTC")).toBe(3); // Wednesday
  });
});
