---
title: Populate Financial Management with real and demo data
---
# Populate Financial Management with Real and Demo Data

## What & Why
The Financial Management page (Overview, Income, Expenses tabs) is empty
even though there are completed and in-progress bookings/projects elsewhere
in the app. Two reasons:

1. **No automation exists** — completing a booking never produces an income
   record. Income/expenses are 100% manual entry today.
2. **Seed data was incomplete** — demo bookings and projects were seeded
   without any matching finance rows.

This task fixes both halves so the Financial Management section reflects
the rest of the system and looks populated for demos. Going forward,
finishing a booking automatically records the revenue.

A note on scope: `client_projects` has no price/cost column, so projects on
their own can't generate income. Money lives on `bookings.totalAmount`, so
the automatic-income wiring is keyed off booking status changes.

## Done looks like
- When an admin updates a booking's status to `"completed"` (via the
  Booking Manager, the bookings PUT endpoint, or any other path), an income
  record is automatically created with the booking's `totalAmount`,
  `customerName`, `scheduledDate`, and `bookingId` linkage. Re-completing
  the same booking does not produce duplicates.
- If a completed booking is later reverted to a non-completed status, the
  auto-created income row is removed (or marked voided) so revenue stays
  accurate.
- The one existing completed booking (Mike Wilson — Industrial Facility
  Inspection, $349) shows up in the Income tab and Overview after backfill.
- The Expenses tab shows roughly 10–15 realistic seeded expense entries
  across the existing categories (Equipment, Software, Travel, Insurance,
  Training, Marketing, Office, Utilities, Maintenance, Taxes), spread over
  the last ~3–6 months so the Overview trend cards aren't flat.
- The Financial Management Overview tab now shows non-zero Total Revenue,
  Total Expenses, Net Profit, and Profit Margin numbers that match the
  underlying rows.
- Marketing analytics sync still runs after auto-creating income (same
  call the manual POST handler makes today).
- The seed is idempotent — restarting the app does not duplicate the
  demo expenses or the backfilled income.

## Out of scope
- Adding a price/cost column to `client_projects`. Projects remain
  non-financial; only bookings drive income.
- A full invoicing/receipts workflow.
- Removing or rewriting the manual income/expense entry forms — those keep
  working as before.
- Changing how `synchronizeFinancialWithAnalytics` works internally.

## Steps
1. **Auto-record income on booking completion** — In the bookings update
   endpoint (and any other place that flips a booking to `"completed"`),
   detect the status transition into and out of `"completed"`. On entry,
   insert one income row (skip if a row already exists for that
   `bookingId`); on exit, remove or void that auto-created row. Trigger
   the existing finance→analytics sync after the write.
2. **Backfill the one existing completed booking** — Add a small idempotent
   migration (or extend the existing init-db routine) that inserts the
   matching income row for any booking already at status `"completed"`
   that doesn't have an income row yet. Should be safe to run on every
   startup.
3. **Seed demo expenses** — Add an idempotent demo-expense seeder that
   creates ~10–15 expenses spread across the 10 existing categories and
   spread over the last 3–6 months, attributed to the admin user. Skip
   if any expenses already exist so real production data is never
   touched. Wire it into the existing init-db startup sequence next to
   the other seed steps.
4. **Verify on the page** — After restart, the Overview, Income, and
   Expenses tabs all show data. The auto-income wiring is exercised by
   updating one of the confirmed bookings to `completed` from the admin
   Booking Manager and confirming a new income row appears.

Architectural note: keep all auto-income logic on the server side, ideally
near `storage.updateBooking` or wrapped in a small helper called by the
bookings PUT route, so future entry points (bulk updates, status webhooks,
etc.) can reuse it.

## Relevant files
- `client/src/pages/admin/financial-management.tsx`
- `client/src/components/finance/finance-dashboard.tsx`
- `server/routes.ts:1077-1100,3019-3202`
- `server/storage.ts:89,928`
- `server/database-storage.ts:300-310`
- `server/analytics-routes.ts`
- `server/init-db.ts`
- `shared/schema.ts:1120-1180`