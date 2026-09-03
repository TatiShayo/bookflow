/**
 * RFC 5545 Compliant iCalendar (.ics) Generator for BookFlow.
 * Supports timezone handling, line folding (max 75 octets), and character escaping.
 */

export interface CalendarEventInput {
  uid: string;
  summary: string;
  description?: string;
  location?: string;
  start: Date;
  end: Date;
  url?: string;
  organizerEmail?: string;
}

function formatIcsDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function escapeIcsText(str: string): string {
  return str
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

function foldLine(line: string): string {
  const MAX_LEN = 75;
  if (line.length <= MAX_LEN) return line;

  const parts: string[] = [];
  let remaining = line;

  parts.push(remaining.slice(0, MAX_LEN));
  remaining = remaining.slice(MAX_LEN);

  while (remaining.length > 0) {
    // Continuation lines start with a single whitespace
    parts.push(" " + remaining.slice(0, MAX_LEN - 1));
    remaining = remaining.slice(MAX_LEN - 1);
  }

  return parts.join("\r\n");
}

export function generateIcsCalendar(events: CalendarEventInput[]): string {
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//BookFlow//Calendar Feed//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
  ];

  const nowStamp = formatIcsDate(new Date());

  for (const ev of events) {
    lines.push("BEGIN:VEVENT");
    lines.push(`UID:${ev.uid}`);
    lines.push(`DTSTAMP:${nowStamp}`);
    lines.push(`DTSTART:${formatIcsDate(ev.start)}`);
    lines.push(`DTEND:${formatIcsDate(ev.end)}`);
    lines.push(`SUMMARY:${escapeIcsText(ev.summary)}`);

    if (ev.description) {
      lines.push(`DESCRIPTION:${escapeIcsText(ev.description)}`);
    }
    if (ev.location) {
      lines.push(`LOCATION:${escapeIcsText(ev.location)}`);
    }
    if (ev.url) {
      lines.push(`URL:${ev.url}`);
    }
    if (ev.organizerEmail) {
      lines.push(`ORGANIZER;CN=Host:mailto:${ev.organizerEmail}`);
    }
    lines.push("STATUS:CONFIRMED");
    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");

  return lines.map(foldLine).join("\r\n") + "\r\n";
}
