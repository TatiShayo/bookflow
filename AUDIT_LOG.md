# AUDIT LOG — bookflow

**HERMES v6 Autonomous Engineering Standard Pass:** August 14, 2026

## 1. Vulnerability & Bug Fixes Applied

### 🔴 Security & Authorization
- **IDOR in Booking Cancellation**: Added authorization verification to `/api/bookings/[id]/cancel` ensuring only the authentic host (`user.id === eventType.user_id`) or an attendee with matching email/cancellation token can cancel bookings.
- **Open Redirect Defense**: Sanitized `next` query parameter in `/api/auth/callback` via `sanitizeRedirectPath` to block open redirect attacks, external URLs, and protocol injection.
- **Route Protection Middleware**: Added `src/middleware.ts` for Supabase SSR auth verification and automatic redirects for unauthenticated `/dashboard/*` access.
- **Cross-Event Double Booking Prevention**: Fixed collision detection in `/api/bookings` and `/book/[username]/[slug]/page.tsx` so all event types for a host are queried to prevent scheduling overlaps across different services.
- **Stripe Replay Protection & Amount Validation**: Hardened `/api/bookings/payment-intent` and `/api/webhooks/stripe` to reject zero/negative intents, verify currency casing, validate required booking metadata, and prevent duplicate PaymentIntent reuse.

### ⚙️ Engine Enhancements & Logic Fixes
- **Timezone & DST Awareness**: Enhanced `src/lib/slots.ts` with IANA timezone validation, zoned date/day-of-week parsing, and DST resilience for US and European transitions.
- **Buffer Boundary Calculations**: Upgraded slot generator to check both prospective and existing booking buffers (`buffer_before_minutes` & `buffer_after_minutes`).
- **Daily Limit Enforcement**: Integrated `max_bookings_per_day` check into `generateSlots` and API routes using zoned host midnight boundaries.
- **Cancellation Policy & Refund Engine**: Created `src/lib/cancellation.ts` with notice window thresholds (24h full refund, 12-24h partial refund, <12h non-refundable, past booking guard) and automated Stripe refund processing.
- **Empty Query Guard**: Handled empty `eventTypeIds` array in `src/app/dashboard/page.tsx` to prevent invalid PostgREST syntax.
- **UI Currency Formatting**: Fixed hardcoded `$` symbols in `MeetingsClient` and `DashboardClient` to dynamically display event currency.
- **Error Boundaries & Skeleton UI**: Added root `error.tsx`, `global-error.tsx`, `not-found.tsx`, `dashboard/error.tsx`, and skeleton loading screens for dashboard and booking flows.

## 2. Test Suite Expansion (HERMES v6)
- **106 tests across 9 test suites** (100% passing):
  - `src/lib/__tests__/slots.test.ts` (16 tests)
  - `src/lib/__tests__/concurrency-overlapping.test.ts` (12 tests)
  - `src/lib/__tests__/timezone-dst.test.ts` (16 tests)
  - `src/lib/__tests__/constants-utils.test.ts` (10 tests)
  - `src/lib/__tests__/cancellation.test.ts` (15 tests)
  - `src/lib/__tests__/scheduling-edge-cases.test.ts` (5 tests)
  - `src/lib/__tests__/validation.test.ts` (20 tests)
  - `src/lib/__tests__/stripe-webhooks.test.ts` (6 tests)
  - `src/lib/__tests__/auth-security.test.ts` (6 tests)
