# CONTEXT.md — Ubiquitous Domain Language (BookFlow)

## Core Entities
- **Provider**: A service professional offering bookable appointment windows.
- **BookingSlot**: A distinct time window with start/end UTC timestamps and duration.
- **ExclusionLock**: Database constraint preventing overlapping time ranges for the same provider.
- **ICalendarFeed**: RFC 5545 compliant `.ics` data stream providing live external calendar sync.

## Domain Invariants
- No two confirmed bookings for the same provider may have overlapping `[start, end)` intervals.
- All database timestamps are stored in UTC ISO 8601.
- Providers must declare minimum cancellation lead times (e.g. 24 hours).

## Forbidden Terminology
- Do not call service offerings "events"; use "ServiceType".
- Do not store local formatted times in the database; store UTC.
