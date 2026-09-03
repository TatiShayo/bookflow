import { describe, it, expect } from "vitest";
import {
  SITE_NAME,
  SITE_TAGLINE,
  SITE_URL,
  DURATIONS,
  COLORS,
  BUFFER_TIMES,
  DAYS,
  FREE_TIER_EVENT_LIMIT,
  CURRENCIES,
} from "../constants";
import { cn } from "../utils";

describe("Constants and Utility Functions", () => {
  describe("cn (tailwind merge utility)", () => {
    it("should merge basic class names correctly", () => {
      expect(cn("class1", "class2")).toBe("class1 class2");
    });

    it("should resolve tailwind conflicting classes", () => {
      expect(cn("p-4", "p-8")).toBe("p-8");
      expect(cn("text-red-500", "text-blue-500")).toBe("text-blue-500");
    });

    it("should handle conditional and falsy values", () => {
      expect(cn("base", false && "hidden", null, undefined, "extra")).toBe("base extra");
    });
  });

  describe("System Constants", () => {
    it("should have expected site metadata constants", () => {
      expect(SITE_NAME).toBe("BookFlow");
      expect(SITE_TAGLINE).toContain("Get booked and paid");
      expect(SITE_URL).toBeDefined();
    });

    it("should define standard duration options in ascending order", () => {
      expect(DURATIONS.length).toBeGreaterThanOrEqual(5);
      const values = DURATIONS.map((d) => d.value);
      for (let i = 1; i < values.length; i++) {
        expect(values[i]).toBeGreaterThan(values[i - 1]);
      }
      expect(values).toContain(15);
      expect(values).toContain(30);
      expect(values).toContain(60);
    });

    it("should define theme colors with label and hex", () => {
      expect(COLORS.length).toBeGreaterThanOrEqual(6);
      for (const color of COLORS) {
        expect(color.label).toBeDefined();
        expect(color.value).toMatch(/^#[0-9a-fA-F]{6}$/);
      }
    });

    it("should define valid buffer times starting with 0", () => {
      expect(BUFFER_TIMES).toContain(0);
      expect(BUFFER_TIMES).toContain(15);
      expect(BUFFER_TIMES).toContain(30);
    });

    it("should define 7 days of the week in standard Sunday-first order", () => {
      expect(DAYS).toHaveLength(7);
      expect(DAYS[0]).toBe("Sunday");
      expect(DAYS[6]).toBe("Saturday");
    });

    it("should define free tier event limit as 3", () => {
      expect(FREE_TIER_EVENT_LIMIT).toBe(3);
    });

    it("should define major world currencies", () => {
      const currencyCodes = CURRENCIES.map((c) => c.value);
      expect(currencyCodes).toContain("USD");
      expect(currencyCodes).toContain("EUR");
      expect(currencyCodes).toContain("GBP");
      expect(currencyCodes).toContain("CAD");
      expect(currencyCodes).toContain("AUD");
      expect(currencyCodes).toContain("INR");
    });
  });
});
