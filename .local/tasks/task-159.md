---
title: Fix package prices and consolidate pricing tier editor
---
# Consolidate Legacy Pricing Tiers Into Service Editor

## What & Why
Three services display "package" prices that are 100x too small ($2 / $4 / $6 instead of $199 / $449 / $599) and the admin services editor has no UI to edit them. Investigation showed the platform has two parallel pricing-tier systems:

1. The **JSONB `pricing_tiers` column** on the `services` table — what `services-management.tsx` reads/writes (admin editor).
2. A **separate `pricing_tiers` table** — what the `/api/services/:id` route reads at runtime, then **overlays** onto the service object (overriding the JSONB column).

The legacy table holds 12 rows across 3 services with prices stored as plain dollars (not cents), but the service detail page divides every tier price by 100 expecting cents — producing the $2/$4/$6 display. And because admins only see the JSONB column in the editor, they have no way to fix it.

Affected rows in the legacy `pricing_tiers` table:

- Service 55 — Real Estate Listings: 4 tiers (Essential $199, Premium $449, Social Media Pro $599, Ultimate $799)
- Service 60 — Roof Inspections: 4 tiers ($249–$799)
- Service 65 — Aerial Site Photography & Visual Documentation: 4 tiers ($499–$2499)

This task migrates those 12 rows into each service's JSONB `pricing_tiers` column (converted to cents so the existing dollars↔cents UI math is correct), updates the service-detail route to stop overlaying from the legacy table, and drops the now-unused legacy table from the schema. After this, the admin editor is the single source of truth for packages, what admins enter is what customers see, and the prices render correctly.

## Done looks like
- On `/services/real-estate-listings`, the four packages display $199, $449, $599, $799 (matching what the admin would see in the editor) — no more $2/$4/$6/$8.
- The same fix applies to `/services/roof-inspections` and `/services/land-surveys` (Aerial Site Photography slug) — every existing legacy tier shows its real dollar price.
- Opening any of those three services in `/admin/services` and clicking edit shows all of their tiers under the existing "Packages" / pricing-tier section, with their names, descriptions, features, popular badges, and prices preserved. Editing a tier and saving updates what customers see on the service detail page immediately.
- Set `pricingType` to `"tiered"` on the three migrated services so the `/services` listing card no longer says "Flat Pricing" — it shows the tiered range. (Alternatively, leave `flat` if a tier-specific listing display would be misleading; document the choice. Default: switch to `"tiered"` since real packages now exist.)
- The `/api/services/:id` route no longer joins the legacy `pricing_tiers` table — it returns the service row's JSONB column as-is.
- The `pricing_tiers` table is removed from `shared/schema.ts` and dropped from the database via `npm run db:push` (use `--force` if a data-loss warning appears, since the data has been copied to the JSONB column and verified).
- Any other references in code that import the legacy `pricingTiers` Drizzle table (e.g. `server/routes.ts:51`, `server/routes.ts:719-723`'s `/api/pricing-tiers` endpoint) are removed or rewritten to use the JSONB column.
- Existing tests still pass; add at least one test (server-side or a small unit test) confirming `/api/services/:id` returns the JSONB tiers without legacy overlay.
- Manual verification: log in as admin, edit one of the three services' tiers in the editor, save, refresh the customer-facing detail page — the change shows up.

## Out of scope
- Adding new pricing tiers to services that don't have any.
- Rebuilding the package editor UI itself — it already exists in `services-management.tsx` and works for the JSONB column.
- Touching the separate `subscription_tiers` table (different feature, not affected).
- Touching `bundleConfigurations` / service-bundle-discounts (different feature).

## Steps
1. **Audit & migrate the data** — Write a one-shot migration routine (or extend the existing init-db routine) that, for every row in the legacy `pricing_tiers` table, copies it into the matching service's JSONB `pricing_tiers` column with `min_price`/`max_price`/`price` multiplied by 100 (dollars→cents) and field names mapped to the JSONB shape the admin editor uses. Skip any service whose JSONB column is already non-empty (don't clobber). Re-check for any other services beyond {55, 60, 65} before running.
2. **Set `pricingType` to `tiered`** on the migrated services so the `/services` listing reflects that they now have packages.
3. **Stop the route overlay** — In `/api/services/:id` (and the listing endpoint if it does the same), remove the `db.select().from(pricingTiers)` join and just return the service row. Remove the `/api/pricing-tiers` endpoint as it now returns nothing meaningful.
4. **Drop the legacy table** — Remove the `pricingTiers` Drizzle table from `shared/schema.ts` (and any related types/imports). Run `npm run db:push` (with `--force` if needed) to drop it.
5. **Verify in the editor + on customer-facing page** — Open one of the three services in the admin editor, confirm the migrated tiers are present and editable, save a change, then verify it shows up on the public detail page with correct dollar prices.
6. **Add a regression test** — Add a small test asserting that `/api/services/:id` returns whatever's in the JSONB column without any sidecar lookup (and ideally that prices stay in cents).

## Relevant files
- `client/src/pages/service-page-fixed.tsx:762-886`
- `client/src/pages/admin/services-management.tsx:87,438-446,535-548,822-852,1945`
- `server/routes.ts:51,531-537,719-723`
- `server/storage.ts`
- `shared/schema.ts`
- `drizzle.config.ts`