import { describe, it, expect } from "vitest";
import { generateIcsCalendar, type CalendarEventInput } from "../ics";

describe("RFC 5545 iCalendar Feed Generator", () => {
  it("generates a syntactically valid VCALENDAR with VEVENT blocks", () => {
    const start = new Date("2026-10-15T14:00:00Z");
    const end = new Date("2026-10-15T15:00:00Z");

    const events: CalendarEventInput[] = [
      {
        uid: "booking_101@bookflow.io",
        summary: "Strategy Consultation",
        description: "Quarterly product and market review.",
        location: "Google Meet",
        start,
        end,
        organizerEmail: "host@company.com",
      },
    ];

    const ics = generateIcsCalendar(events);

    expect(ics).toContain("BEGIN:VCALENDAR");
    expect(ics).toContain("VERSION:2.0");
    expect(ics).toContain("BEGIN:VEVENT");
    expect(ics).toContain("UID:booking_101@bookflow.io");
    expect(ics).toContain("SUMMARY:Strategy Consultation");
    expect(ics).toContain("ORGANIZER;CN=Host:mailto:host@company.com");
    expect(ics).toContain("STATUS:CONFIRMED");
    expect(ics).toContain("END:VEVENT");
    expect(ics).toContain("END:VCALENDAR");
    expect(ics.endsWith("\r\n")).toBe(true);
  });

  it("escapes special characters like commas, semicolons, and newlines", () => {
    const start = new Date("2026-10-15T14:00:00Z");
    const end = new Date("2026-10-15T14:30:00Z");

    const events: CalendarEventInput[] = [
      {
        uid: "booking_special@bookflow.io",
        summary: "Meeting: Alice, Bob; & Charlie",
        description: "Line 1\nLine 2 with ; semicolon and , comma",
        start,
        end,
      },
    ];

    const ics = generateIcsCalendar(events);

    expect(ics).toContain("Meeting: Alice\\, Bob\\; & Charlie");
    expect(ics).toContain("Line 1\\nLine 2 with \\; semicolon and \\, comma");
  });

  it("properly folds lines exceeding 75 octets according to RFC 5545 §3.1", () => {
    const start = new Date("2026-10-15T14:00:00Z");
    const end = new Date("2026-10-15T15:00:00Z");

    const events: CalendarEventInput[] = [
      {
        uid: "booking_long@bookflow.io",
        summary: "A very long event title that will easily surpass the standard seventy-five octet line limitation in RFC 5545",
        start,
        end,
      },
    ];

    const ics = generateIcsCalendar(events);
    const lines = ics.split("\r\n");

    for (const line of lines) {
      expect(line.length).toBeLessThanOrEqual(75);
    }
  });
});
