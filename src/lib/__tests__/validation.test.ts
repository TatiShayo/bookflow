import { describe, it, expect } from "vitest";
import {
  isValidEmail,
  isValidName,
  isValidPhoneNumber,
  isValidCurrency,
  isValidPrice,
  isValidSlotRange,
  validateBookingInput,
  validateAvailabilityWindows,
  sanitizeRedirectPath,
} from "../validation";

describe("Validation and Security Sanitization Suite", () => {
  describe("isValidEmail", () => {
    it("should return true for valid standard and edge-case emails", () => {
      expect(isValidEmail("test@example.com")).toBe(true);
      expect(isValidEmail("user.name+tag@sub.domain.co.uk")).toBe(true);
      expect(isValidEmail("first.last@company.org")).toBe(true);
      expect(isValidEmail("a@b.io")).toBe(true);
      expect(isValidEmail("  test@example.com  ")).toBe(true);
    });

    it("should return false for invalid emails", () => {
      expect(isValidEmail("")).toBe(false);
      expect(isValidEmail("plainaddress")).toBe(false);
      expect(isValidEmail("@missingusername.com")).toBe(false);
      expect(isValidEmail("missingdomain@")).toBe(false);
      expect(isValidEmail("missingdomain@.com")).toBe(false);
      expect(isValidEmail("spaces in@email.com")).toBe(false);
      expect(isValidEmail("double@@example.com")).toBe(false);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(isValidEmail(null as any)).toBe(false);
    });
  });

  describe("isValidName", () => {
    it("should return true for valid names between 2 and 100 characters", () => {
      expect(isValidName("John Doe")).toBe(true);
      expect(isValidName("Jo")).toBe(true);
      expect(isValidName("Dr. Jane Smith-O'Connor")).toBe(true);
      expect(isValidName("A".repeat(100))).toBe(true);
    });

    it("should return false for empty, whitespace-only, or invalid length names", () => {
      expect(isValidName("")).toBe(false);
      expect(isValidName("   ")).toBe(false);
      expect(isValidName("A")).toBe(false);
      expect(isValidName("A".repeat(101))).toBe(false);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(isValidName(null as any)).toBe(false);
    });
  });

  describe("isValidPhoneNumber", () => {
    it("should return true for valid phone formats or undefined/null", () => {
      expect(isValidPhoneNumber("+1 555-0199")).toBe(true);
      expect(isValidPhoneNumber("+44 20 7946 0991")).toBe(true);
      expect(isValidPhoneNumber("(555) 123-4567")).toBe(true);
      expect(isValidPhoneNumber(null)).toBe(true);
      expect(isValidPhoneNumber("")).toBe(true);
    });

    it("should return false for invalid phone numbers", () => {
      expect(isValidPhoneNumber("abc-def-ghij")).toBe(false);
      expect(isValidPhoneNumber("123")).toBe(false); // too short
    });
  });

  describe("isValidCurrency & isValidPrice", () => {
    it("should validate recognized 3-letter currency codes", () => {
      expect(isValidCurrency("USD")).toBe(true);
      expect(isValidCurrency("eur")).toBe(true);
      expect(isValidCurrency("GBP")).toBe(true);
      expect(isValidCurrency("cad")).toBe(true);
      expect(isValidCurrency("AUD")).toBe(true);
      expect(isValidCurrency("INR")).toBe(true);
      expect(isValidCurrency("INVALID")).toBe(false);
      expect(isValidCurrency("")).toBe(false);
    });

    it("should validate prices within reasonable non-negative bounds", () => {
      expect(isValidPrice(0)).toBe(true);
      expect(isValidPrice(49.99)).toBe(true);
      expect(isValidPrice(1000)).toBe(true);
      expect(isValidPrice(-5)).toBe(false);
      expect(isValidPrice(NaN)).toBe(false);
      expect(isValidPrice(Infinity)).toBe(false);
    });
  });

  describe("isValidSlotRange", () => {
    it("should validate slot ranges matching expected duration", () => {
      const result = isValidSlotRange(
        "2026-06-30T10:00:00.000Z",
        "2026-06-30T10:30:00.000Z",
        30
      );
      expect(result.isValid).toBe(true);
    });

    it("should reject start time >= end time", () => {
      const result = isValidSlotRange(
        "2026-06-30T10:30:00.000Z",
        "2026-06-30T10:00:00.000Z",
        30
      );
      expect(result.isValid).toBe(false);
      expect(result.error).toContain("Start time must be before end time");
    });

    it("should reject duration mismatch", () => {
      const result = isValidSlotRange(
        "2026-06-30T10:00:00.000Z",
        "2026-06-30T11:00:00.000Z",
        30
      );
      expect(result.isValid).toBe(false);
      expect(result.error).toContain("does not match expected duration");
    });

    it("should reject malformed date inputs", () => {
      const result = isValidSlotRange("corrupt-date", "2026-06-30T10:30:00.000Z");
      expect(result.isValid).toBe(false);
      expect(result.error).toContain("Invalid date format");
    });
  });

  describe("validateBookingInput", () => {
    it("should pass for complete valid input", () => {
      const input = {
        eventTypeId: "evt-100",
        attendeeName: "Sarah Connor",
        attendeeEmail: "sarah@resistance.org",
        startTime: "2026-06-30T14:00:00.000Z",
        endTime: "2026-06-30T14:30:00.000Z",
        amountPaid: 0,
        currency: "USD",
      };
      const result = validateBookingInput(input, 30);
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual({});
    });

    it("should collect all validation errors when required fields are missing or invalid", () => {
      const input = {
        eventTypeId: "",
        attendeeName: "S",
        attendeeEmail: "bad-email",
        startTime: "",
        endTime: "",
      };
      const result = validateBookingInput(input);
      expect(result.isValid).toBe(false);
      expect(result.errors.eventTypeId).toBeDefined();
      expect(result.errors.attendeeName).toBeDefined();
      expect(result.errors.attendeeEmail).toBeDefined();
      expect(result.errors.startTime).toBeDefined();
      expect(result.errors.endTime).toBeDefined();
    });
  });

  describe("validateAvailabilityWindows", () => {
    it("should pass for valid non-overlapping availability windows", () => {
      const windows = [
        { day_of_week: 1, start_time: "09:00", end_time: "12:00", is_available: true },
        { day_of_week: 1, start_time: "13:00", end_time: "17:00", is_available: true },
        { day_of_week: 2, start_time: "10:00", end_time: "18:00", is_available: true },
      ];
      const result = validateAvailabilityWindows(windows);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should reject windows where start_time >= end_time", () => {
      const windows = [
        { day_of_week: 1, start_time: "17:00", end_time: "09:00", is_available: true },
      ];
      const result = validateAvailabilityWindows(windows);
      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain("must be earlier than end_time");
    });

    it("should reject overlapping windows on the same day", () => {
      const windows = [
        { day_of_week: 2, start_time: "09:00", end_time: "13:00", is_available: true },
        { day_of_week: 2, start_time: "12:00", end_time: "17:00", is_available: true },
      ];
      const result = validateAvailabilityWindows(windows);
      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain("Overlapping availability windows");
    });
  });

  describe("sanitizeRedirectPath (Open Redirect Prevention)", () => {
    it("should allow safe relative paths", () => {
      expect(sanitizeRedirectPath("/dashboard")).toBe("/dashboard");
      expect(sanitizeRedirectPath("/dashboard/events/new")).toBe("/dashboard/events/new");
      expect(sanitizeRedirectPath("/book/username")).toBe("/book/username");
    });

    it("should neutralize evil external URLs, schemes, and protocol-relative links", () => {
      expect(sanitizeRedirectPath("https://evil.com")).toBe("/dashboard");
      expect(sanitizeRedirectPath("http://evil.com/phishing")).toBe("/dashboard");
      expect(sanitizeRedirectPath("//evil.com")).toBe("/dashboard");
      expect(sanitizeRedirectPath("/\\evil.com")).toBe("/dashboard");
      expect(sanitizeRedirectPath("javascript:alert(1)")).toBe("/dashboard");
      expect(sanitizeRedirectPath("data:text/html,<script>evil</script>")).toBe("/dashboard");
      expect(sanitizeRedirectPath(null)).toBe("/dashboard");
      expect(sanitizeRedirectPath("")).toBe("/dashboard");
    });

    it("should use custom fallback if provided", () => {
      expect(sanitizeRedirectPath("https://evil.com", "/custom-fallback")).toBe("/custom-fallback");
    });
  });
});
