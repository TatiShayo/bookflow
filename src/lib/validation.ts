import { parseISO, isBefore, differenceInMinutes } from "date-fns";

export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
}

export function isValidName(name: string): boolean {
  if (!name || typeof name !== "string") return false;
  const trimmed = name.trim();
  return trimmed.length >= 2 && trimmed.length <= 100;
}

export interface SlotRangeValidationResult {
  isValid: boolean;
  error?: string;
}

export function isValidSlotRange(
  startTimeStr: string,
  endTimeStr: string,
  expectedDurationMinutes?: number
): SlotRangeValidationResult {
  try {
    const start = parseISO(startTimeStr);
    const end = parseISO(endTimeStr);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return { isValid: false, error: "Invalid date format" };
    }

    if (!isBefore(start, end)) {
      return { isValid: false, error: "Start time must be before end time" };
    }

    if (expectedDurationMinutes !== undefined) {
      const duration = differenceInMinutes(end, start);
      if (duration !== expectedDurationMinutes) {
        return {
          isValid: false,
          error: `Slot duration of ${duration} minutes does not match expected duration of ${expectedDurationMinutes} minutes`,
        };
      }
    }

    return { isValid: true };
  } catch {
    return { isValid: false, error: "Validation failed due to invalid dates" };
  }
}

export interface BookingInput {
  eventTypeId: string;
  attendeeName: string;
  attendeeEmail: string;
  startTime: string;
  endTime: string;
}

export function validateBookingInput(input: BookingInput, expectedDurationMinutes?: number) {
  const errors: Record<string, string> = {};

  if (!input.eventTypeId) {
    errors.eventTypeId = "Event type ID is required";
  }

  if (!input.attendeeName) {
    errors.attendeeName = "Name is required";
  } else if (!isValidName(input.attendeeName)) {
    errors.attendeeName = "Name must be between 2 and 100 characters";
  }

  if (!input.attendeeEmail) {
    errors.attendeeEmail = "Email is required";
  } else if (!isValidEmail(input.attendeeEmail)) {
    errors.attendeeEmail = "Invalid email address";
  }

  if (!input.startTime) {
    errors.startTime = "Start time is required";
  }

  if (!input.endTime) {
    errors.endTime = "End time is required";
  }

  if (input.startTime && input.endTime) {
    const rangeResult = isValidSlotRange(input.startTime, input.endTime, expectedDurationMinutes);
    if (!rangeResult.isValid) {
      errors.slotRange = rangeResult.error || "Invalid slot range";
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}
