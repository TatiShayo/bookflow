import { describe, it, expect } from "vitest";
import { isValidEmail, isValidName, isValidSlotRange, validateBookingInput } from "../validation";

describe("Booking creation validation helper functions", () => {
  describe("isValidEmail", () => {
    it("should return true for valid email formats", () => {
      expect(isValidEmail("test@example.com")).toBe(true);
      expect(isValidEmail("user.name+label@sub.domain.co.uk")).toBe(true);
      expect(isValidEmail("a@b.io")).toBe(true);
      expect(isValidEmail("  test@example.com  ")).toBe(true); // Trimming checks
    });

    it("should return false for invalid email formats", () => {
      expect(isValidEmail("plainaddress")).toBe(false);
      expect(isValidEmail("#@%^%#$@#$@#.com")).toBe(false);
      expect(isValidEmail("@example.com")).toBe(false);
      expect(isValidEmail("Joe Smith <email@example.com>")).toBe(false);
      expect(isValidEmail("email.example.com")).toBe(false);
      expect(isValidEmail("email@example@example.com")).toBe(false);
      expect(isValidEmail("email@example")).toBe(false);
    });
  });

  describe("isValidName", () => {
    it("should return true for valid name formats", () => {
      expect(isValidName("John Doe")).toBe(true);
      expect(isValidName("Jane")).toBe(true);
      expect(isValidName("A".repeat(100))).toBe(true);
    });

    it("should return false for invalid names", () => {
      expect(isValidName("")).toBe(false);
      expect(isValidName("   ")).toBe(false);
      expect(isValidName("A")).toBe(false); // too short (length < 2)
      expect(isValidName("A".repeat(101))).toBe(false); // too long (length > 100)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(isValidName(null as any)).toBe(false);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(isValidName(undefined as any)).toBe(false);
    });
  });

  describe("isValidSlotRange", () => {
    it("should return true for valid slot ranges and expected durations", () => {
      const result = isValidSlotRange(
        "2026-06-30T10:00:00.000Z",
        "2026-06-30T10:30:00.000Z",
        30
      );
      expect(result.isValid).toBe(true);
    });

    it("should return true when duration matches expected duration even if it is not 30m", () => {
      const result = isValidSlotRange(
        "2026-06-30T10:00:00.000Z",
        "2026-06-30T11:00:00.000Z",
        60
      );
      expect(result.isValid).toBe(true);
    });

    it("should return false for invalid date formats", () => {
      const result = isValidSlotRange("invalid-date", "2026-06-30T10:30:00.000Z");
      expect(result.isValid).toBe(false);
      expect(result.error).toContain("Invalid date format");
    });

    it("should return false when start time is after or equal to end time", () => {
      const result = isValidSlotRange(
        "2026-06-30T10:30:00.000Z",
        "2026-06-30T10:00:00.000Z"
      );
      expect(result.isValid).toBe(false);
      expect(result.error).toContain("Start time must be before end time");

      const sameResult = isValidSlotRange(
        "2026-06-30T10:00:00.000Z",
        "2026-06-30T10:00:00.000Z"
      );
      expect(sameResult.isValid).toBe(false);
    });

    it("should return false when duration does not match expected duration", () => {
      const result = isValidSlotRange(
        "2026-06-30T10:00:00.000Z",
        "2026-06-30T10:45:00.000Z",
        30
      );
      expect(result.isValid).toBe(false);
      expect(result.error).toContain("duration of 45 minutes does not match expected duration of 30 minutes");
    });
  });

  describe("validateBookingInput", () => {
    it("should return true and no errors for a fully valid booking input", () => {
      const input = {
        eventTypeId: "event-123",
        attendeeName: "Jane Doe",
        attendeeEmail: "jane@example.com",
        startTime: "2026-06-30T10:00:00.000Z",
        endTime: "2026-06-30T10:30:00.000Z",
      };
      const result = validateBookingInput(input, 30);
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual({});
    });

    it("should return errors for missing required fields", () => {
      const input = {
        eventTypeId: "",
        attendeeName: "",
        attendeeEmail: "",
        startTime: "",
        endTime: "",
      };
      const result = validateBookingInput(input);
      expect(result.isValid).toBe(false);
      expect(result.errors.eventTypeId).toBe("Event type ID is required");
      expect(result.errors.attendeeName).toBe("Name is required");
      expect(result.errors.attendeeEmail).toBe("Email is required");
      expect(result.errors.startTime).toBe("Start time is required");
      expect(result.errors.endTime).toBe("End time is required");
    });

    it("should return errors for invalid email, short name, and mismatched slot duration", () => {
      const input = {
        eventTypeId: "event-123",
        attendeeName: "J",
        attendeeEmail: "invalid-email",
        startTime: "2026-06-30T10:00:00.000Z",
        endTime: "2026-06-30T10:45:00.000Z",
      };
      const result = validateBookingInput(input, 30);
      expect(result.isValid).toBe(false);
      expect(result.errors.attendeeName).toBe("Name must be between 2 and 100 characters");
      expect(result.errors.attendeeEmail).toBe("Invalid email address");
      expect(result.errors.slotRange).toContain("duration of 45 minutes does not match expected duration of 30 minutes");
    });
  });
});
