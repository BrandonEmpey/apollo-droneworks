---
title: Let one package include multiple deliverables (e.g. photos and video)
---
# Multiple Deliverables Per Package

## What & Why
Right now each package tier inside a service can only describe a single deliverable line (for example "10 photos" OR "1 video"). The admin needs to be able to combine several deliverables into one package — e.g. an "Essential Aerial Bundle" that includes 10 photos *and* 1 edited video *and* 1 site map — so packages on the real estate listing (and every other service) can reflect what is actually being sold.

## Done looks like
- In the admin Services Management editor, each package tier shows a list of deliverable lines instead of a single Quantity Type / Quantity / Unit Type row.
- The admin can add, edit, reorder, and remove deliverable lines within a tier. Each line has its own quantity type (range or exact), quantity value(s), and unit (photos, videos, maps, hours, etc.).
- A package with no deliverable lines still saves (treated as "contact for details") so existing data keeps working.
- Pricing for the tier (Fixed / Range / Contact for Quote) stays at the tier level — deliverables only describe what's included, not price.
- On the public service detail page and the service card listing, each package shows all of its deliverable lines (e.g. "10 photos · 1 video · 1 site map") in place of the current single-line summary.
- Existing services that already have a single quantity/unit on a tier continue to render correctly without any manual data fix — the old shape is shown as a single deliverable line.
- Saving a tier persists all deliverable lines and they round-trip through edit without loss.

## Out of scope
- Per-deliverable pricing or per-deliverable add-on selection.
- Changing how packages are selected or quoted in the contact / booking flow beyond passing the existing package name.
- Reworking the non-tiered pricing modes (`flat`, `per_unit`, `range_based`) — only the tiered packages on `services.pricingTiers` change.
- Migrating historical bookings, quotes, or receipts that reference old tier text.

## Steps
1. **Extend the tier data model** — Add an optional `deliverables` array to each entry in `services.pricingTiers` in `shared/schema.ts` (and the matching Zod schema in the admin editor). Each deliverable has a name/unit, quantityType (`range` | `exact`), and quantity fields (`exactQuantity` or `minQuantity`/`maxQuantity`). Keep the existing top-level `quantityType`, `exactQuantity`, `minQuantity`, `maxQuantity`, and `quantityUnit` fields on the tier as legacy/optional so old records still load.

2. **Update the admin tier editor UI** — In the Services Management page, replace the single Quantity Type / Exact Quantity / Unit Type block inside each expanded tier with a "Deliverables" sub-section: a list of rows, each with the same controls that exist today (range vs exact toggle, quantity input(s), unit select), plus add / remove / reorder buttons. When loading an existing tier that only has the legacy single-deliverable fields, surface it as one prefilled deliverable row so nothing is lost on first edit.

3. **Render multi-deliverable packages publicly** — Update the package rendering on the service detail page and the enhanced service card so a tier's deliverables are listed (joined with a separator or shown as bullets). Fall back to the existing single-line rendering when a tier has no `deliverables` array, so legacy tiers keep displaying the same way.

4. **Manual verification** — Open a service in the admin editor, build a package containing multiple deliverables (photos + video + map), save, reload, and confirm the deliverables persist and appear correctly on the public services page and service detail page. Confirm an untouched legacy tier still renders the same as before.

## Relevant files
- `shared/schema.ts:73-85`
- `client/src/pages/admin/services-management.tsx:80-107,1700-1930`
- `client/src/components/enhanced-service-card.tsx:78-126`
- `client/src/pages/service-page-fixed.tsx:760-880`