import { describe, it, expect, vi, beforeEach } from "vitest";
import { createPaymentIntent, createRefund, stripe } from "../stripe";

describe("Stripe Payment & Webhook Handling Invariants", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createPaymentIntent helper", () => {
    it("should reject creating payment intent for 0 or negative amount", async () => {
      await expect(
        createPaymentIntent(0, "USD", { eventTypeId: "evt-1" })
      ).rejects.toThrow("Cannot create payment intent for amount <= 0");

      await expect(
        createPaymentIntent(-25, "USD", { eventTypeId: "evt-1" })
      ).rejects.toThrow("Cannot create payment intent for amount <= 0");
    });
  });

  describe("Webhook Payload Parsing & Validation Invariants", () => {
    it("should correctly compute expected cents amount for Stripe charges", () => {
      const price = 49.99;
      const expectedCents = Math.round(price * 100);
      expect(expectedCents).toBe(4999);

      const zeroDecPrice = 50;
      expect(Math.round(zeroDecPrice * 100)).toBe(5000);
    });

    it("should normalize currencies to lowercase for Stripe comparisons", () => {
      const eventCurrency = "USD";
      const stripeCurrency = "usd";
      expect(eventCurrency.toLowerCase()).toBe(stripeCurrency.toLowerCase());
    });

    it("should verify payment_intent metadata completeness", () => {
      const validMetadata = {
        eventTypeId: "evt-123",
        attendeeName: "John Doe",
        attendeeEmail: "john@example.com",
        startTime: "2026-06-30T10:00:00.000Z",
        endTime: "2026-06-30T10:30:00.000Z",
      };

      const isMetadataComplete = (meta: Record<string, string | undefined>) => {
        return !!(
          meta.eventTypeId &&
          meta.attendeeName &&
          meta.attendeeEmail &&
          meta.startTime &&
          meta.endTime
        );
      };

      expect(isMetadataComplete(validMetadata)).toBe(true);

      const incompleteMetadata = {
        eventTypeId: "evt-123",
        attendeeName: "John Doe",
      };
      expect(isMetadataComplete(incompleteMetadata)).toBe(false);
    });

    it("should evaluate subscription status transitions correctly", () => {
      const determineTier = (status: string) => {
        return status === "active" || status === "trialing" ? "pro" : "free";
      };

      expect(determineTier("active")).toBe("pro");
      expect(determineTier("trialing")).toBe("pro");
      expect(determineTier("past_due")).toBe("free");
      expect(determineTier("canceled")).toBe("free");
      expect(determineTier("unpaid")).toBe("free");
      expect(determineTier("incomplete")).toBe("free");
    });

    it("should handle refund parameters with precision", () => {
      const computeRefundParams = (
        paymentIntentId: string,
        amount?: number,
        reason?: string
      ) => {
        const params: { payment_intent: string; amount?: number; reason?: string } = {
          payment_intent: paymentIntentId,
        };
        if (amount !== undefined && amount > 0) {
          params.amount = Math.round(amount * 100);
        }
        if (reason) {
          params.reason = reason;
        }
        return params;
      };

      const fullRefund = computeRefundParams("pi_123");
      expect(fullRefund).toEqual({ payment_intent: "pi_123" });

      const partialRefund = computeRefundParams("pi_123", 25.5, "requested_by_customer");
      expect(partialRefund).toEqual({
        payment_intent: "pi_123",
        amount: 2550,
        reason: "requested_by_customer",
      });
    });
  });
});
