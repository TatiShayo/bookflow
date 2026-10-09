import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import {
  formatSlotTime,
  formatTime,
  formatDate,
  formatDateTime,
  getZonedDateString,
  getZonedDayOfWeek,
  generateSlots,
  isValidTimezone,
} from "../slots";
import { Availability, EventType } from "../types";

describe("Timezone & DST Conversion Suite", () => {
  const baseEventType: EventType = {
    id: "event-tz-1",
    user_id: "user-tz-1",
    title: "Global Consultation",
    slug: "global-consult",
    description: null,
    duration_minutes: 60,
    price: 100,
    currency: "USD",
    color: "#8b5cf6",
    is_active: true,
    max_bookings_per_day: null,
    buffer_before_minutes: 0,
    buffer_after_minutes: 0,
    location_type: "video",
    location_value: "https://meet.google.com/abc",
    created_at: new Date().toISOString(),
  };

  describe("IANA Timezone Validation & Normalization", () => {
    it("should accept valid standard timezones across major continents", () => {
      const validZones = [
        "UTC",
        "America/New_York",
        "America/Los_Angeles",
        "America/Chicago",
        "Europe/London",
        "Europe/Paris",
        "Europe/Berlin",
        "Asia/Tokyo",
        "Asia/Dubai",
        "Asia/Kolkata",
        "Australia/Sydney",
        "Pacific/Auckland",
      ];
      for (const tz of validZones) {
        expect(isValidTimezone(tz)).toBe(true);
      }
    });

    it("should reject malformed or non-existent timezone strings", () => {
      const invalidZones = [
        "Mars/Olympus_Mons",
        "GMT+99",
        "random-string",
        "America/NonExistentCity",
        null as unknown as string,
        undefined as unknown as string,
      ];
      for (const tz of invalidZones) {
        expect(isValidTimezone(tz)).toBe(false);
      }
    });
  });

  describe("formatSlotTime across global timezones", () => {
    // 14:00 to 15:00 UTC
    const slot = {
      start: new Date("2026-06-30T14:00:00.000Z"),
      end: new Date("2026-06-30T15:00:00.000Z"),
    };

    it("should format correctly in UTC", () => {
      expect(formatSlotTime(slot, "UTC")).toBe("2:00 PM - 3:00 PM");
    });

    it("should format correctly in America/New_York (EDT, UTC-4 in summer)", () => {
      expect(formatSlotTime(slot, "America/New_York")).toBe("10:00 AM - 11:00 AM");
    });

    it("should format correctly in America/Los_Angeles (PDT, UTC-7 in summer)", () => {
      expect(formatSlotTime(slot, "America/Los_Angeles")).toBe("7:00 AM - 8:00 AM");
    });

    it("should format correctly in Europe/London (BST, UTC+1 in summer)", () => {
      expect(formatSlotTime(slot, "Europe/London")).toBe("3:00 PM - 4:00 PM");
    });

    it("should format correctly in Asia/Tokyo (JST, UTC+9 year-round)", () => {
      expect(formatSlotTime(slot, "Asia/Tokyo")).toBe("11:00 PM - 12:00 AM");
    });

    it("should format correctly in Asia/Kolkata (IST, UTC+5:30 with half-hour offset)", () => {
      expect(formatSlotTime(slot, "Asia/Kolkata")).toBe("7:30 PM - 8:30 PM");
    });

    it("should format correctly in Australia/Sydney (AEST, UTC+10 in winter/June)", () => {
      // 14:00 UTC + 10h = 00:00 next day (midnight)
      expect(formatSlotTime(slot, "Australia/Sydney")).toBe("12:00 AM - 1:00 AM");
    });

    it("should fallback gracefully to UTC for invalid timezone names", () => {
      expect(formatSlotTime(slot, "Invalid/Tz")).toBe("2:00 PM - 3:00 PM");
    });
  });

  describe("Daylight Saving Time (DST) Transitions", () => {
    it("should correctly handle US Spring Forward transition (March 2026)", () => {
      // March 8, 2026 is US Spring Forward day (2 AM jumps to 3 AM)
      const dateBefore = new Date("2026-03-07T17:00:00Z"); // EST (UTC-5): 12:00 PM
      const dateAfter = new Date("2026-03-09T16:00:00Z"); // EDT (UTC-4): 12:00 PM

      const formattedBefore = formatTime(dateBefore, "America/New_York");
      const formattedAfter = formatTime(dateAfter, "America/New_York");

      expect(formattedBefore).toBe("12:00 PM");
      expect(formattedAfter).toBe("12:00 PM");
    });

    it("should correctly handle US Fall Back transition (November 2026)", () => {
      // November 1, 2026 is US Fall Back day (2 AM becomes 1 AM)
      const dateBefore = new Date("2026-10-31T16:00:00Z"); // EDT (UTC-4): 12:00 PM
      const dateAfter = new Date("2026-11-02T17:00:00Z"); // EST (UTC-5): 12:00 PM

      const formattedBefore = formatTime(dateBefore, "America/New_York");
      const formattedAfter = formatTime(dateAfter, "America/New_York");

      expect(formattedBefore).toBe("12:00 PM");
      expect(formattedAfter).toBe("12:00 PM");
    });

    it("should correctly handle European Summer Time transitions (March / October 2026)", () => {
      // London BST begins March 29, 2026
      const londonWinter = new Date("2026-03-25T12:00:00Z"); // GMT (UTC+0)
      const londonSummer = new Date("2026-04-05T11:00:00Z"); // BST (UTC+1)

      expect(formatTime(londonWinter, "Europe/London")).toBe("12:00 PM");
      expect(formatTime(londonSummer, "Europe/London")).toBe("12:00 PM");
    });
  });

  describe("Cross-Midnight and Day Boundary Shifts", () => {
    it("should calculate correct zoned date and day of week across midnight boundary", () => {
      // Sunday 11:30 PM in New York is Monday 03:30 AM in UTC
      const dateSundayNightNY = new Date("2026-06-29T03:30:00Z");

      // In UTC, this is Monday June 29
      expect(getZonedDateString(dateSundayNightNY, "UTC")).toBe("2026-06-29");
      expect(getZonedDayOfWeek(dateSundayNightNY, "UTC")).toBe(1); // Monday

      // In America/New_York, this is Sunday June 28
      expect(getZonedDateString(dateSundayNightNY, "America/New_York")).toBe("2026-06-28");
      expect(getZonedDayOfWeek(dateSundayNightNY, "America/New_York")).toBe(0); // Sunday

      // In Asia/Tokyo (UTC+9), this is Monday June 29 at 12:30 PM
      expect(getZonedDateString(dateSundayNightNY, "Asia/Tokyo")).toBe("2026-06-29");
      expect(getZonedDayOfWeek(dateSundayNightNY, "Asia/Tokyo")).toBe(1); // Monday
    });
  });

  describe("formatDateTime & formatDate with Timezones", () => {
    it("should format datetime string with timezone precision", () => {
      const iso = "2026-06-30T14:30:00.000Z";
      const formattedUTC = formatDateTime(iso, "UTC");
      expect(formattedUTC).toContain("2:30 PM");

      const formattedNY = formatDateTime(iso, "America/New_York");
      expect(formattedNY).toContain("10:30 AM");
    });

    it("should format date string consistently", () => {
      const date = new Date("2026-06-30T23:30:00.000Z");
      // In Tokyo (UTC+9), 23:30 UTC is July 1 morning
      const formattedTokyo = formatDate(date, "Asia/Tokyo");
      expect(formattedTokyo).toContain("Jul");
      expect(formattedTokyo).toContain("2026");

      // In New York (UTC-4), 23:30 UTC is June 30 evening
      const formattedNY = formatDate(date, "America/New_York");
      expect(formattedNY).toContain("Jun");
      expect(formattedNY).toContain("30");
    });
  });

  // ---------------------------------------------------------------------------
  // Regression: slot *instants* must be computed in the HOST's timezone.
  //
  // The original implementation built the availability window with
  // setHours(startOfDay(date), sh), which interprets sh in the SERVER's local
  // zone. On a UTC host that made a 09:00 window for an Asia/Tokyo host become
  // 09:00 UTC (18:00 Tokyo).
  //
  // These tests assert the absolute instant, not a formatted string, so a
  // regression cannot pass by luck. Availability covers all seven days so the
  // assertions isolate timezone handling from weekday selection.
  // ---------------------------------------------------------------------------
  describe("generateSlots builds slot instants in the host timezone", () => {
    const availability: Availability[] = Array.from({ length: 7 }, (_, day) => ({
      id: "av-tz-" + day,
      user_id: "host-1",
      day_of_week: day,
      start_time: "09:00",
      end_time: "10:00",
      is_available: true,
    }));

    // [timezone, an instant that is 2026-06-10 LOCAL in that zone, expected slot instant]
    // The input instant must fall on the intended local calendar date, otherwise
    // generateSlots selects a different weekday window.
    const cases = [
      ["UTC", "2026-06-10T12:00:00.000Z", "2026-06-10T09:00:00.000Z"],
      ["Asia/Tokyo", "2026-06-10T06:00:00.000Z", "2026-06-10T00:00:00.000Z"],
      ["Asia/Dubai", "2026-06-10T06:00:00.000Z", "2026-06-10T05:00:00.000Z"],
      ["Asia/Kolkata", "2026-06-10T06:00:00.000Z", "2026-06-10T03:30:00.000Z"],
      ["Europe/Berlin", "2026-06-10T06:00:00.000Z", "2026-06-10T07:00:00.000Z"],
      ["America/New_York", "2026-06-10T12:00:00.000Z", "2026-06-10T13:00:00.000Z"],
      ["America/Los_Angeles", "2026-06-10T15:00:00.000Z", "2026-06-10T16:00:00.000Z"],
      ["Pacific/Auckland", "2026-06-10T00:00:00.000Z", "2026-06-09T21:00:00.000Z"],
    ];

    for (const [tz, dateUtc, expectedUtc] of cases) {
      it("09:00 in " + tz + " resolves to " + expectedUtc, () => {
        const slots = generateSlots(new Date(dateUtc), availability, [], baseEventType, {
          timezone: tz,
          now: new Date("2026-01-01T00:00:00.000Z"),
        });
        expect(slots).toHaveLength(1);
        expect(slots[0].start.toISOString()).toBe(expectedUtc);
        // Round-trip: read back in the host's own zone.
        expect(formatTime(slots[0].start, tz)).toBe("9:00 AM");
        expect(formatDate(slots[0].start, tz)).toContain("10");
      });
    }

    it("an invalid timezone degrades to the host machine local zone", () => {
      const slots = generateSlots(new Date("2026-06-10T12:00:00.000Z"), availability, [], baseEventType, {
        timezone: "Mars/Olympus_Mons",
        now: new Date("2026-01-01T00:00:00.000Z"),
      });
      expect(slots).toHaveLength(1);
      expect(formatTime(slots[0].start, undefined)).toBe("9:00 AM");
    });

    // Across a DST transition the wall-clock time must stay 09:00 local, which
    // means the UTC instant must shift by exactly one hour.
    const dstCases = [
      {
        name: "US spring-forward",
        tz: "America/New_York",
        before: ["2026-03-07", "2026-03-07T14:00:00.000Z"],
        after: ["2026-03-10", "2026-03-10T13:00:00.000Z"],
      },
      {
        name: "US fall-back",
        tz: "America/New_York",
        before: ["2026-10-30", "2026-10-30T13:00:00.000Z"],
        after: ["2026-11-02", "2026-11-02T14:00:00.000Z"],
      },
      {
        name: "EU spring-forward",
        tz: "Europe/Berlin",
        before: ["2026-03-27", "2026-03-27T08:00:00.000Z"],
        after: ["2026-03-30", "2026-03-30T07:00:00.000Z"],
      },
      {
        name: "EU fall-back",
        tz: "Europe/Berlin",
        before: ["2026-10-23", "2026-10-23T07:00:00.000Z"],
        after: ["2026-10-26", "2026-10-26T08:00:00.000Z"],
      },
    ];

    for (const { name, tz, before, after } of dstCases) {
      it("09:00 stays 09:00 across " + name + " (" + tz + ")", () => {
        const opts = { timezone: tz, now: new Date("2026-01-01T00:00:00.000Z") };
        const beforeSlots = generateSlots(
          new Date(before[0] + "T06:00:00.000Z"),
          availability,
          [],
          baseEventType,
          opts
        );
        const afterSlots = generateSlots(
          new Date(after[0] + "T06:00:00.000Z"),
          availability,
          [],
          baseEventType,
          opts
        );
        expect(beforeSlots[0].start.toISOString()).toBe(before[1]);
        expect(afterSlots[0].start.toISOString()).toBe(after[1]);
        // Both must read as 09:00 local despite the shifted instant.
        expect(formatTime(beforeSlots[0].start, tz)).toBe("9:00 AM");
        expect(formatTime(afterSlots[0].start, tz)).toBe("9:00 AM");
      });
    }
  });
});
