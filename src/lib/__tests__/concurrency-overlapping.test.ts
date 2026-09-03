import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { isSlotOverlapping, generateSlots } from "../slots";
import { Availability, Booking, EventType } from "../types";

describe("Concurrency, Overlapping Slot Detection & Collision Prevention", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 5, 29, 12, 0));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("isSlotOverlapping Primitive", () => {
    const slotA = {
      start: new Date("2026-06-30T10:00:00Z"),
      end: new Date("2026-06-30T11:00:00Z"),
    };

    it("should return false for strictly non-overlapping past slot", () => {
      const slotBefore = {
        start: new Date("2026-06-30T08:00:00Z"),
        end: new Date("2026-06-30T09:00:00Z"),
      };
      expect(isSlotOverlapping(slotA, slotBefore)).toBe(false);
    });

    it("should return false for strictly non-overlapping future slot", () => {
      const slotAfter = {
        start: new Date("2026-06-30T12:00:00Z"),
        end: new Date("2026-06-30T13:00:00Z"),
      };
      expect(isSlotOverlapping(slotA, slotAfter)).toBe(false);
    });

    it("should return false for contiguous/adjacent slots (slotA.end === slotB.start)", () => {
      const adjacentAfter = {
        start: new Date("2026-06-30T11:00:00Z"),
        end: new Date("2026-06-30T12:00:00Z"),
      };
      const adjacentBefore = {
        start: new Date("2026-06-30T09:00:00Z"),
        end: new Date("2026-06-30T10:00:00Z"),
      };
      expect(isSlotOverlapping(slotA, adjacentAfter)).toBe(false);
      expect(isSlotOverlapping(slotA, adjacentBefore)).toBe(false);
    });

    it("should return true for identical slots", () => {
      const identical = {
        start: new Date("2026-06-30T10:00:00Z"),
        end: new Date("2026-06-30T11:00:00Z"),
      };
      expect(isSlotOverlapping(slotA, identical)).toBe(true);
    });

    it("should return true when slotB is fully contained within slotA", () => {
      const contained = {
        start: new Date("2026-06-30T10:15:00Z"),
        end: new Date("2026-06-30T10:45:00Z"),
      };
      expect(isSlotOverlapping(slotA, contained)).toBe(true);
    });

    it("should return true when slotA is fully contained within slotB", () => {
      const enveloping = {
        start: new Date("2026-06-30T09:30:00Z"),
        end: new Date("2026-06-30T11:30:00Z"),
      };
      expect(isSlotOverlapping(slotA, enveloping)).toBe(true);
    });

    it("should return true for partial overlap at the beginning", () => {
      const partialStart = {
        start: new Date("2026-06-30T09:30:00Z"),
        end: new Date("2026-06-30T10:30:00Z"),
      };
      expect(isSlotOverlapping(slotA, partialStart)).toBe(true);
    });

    it("should return true for partial overlap at the end", () => {
      const partialEnd = {
        start: new Date("2026-06-30T10:30:00Z"),
        end: new Date("2026-06-30T11:30:00Z"),
      };
      expect(isSlotOverlapping(slotA, partialEnd)).toBe(true);
    });

    it("should detect overlap when adjacent slots have buffer_after on slotA", () => {
      const adjacentAfter = {
        start: new Date("2026-06-30T11:00:00Z"),
        end: new Date("2026-06-30T12:00:00Z"),
      };
      // slotA has 15min buffer after, which extends its footprint to 11:15
      expect(
        isSlotOverlapping(slotA, adjacentAfter, { afterA: 15 })
      ).toBe(true);
    });

    it("should detect overlap when adjacent slots have buffer_before on slotB", () => {
      const adjacentAfter = {
        start: new Date("2026-06-30T11:00:00Z"),
        end: new Date("2026-06-30T12:00:00Z"),
      };
      // slotB requires 15min buffer before, which extends its footprint back to 10:45
      expect(
        isSlotOverlapping(slotA, adjacentAfter, { beforeB: 15 })
      ).toBe(true);
    });
  });

  describe("Cross-Event Multi-Service Double Booking Prevention", () => {
    const mockDate = new Date(2026, 5, 30); // Tuesday

    const hostAvailability: Availability[] = [
      {
        id: "avail-1",
        user_id: "host-1",
        day_of_week: 2,
        start_time: "09:00",
        end_time: "17:00",
        is_available: true,
      },
    ];

    const shortEventType: EventType = {
      id: "event-short",
      user_id: "host-1",
      title: "15-Min Quick Chat",
      slug: "quick-chat",
      description: null,
      duration_minutes: 15,
      price: 0,
      currency: "USD",
      color: "blue",
      is_active: true,
      max_bookings_per_day: null,
      buffer_before_minutes: 0,
      buffer_after_minutes: 0,
      location_type: "video",
      location_value: null,
      created_at: new Date().toISOString(),
    };

    const longEventType: EventType = {
      id: "event-long",
      user_id: "host-1",
      title: "60-Min Consultation",
      slug: "consultation",
      description: null,
      duration_minutes: 60,
      price: 150,
      currency: "USD",
      color: "purple",
      is_active: true,
      max_bookings_per_day: null,
      buffer_before_minutes: 0,
      buffer_after_minutes: 0,
      location_type: "video",
      location_value: null,
      created_at: new Date().toISOString(),
    };

    it("should prevent 60-min slot when a 15-min booking from another event type occupies part of that hour", () => {
      // Host has an existing booking for event-short from 10:15 to 10:30
      const existingBookings: Booking[] = [
        {
          id: "booking-short-1",
          event_type_id: "event-short",
          attendee_name: "Alice",
          attendee_email: "alice@example.com",
          attendee_phone: null,
          start_time: new Date(2026, 5, 30, 10, 15).toISOString(),
          end_time: new Date(2026, 5, 30, 10, 30).toISOString(),
          status: "confirmed",
          stripe_payment_intent_id: null,
          amount_paid: 0,
          currency: "USD",
          notes: null,
          meeting_link: null,
          created_at: new Date().toISOString(),
        },
      ];

      // Generate slots for the 60-min long event type
      const longSlots = generateSlots(
        mockDate,
        hostAvailability,
        existingBookings,
        longEventType,
        { stepMinutes: 15 }
      );

      const longSlotStartTimes = longSlots.map((s) => s.start.toISOString());

      // Slot 09:30 - 10:30 overlaps with 10:15 - 10:30 -> must be blocked
      expect(longSlotStartTimes).not.toContain(new Date(2026, 5, 30, 9, 30).toISOString());
      // Slot 09:45 - 10:45 overlaps with 10:15 - 10:30 -> must be blocked
      expect(longSlotStartTimes).not.toContain(new Date(2026, 5, 30, 9, 45).toISOString());
      // Slot 10:00 - 11:00 overlaps with 10:15 - 10:30 -> must be blocked
      expect(longSlotStartTimes).not.toContain(new Date(2026, 5, 30, 10, 0).toISOString());
      // Slot 10:15 - 11:15 overlaps with 10:15 - 10:30 -> must be blocked
      expect(longSlotStartTimes).not.toContain(new Date(2026, 5, 30, 10, 15).toISOString());

      // Slot 09:00 - 10:00 ends before 10:15 -> available
      expect(longSlotStartTimes).toContain(new Date(2026, 5, 30, 9, 0).toISOString());
      // Slot 10:30 - 11:30 starts after 10:30 -> available
      expect(longSlotStartTimes).toContain(new Date(2026, 5, 30, 10, 30).toISOString());
    });

    it("should respect buffers from previous bookings of other event types", () => {
      // Existing booking has buffer_after: 15
      const bookingWithBuffer: Booking = {
        id: "b-buf",
        event_type_id: "event-with-buffer",
        attendee_name: "Bob",
        attendee_email: "bob@example.com",
        attendee_phone: null,
        start_time: new Date(2026, 5, 30, 10, 0).toISOString(),
        end_time: new Date(2026, 5, 30, 10, 30).toISOString(),
        status: "confirmed",
        stripe_payment_intent_id: null,
        amount_paid: 0,
        currency: "USD",
        notes: null,
        meeting_link: null,
        created_at: new Date().toISOString(),
        event_types: {
          ...shortEventType,
          buffer_before_minutes: 0,
          buffer_after_minutes: 15, // 15 min buffer after meeting (until 10:45)
        },
      };

      const slots = generateSlots(
        mockDate,
        hostAvailability,
        [bookingWithBuffer],
        shortEventType,
        { stepMinutes: 15 }
      );

      const slotStarts = slots.map((s) => s.start.toISOString());

      // Slot at 10:30 (ends 10:45) collides with 15min after-buffer -> must NOT be available
      expect(slotStarts).not.toContain(new Date(2026, 5, 30, 10, 30).toISOString());
      // Slot at 10:45 (ends 11:00) is free -> available
      expect(slotStarts).toContain(new Date(2026, 5, 30, 10, 45).toISOString());
    });
  });
});
