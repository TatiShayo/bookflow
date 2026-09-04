# TICKETS — BookFlow Scheduling Engine

## [TICKET-001] RFC 5545 iCalendar Subscription Feed Generator
- **Blocked by**: None
- **Delivers**: Standard iCalendar `.ics` endpoint with VEVENT and timezone definitions.
- **Verification**: `src/lib/__tests__/ics-feed-generator.test.ts`

## [TICKET-002] Concurrency Range Exclusion Lock
- **Blocked by**: TICKET-001
- **Delivers**: Database-level constraint blocking overlapping bookings for a provider.
- **Verification**: Concurrent reservation unit tests asserting 409 Conflict.

## [TICKET-003] IANA Timezone Normalization Engine
- **Blocked by**: TICKET-002
- **Delivers**: Automatic client-to-provider timezone conversion with DST resilience.
- **Verification**: `src/lib/__tests__/timezone-dst.test.ts`
