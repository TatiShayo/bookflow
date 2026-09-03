import { parseISO, isBefore, differenceInMinutes, isValid } from "date-fns";

export function isValidEmail(email: string): boolean {
  if (!email || typeof email !== "string") return false;
  const trimmed = email.trim();
  // Standard RFC-compliant email regex ensuring non-empty domain, valid TLD
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  return emailRegex.test(trimmed);
}

export function isValidName(name: string): boolean {
  if (!name || typeof name !== "string") return false;
  const trimmed = name.trim();
  return trimmed.length >= 2 && trimmed.length <= 100;
}

export function isValidPhoneNumber(phone?: string | null): boolean {
  if (!phone) return true; // Optional
  const trimmed = phone.trim();
  if (trimmed.length === 0) return true;
  // Allow international phone numbers with digits, spaces, hyphens, plus sign, parentheses
  const phoneRegex = /^[+]?[(]?[0-9]{1,4}[)]?[-\s./0-9]{6,20}$/;
  return phoneRegex.test(trimmed);
}

export function isValidCurrency(currency: string): boolean {
  if (!currency || typeof currency !== "string") return false;
  const validCurrencies = ["USD", "EUR", "GBP", "CAD", "AUD", "INR", "JPY", "CHF", "NZD", "SGD"];
  return validCurrencies.includes(currency.toUpperCase().trim());
}

export function isValidPrice(price: number): boolean {
  return typeof price === "number" && !isNaN(price) && isFinite(price) && price >= 0 && price <= 100000;
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
    if (!startTimeStr || !endTimeStr) {
      return { isValid: false, error: "Start and end times are required" };
    }

    const start = parseISO(startTimeStr);
    const end = parseISO(endTimeStr);

    if (!isValid(start) || !isValid(end) || isNaN(start.getTime()) || isNaN(end.getTime())) {
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
  attendeePhone?: string | null;
  notes?: string | null;
  amountPaid?: number;
  currency?: string;
  stripePaymentIntentId?: string | null;
}

export function validateBookingInput(input: BookingInput, expectedDurationMinutes?: number) {
  const errors: Record<string, string> = {};

  if (!input.eventTypeId || typeof input.eventTypeId !== "string" || input.eventTypeId.trim() === "") {
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

  if (input.attendeePhone && !isValidPhoneNumber(input.attendeePhone)) {
    errors.attendeePhone = "Invalid phone number format";
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

  if (input.currency && !isValidCurrency(input.currency)) {
    errors.currency = "Invalid currency code";
  }

  if (input.amountPaid !== undefined && !isValidPrice(input.amountPaid)) {
    errors.amountPaid = "Invalid amount";
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

export interface AvailabilityWindowInput {
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_available: boolean;
}

export function validateAvailabilityWindows(windows: AvailabilityWindowInput[]): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  for (let i = 0; i < windows.length; i++) {
    const w = windows[i];
    if (w.day_of_week < 0 || w.day_of_week > 6 || !Number.isInteger(w.day_of_week)) {
      errors.push(`Window ${i + 1}: day_of_week must be an integer between 0 and 6`);
    }

    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)(:([0-5]\d))?$/;
    if (!timeRegex.test(w.start_time)) {
      errors.push(`Window ${i + 1}: start_time '${w.start_time}' is not in valid HH:mm or HH:mm:ss format`);
    }
    if (!timeRegex.test(w.end_time)) {
      errors.push(`Window ${i + 1}: end_time '${w.end_time}' is not in valid HH:mm or HH:mm:ss format`);
    }

    if (timeRegex.test(w.start_time) && timeRegex.test(w.end_time)) {
      const [sh, sm] = w.start_time.split(":").map(Number);
      const [eh, em] = w.end_time.split(":").map(Number);
      if (sh * 60 + sm >= eh * 60 + em) {
        errors.push(`Window ${i + 1}: start_time (${w.start_time}) must be earlier than end_time (${w.end_time})`);
      }
    }
  }

  // Check for internal overlaps for the same day
  const byDay: Record<number, AvailabilityWindowInput[]> = {};
  for (const w of windows) {
    if (!w.is_available) continue;
    if (!byDay[w.day_of_week]) byDay[w.day_of_week] = [];
    byDay[w.day_of_week].push(w);
  }

  for (const [day, dayWindows] of Object.entries(byDay)) {
    for (let i = 0; i < dayWindows.length; i++) {
      for (let j = i + 1; j < dayWindows.length; j++) {
        const [s1h, s1m] = dayWindows[i].start_time.split(":").map(Number);
        const [e1h, e1m] = dayWindows[i].end_time.split(":").map(Number);
        const [s2h, s2m] = dayWindows[j].start_time.split(":").map(Number);
        const [e2h, e2m] = dayWindows[j].end_time.split(":").map(Number);

        const start1 = s1h * 60 + s1m;
        const end1 = e1h * 60 + e1m;
        const start2 = s2h * 60 + s2m;
        const end2 = e2h * 60 + e2m;

        if (start1 < end2 && end1 > start2) {
          errors.push(`Day ${day}: Overlapping availability windows [${dayWindows[i].start_time}-${dayWindows[i].end_time}] and [${dayWindows[j].start_time}-${dayWindows[j].end_time}]`);
        }
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validates redirect URL for Open Redirect prevention.
 * Ensures the destination is a safe relative URL starting with / and not // or containing protocols.
 */
export function sanitizeRedirectPath(path: string | null | undefined, fallback: string = "/dashboard"): string {
  if (!path || typeof path !== "string") return fallback;
  const trimmed = path.trim();
  if (
    trimmed.startsWith("/") &&
    !trimmed.startsWith("//") &&
    !trimmed.startsWith("/\\") &&
    !trimmed.includes("://") &&
    !trimmed.includes("javascript:") &&
    !trimmed.includes("data:")
  ) {
    return trimmed;
  }
  return fallback;
}
