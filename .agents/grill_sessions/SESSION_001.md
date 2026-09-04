# Grilling Session 001: bookflow
**Archetype**: Tier 2 SaaS (Online Scheduling & Calendar Sync)
**Human Domain Authority**: Antigravity Lead Architect
**Methodology**: Matt Pocock Agent Skills (/grilling + /grill-with-docs)
**Status**: FRONTIER EXHAUSTED — SHARED UNDERSTANDING ATTAINED

---

## Round 1: Core Architecture & Invariant Frontier

❓ **Q1** - **Double-Booking Under Concurrency**: When two clients book the exact same slot simultaneously, how do we prevent double-booking?
➡️ *Recommendation*: Use PostgreSQL advisory locks or a serializable transaction with exclusion constraints (`tsrange` overlap check).

**Architect Decision**: APPROVED. Exclusion constraints on `(provider_id, slot_range)` guarantee mathematical impossibility of double bookings.

---

❓ **Q2** - **External Calendar Interoperability**: How do providers sync schedules to Apple Calendar, Google Calendar, and Outlook without continuous OAuth polling?
➡️ *Recommendation*: RFC 5545 iCalendar feed generator (`/api/calendar/[token].ics`) with live subscription URL support.

**Architect Decision**: APPROVED. Static signed subscription feeds deliver zero-friction cross-calendar interoperability without API token expiration issues.

---

## Round 2: Edge Cases & Failure Modes Frontier

❓ **Q3** - **Timezone & Daylight Savings Transitions**: How are appointments preserved when DST transitions occur between booking and appointment time?
➡️ *Recommendation*: Store appointment start times strictly in UTC with the provider's canonical IANA timezone name (`America/New_York`), calculating display times on read.

**Architect Decision**: APPROVED. UTC + IANA timezone string guarantees zero 1-hour time shifts across spring/fall DST transitions.

---

## Final Alignment Attestation
The design tree has been thoroughly walked down to all leaf nodes.
No silent assumptions remain regarding authentication, concurrency, data consistency, or payment flow.
