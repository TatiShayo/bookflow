import { describe, it, expect } from "vitest";
import {
  canCancelBooking,
  calculateCancellationRefund,
  isAuthorizedToCancel,
  DEFAULT_CANCELLATION_POLICY,
  CancellationPolicy,
} from "../cancellation";

describe("Booking Cancellation & Refund Policy Engine", () => {
  const now = new Date("2026-06-30T12:00:00.000Z");

  describe("canCancelBooking", () => {
    it("should allow cancellation when booking is well in the future (e.g. 48 hours away)", () => {
      const futureBooking = {
        start_time: "2026-07-02T12:00:00.000Z",
        status: "confirmed",
      };
      const result = canCancelBooking(futureBooking, DEFAULT_CANCELLATION_POLICY, now);
      expect(result.canCancel).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it("should reject cancellation if booking is already marked cancelled", () => {
      const cancelledBooking = {
        start_time: "2026-07-02T12:00:00.000Z",
        status: "cancelled",
      };
      const result = canCancelBooking(cancelledBooking, DEFAULT_CANCELLATION_POLICY, now);
      expect(result.canCancel).toBe(false);
      expect(result.reason).toContain("already cancelled");
    });

    it("should reject cancellation if booking is in the past", () => {
      const pastBooking = {
        start_time: "2026-06-29T10:00:00.000Z",
        status: "confirmed",
      };
      const result = canCancelBooking(pastBooking, DEFAULT_CANCELLATION_POLICY, now);
      expect(result.canCancel).toBe(false);
      expect(result.reason).toContain("already started or passed");
    });

    it("should reject cancellation if within minimum notice window (e.g. 30 minutes away when 60m required)", () => {
      const imminentBooking = {
        start_time: "2026-06-30T12:30:00.000Z", // 30 mins away
        status: "confirmed",
      };
      const result = canCancelBooking(imminentBooking, DEFAULT_CANCELLATION_POLICY, now);
      expect(result.canCancel).toBe(false);
      expect(result.reason).toContain("at least 1 hour(s)");
    });

    it("should reject cancellation for invalid date strings", () => {
      const invalidBooking = {
        start_time: "not-a-date",
        status: "confirmed",
      };
      const result = canCancelBooking(invalidBooking, DEFAULT_CANCELLATION_POLICY, now);
      expect(result.canCancel).toBe(false);
      expect(result.reason).toContain("Invalid booking start time");
    });
  });

  describe("calculateCancellationRefund", () => {
    it("should return zero refund for a free event ($0)", () => {
      const freeBooking = {
        start_time: "2026-07-05T12:00:00.000Z",
        amount_paid: 0,
        currency: "USD",
      };
      const refund = calculateCancellationRefund(freeBooking, DEFAULT_CANCELLATION_POLICY, now);
      expect(refund.eligibleForRefund).toBe(false);
      expect(refund.refundAmount).toBe(0);
      expect(refund.reason).toContain("Free booking");
    });

    it("should grant 100% full refund when cancelled >= 24 hours in advance", () => {
      const paidBooking = {
        start_time: "2026-07-02T12:00:00.000Z", // 48 hours away
        amount_paid: 120.0,
        currency: "USD",
      };
      const refund = calculateCancellationRefund(paidBooking, DEFAULT_CANCELLATION_POLICY, now);
      expect(refund.eligibleForRefund).toBe(true);
      expect(refund.refundPercentage).toBe(100);
      expect(refund.refundAmount).toBe(120.0);
      expect(refund.currency).toBe("USD");
      expect(refund.reason).toContain("Full refund applied");
    });

    it("should grant 50% partial refund when cancelled between 12 and 24 hours in advance", () => {
      const paidBooking = {
        start_time: "2026-07-01T04:00:00.000Z", // 16 hours away
        amount_paid: 100.0,
        currency: "USD",
      };
      const refund = calculateCancellationRefund(paidBooking, DEFAULT_CANCELLATION_POLICY, now);
      expect(refund.eligibleForRefund).toBe(true);
      expect(refund.refundPercentage).toBe(50);
      expect(refund.refundAmount).toBe(50.0);
      expect(refund.reason).toContain("50% partial refund");
    });

    it("should deny refund when cancelled less than 12 hours in advance", () => {
      const paidBooking = {
        start_time: "2026-06-30T18:00:00.000Z", // 6 hours away
        amount_paid: 200.0,
        currency: "EUR",
      };
      const refund = calculateCancellationRefund(paidBooking, DEFAULT_CANCELLATION_POLICY, now);
      expect(refund.eligibleForRefund).toBe(false);
      expect(refund.refundPercentage).toBe(0);
      expect(refund.refundAmount).toBe(0);
      expect(refund.currency).toBe("EUR");
      expect(refund.reason).toContain("Non-refundable under policy");
    });

    it("should respect custom cancellation policy parameters", () => {
      const strictPolicy: CancellationPolicy = {
        noticeHoursFullRefund: 72, // 3 days for full refund
        noticeHoursPartialRefund: 48, // 2 days for partial refund
        partialRefundPercentage: 25,
      };

      const paidBooking = {
        start_time: "2026-07-02T12:00:00.000Z", // 48 hours away (qualifies for 25% under strict policy)
        amount_paid: 200.0,
        currency: "USD",
      };

      const refund = calculateCancellationRefund(paidBooking, strictPolicy, now);
      expect(refund.eligibleForRefund).toBe(true);
      expect(refund.refundPercentage).toBe(25);
      expect(refund.refundAmount).toBe(50.0);
    });
  });

  describe("isAuthorizedToCancel", () => {
    const hostUserId = "host-uuid-1234";

    it("should authorize when caller is the authenticated host", () => {
      expect(isAuthorizedToCancel(hostUserId, "host-uuid-1234", null, null)).toBe(true);
    });

    it("should reject when caller is an authenticated user who does not own the host account", () => {
      expect(isAuthorizedToCancel(hostUserId, "evil-user-uuid", null, null)).toBe(false);
    });

    it("should authorize attendee with matching cancellation token", () => {
      const validToken = "secure-cancellation-token-xyz";
      expect(isAuthorizedToCancel(hostUserId, null, validToken, validToken)).toBe(true);
    });

    it("should reject attendee with mismatched cancellation token", () => {
      expect(isAuthorizedToCancel(hostUserId, null, "wrong-token", "expected-token")).toBe(false);
    });

    it("should reject empty or null cancellation tokens", () => {
      expect(isAuthorizedToCancel(hostUserId, null, "", "")).toBe(false);
      expect(isAuthorizedToCancel(hostUserId, null, null, null)).toBe(false);
    });
  });
});
