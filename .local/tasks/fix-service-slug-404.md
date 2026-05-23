# Fix service detail 404 for slugs starting with a digit

## What & Why
Clicking the "3D Mapping" service (and any future service whose slug starts with a digit) lands on a "Service not found" 404 page. The link itself is correct — `/services/3d-mapping` — and the service exists in the database with that exact slug. The bug is on the server: the lookup uses `parseInt` to decide whether the URL parameter is a numeric ID or a slug. `parseInt("3d-mapping")` returns `3`, so the server tries to look up service ID 3, fails, and returns 404 instead of falling back to a slug lookup. We need to detect "is this a number?" strictly so any slug with a leading digit is recognized as a slug.

## Done looks like
- Visiting `/services/3d-mapping` loads the 3D Mapping service detail page successfully.
- Visiting `/services/67` still loads the same 3D Mapping page (numeric ID lookup keeps working).
- Visiting an unknown slug (e.g. `/services/does-not-exist`) still shows the existing "Service not found" error.
- Other services that already work (Construction Monitoring, Roof Inspections, Tower Inspections, Real Estate Listings, etc.) continue to load normally.
- No regression for admin routes that target a service by numeric ID (PATCH/DELETE/etc.).

## Out of scope
- Redesigning the service detail or error page.
- Changing how slugs are generated, edited, or stored.
- Updating the footer or other links to use slugs instead of numeric IDs.
- Adding new services or changing existing service content.

## Steps
1. In the public service detail API handler, replace the "is this a number?" check so that a value is only treated as a numeric ID when the entire string is digits (e.g. matches `/^\d+$/`). Anything else — including values like `3d-mapping` that happen to start with a digit — should go through the slug lookup branch.
2. Audit the rest of the server for the same `parseInt` pattern on `:idOrSlug` style params (for example any addon, tier, or related routes that accept either an ID or slug) and apply the same strict numeric check so they don't have the same bug.
3. Manually verify the four cases in "Done looks like" by hitting the service detail page in the preview: a digit-leading slug, a numeric ID, an unknown slug, and at least one previously working service.

## Relevant files
- `server/routes.ts:503-539`
- `client/src/pages/service-page-fixed.tsx`
- `client/src/components/ui/service-card.tsx:80-95`
- `shared/schema.ts:22-60`
