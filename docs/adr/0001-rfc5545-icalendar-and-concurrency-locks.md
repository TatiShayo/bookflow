# ADR 0001: RFC 5545 iCalendar Feeds and PostgreSQL Range Exclusions

## Context
Scheduling tools fail when concurrent bookings overlap or calendar sync drops connections.

## Decision
1. **Range Exclusion Invariants**: Database enforces `EXCLUDE USING gist (provider_id WITH =, slot_range WITH &&)`.
2. **RFC 5545 Feed**: Generate native iCalendar feeds supporting VEVENT, UID, and DTSTAMP.
3. **UTC + IANA Timezone Storage**: Retain canonical timezones to survive DST changes.

## Consequences
- **Positive**: Total prevention of double-bookings and seamless Apple/Google/Outlook sync.
- **Negative**: Requires GiST extension on PostgreSQL databases.
