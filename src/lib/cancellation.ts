import { differenceInMinutes, parseISO, isValid, isBefore } from "date-fns";

export interface CancellationPolicy {
  /** Minimum hours before booking start to receive a 100% full refund */
  noticeHoursFullRefund?: number;
  /** Minimum hours before booking start to receive a partial refund */
  noticeHoursPartialRefund?: number;
  /** Partial refund percentage (0-100) */
  partialRefundPercentage?: number;
  /** Minimum minutes before booking start to allow cancellation at all */
  minNoticeMinutesToCancel?: number;
}

export const DEFAULT_CANCELLATION_POLICY: CancellationPolicy = {
  noticeHoursFullRefund: 24,
  noticeHoursPartialRefund: 12,
  partialRefundPercentage: 50,
  minNoticeMinutesToCancel: 60, // 1 hour minimum notice
};

export interface CancellationRefundResult {
  eligibleForRefund: boolean;
  refundPercentage: number;
  refundAmount: number;
  currency: string;
  reason: string;
}

export function canCancelBooking(
  booking: {
    start_time: string;
    status: string;
  },
  policy: CancellationPolicy = DEFAULT_CANCELLATION_POLICY,
  now: Date = new Date()
): { canCancel: boolean; reason?: string } {
  if (booking.status === "cancelled") {
    return { canCancel: false, reason: "Booking is already cancelled." };
  }

  const startTime = parseISO(booking.start_time);
  if (!isValid(startTime)) {
    return { canCancel: false, reason: "Invalid booking start time." };
  }

  if (isBefore(startTime, now)) {
    return { canCancel: false, reason: "Cannot cancel a booking that has already started or passed." };
  }

  const minutesUntilStart = differenceInMinutes(startTime, now);
  const minNotice = policy.minNoticeMinutesToCancel ?? 60;

  if (minutesUntilStart < minNotice) {
    return {
      canCancel: false,
      reason: `Cancellations must be made at least ${minNotice >= 60 ? `${minNotice / 60} hour(s)` : `${minNotice} minutes`} before start time.`,
    };
  }

  return { canCancel: true };
}

export function calculateCancellationRefund(
  booking: {
    start_time: string;
    amount_paid: number;
    currency: string;
  },
  policy: CancellationPolicy = DEFAULT_CANCELLATION_POLICY,
  now: Date = new Date()
): CancellationRefundResult {
  const amountPaid = Number(booking.amount_paid) || 0;
  const currency = booking.currency || "USD";

  if (amountPaid <= 0) {
    return {
      eligibleForRefund: false,
      refundPercentage: 0,
      refundAmount: 0,
      currency,
      reason: "Free booking - no payment was made.",
    };
  }

  const startTime = parseISO(booking.start_time);
  if (!isValid(startTime)) {
    return {
      eligibleForRefund: false,
      refundPercentage: 0,
      refundAmount: 0,
      currency,
      reason: "Invalid booking start time.",
    };
  }

  const minutesUntilStart = differenceInMinutes(startTime, now);
  const fullRefundMinutes = (policy.noticeHoursFullRefund ?? 24) * 60;
  const partialRefundMinutes = (policy.noticeHoursPartialRefund ?? 12) * 60;
  const partialPercent = policy.partialRefundPercentage ?? 50;

  if (minutesUntilStart >= fullRefundMinutes) {
    return {
      eligibleForRefund: true,
      refundPercentage: 100,
      refundAmount: amountPaid,
      currency,
      reason: `Cancelled more than ${policy.noticeHoursFullRefund ?? 24} hours in advance. Full refund applied.`,
    };
  }

  if (minutesUntilStart >= partialRefundMinutes) {
    const refundAmount = Math.round(((amountPaid * partialPercent) / 100) * 100) / 100;
    return {
      eligibleForRefund: true,
      refundPercentage: partialPercent,
      refundAmount,
      currency,
      reason: `Cancelled between ${policy.noticeHoursPartialRefund ?? 12} and ${policy.noticeHoursFullRefund ?? 24} hours in advance. ${partialPercent}% partial refund applied.`,
    };
  }

  return {
    eligibleForRefund: false,
    refundPercentage: 0,
    refundAmount: 0,
    currency,
    reason: `Cancelled less than ${policy.noticeHoursPartialRefund ?? 12} hours in advance. Non-refundable under policy.`,
  };
}

export function isAuthorizedToCancel(
  hostUserId: string,
  currentUserId?: string | null,
  cancellationToken?: string | null,
  expectedCancellationToken?: string | null
): boolean {
  // Host is authenticated and owns the event
  if (currentUserId && currentUserId === hostUserId) {
    return true;
  }

  // Attendee provided a matching cancellation token
  if (
    cancellationToken &&
    expectedCancellationToken &&
    cancellationToken.trim() !== "" &&
    cancellationToken === expectedCancellationToken
  ) {
    return true;
  }

  return false;
}
