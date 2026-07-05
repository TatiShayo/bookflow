# BookFlow — Master Build Plan

## PHASE 1: AUDIT & STABILIZE
- [ ] Build passes clean (npm run build, 0 errors)
- [ ] TypeScript clean (npx tsc --noEmit, 0 errors)
- [ ] All routes load in dev (no 500 errors)
- [ ] Auth flow: signup → verify → login → dashboard works
- [ ] Middleware correctly protects /dashboard/* routes
- [ ] Supabase RLS: users only see their own event_types, availability, bookings
- [ ] Public booking page /book/[username] loads WITHOUT authentication
- [ ] Stripe webhook route accepts test events and returns 200
- [ ] Add loading.tsx to all route groups
- [ ] Fix cancel booking: actually set status='cancelled'
- [ ] Add public read RLS policy for profiles table

## PHASE 2: THE PUBLIC BOOKING PAGE — HIGHEST PRIORITY
This is the entire product. Every other page supports this one.

- [ ] /book/[username]/page.tsx: SEO metadata, responsive, proper empty state
- [ ] /book/[username]/[slug]/page.tsx: Full 4-step booking wizard polish
- [ ] Custom calendar: verify no heavy library, month nav smooth
- [ ] Time slot picker: timezone display, "no times" message
- [ ] Details form: validation with zod
- [ ] Payment: Stripe Elements, retry on failure
- [ ] Confirmation: Google Calendar link, .ics download, CSS confetti
- [ ] Mobile responsive at 375px

## PHASE 3: DASHBOARD COMPLETION
- [ ] Real Supabase stats (today, week revenue, month, cancel rate)
- [ ] Upcoming bookings list (next 14 days)
- [ ] Event types: live toggle, copy link, WhatsApp share
- [ ] Event type editor: full form saves to Supabase
- [ ] Availability: weekly grid with toggles
- [ ] Blocked dates: add/remove via date picker
- [ ] Meetings: Upcoming/Past/Cancelled tabs
- [ ] Cancel booking with email notification
- [ ] Analytics: real charts from bookings data
- [ ] Settings: profile form saves
- [ ] Billing: plan display, upgrade flow

## PHASE 4: API & EMAIL COMPLETION
- [ ] /api/bookings: race condition check, insert, send emails, meeting link
- [ ] /api/bookings/payment-intent: validate, create PaymentIntent
- [ ] /api/bookings/[id]/cancel: verify ownership, set status, send emails
- [ ] /api/profile/[username]: public endpoint (no auth required)
- [ ] Resend email templates (confirmation, host notification, cancellation)

## PHASE 5: TESTING INFRASTRUCTURE
- [ ] Install vitest, testing-library, playwright
- [ ] Unit test: slots.ts getAvailableSlots
- [ ] Unit test: timezone conversion
- [ ] Unit test: booking creation validation
- [ ] Unit test: payment intent creation
- [ ] E2E: booking page loads
- [ ] E2E: booking wizard flow
- [ ] E2E: dashboard after login

## PHASE 6: PERFORMANCE OPTIMIZATION
- [ ] Custom calendar: no heavy library
- [ ] Dynamic import Stripe Elements
- [ ] Dynamic import framer-motion
- [ ] Loading states for all routes
- [ ] ISR for public booking pages
- [ ] Cache availability calculations
- [ ] next/image for avatars
- [ ] Lighthouse ≥90 for /book/[username]
- [ ] Mobile booking flow at 375px
- [ ] Time to interactive <3s

## PHASE 7: ADVANCED FEATURES
- [ ] Buffer automation
- [ ] Group bookings (max_attendees)
- [ ] Rescheduling flow
- [ ] No-show protection policy
- [ ] Collective scheduling
- [ ] Embed widget
- [ ] Zapier webhook
- [ ] SMS reminders
- [ ] Round-robin team booking

## PHASE 8: BOOKING PAGE PERSONALIZATION
- [ ] Custom themes (6 accent colors)
- [ ] Custom domain support docs
- [ ] Cover image upload
- [ ] Video intro embed
- [ ] Testimonials display
