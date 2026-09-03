import { describe, it, expect } from "vitest";
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
});
