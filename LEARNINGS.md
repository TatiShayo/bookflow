# BookFlow — Learnings

## Architecture
- Next.js 16.2.6 with Turbopack (App Router)
- Supabase for auth + database (SSR with @supabase/ssr)
- Stripe for payments
- Resend for email
- Custom booking flow (no Calendly/Cal.com dependency)
- Tailwind CSS v4 with dark theme

## Key Files
- `src/middleware.ts` — auth protection + public route passthrough
- `src/lib/slots.ts` — slot generation algorithm (heart of the product)
- `src/lib/supabase/server.ts` — SSR Supabase client
- `src/app/book/[username]/[slug]/booking-flow.tsx` — client-side booking wizard
- `supabase/schema.sql` — database schema + RLS policies

## Gotchas
- Next.js 16 middleware is deprecated → should migrate to "proxy" (but works for now)
- Supabase cookie handling requires async cookie reads in Next.js App Router
- RLS policies must explicitly allow public reads for the booking page
- Slot calculation uses 15-minute granularity (variable step could be smarter)
- The booking-flow.tsx is 530 lines of client code — may need splitting
