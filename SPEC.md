# SPEC 001: Resilient Scheduling Engine & RFC 5545 Sync

## Problem Statement
Independent professionals suffer from double-bookings and complex calendar synchronization across Google, Apple, and Outlook.

## Solution
A Next.js + PostgreSQL booking platform with mathematical double-booking prevention, RFC 5545 calendar feeds, and automated reminder dispatch.

## User Stories
1. As a client, I want to view available slots in my local timezone, so that I can schedule without doing time math.
2. As a provider, I want my appointments synced to my phone calendar via an `.ics` subscription, so that I never miss a meeting.
3. As a provider, I want double-booking mathematically blocked, so that two clients never show up at once.

## Implementation Decisions
- Implement RFC 5545 generator in `src/lib/ics.ts`.
- Time range overlap validation in `src/lib/slots.ts`.
- Cancellation rules in `src/lib/cancellation.ts`.

## Testing Decisions
- Seam: `src/lib/__tests__/ics-feed-generator.test.ts`.
- Verify iCalendar format compliance, escape sequences, and timestamp conversions.
