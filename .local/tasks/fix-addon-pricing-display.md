# Fix Add-on Pricing Display

## What & Why
Add-on prices in the database were inserted as whole dollar amounts (e.g., 75) instead of cents (e.g., 7500), but the display and form logic expects cents. This causes prices like $75 to show as $0.75 on the Add-ons Management page.

## Done looks like
- Add-on prices in the admin management page display the correct dollar amounts (e.g., $75.00, $150.00 instead of $0.75, $1.50)
- Editing an add-on pre-fills the form with the correct dollar value
- Creating a new add-on continues to save and display correctly

## Out of scope
- Changing the cents-based storage convention — that stays as-is
- Modifying how new add-ons are created (the form already converts correctly)

## Steps
1. **Migrate existing add-on prices** — Write and run a one-time migration script that multiplies all existing `addons.price` values by 100 to convert them from dollars to cents, matching the intended storage convention documented in the schema.
2. **Verify display correctness** — Confirm the admin Add-ons Management page now shows realistic prices after the migration.

## Relevant files
- `shared/addons-schema.ts`
- `client/src/pages/admin/addons-management.tsx`
- `server/routes.ts`
