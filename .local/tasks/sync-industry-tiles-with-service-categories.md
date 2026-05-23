# Sync Industry Tiles with Service Categories

## What & Why
The three homepage industry tiles ("Aerial Imagery", "Inspections & Assessments", "Construction Mapping") use different names than the service page section headings ("Real Estate & Marketing", "Property Inspections", "Mapping & Modeling"). This confuses visitors who click a tile and then navigate to /services — the groupings appear to be different. Additionally, `/category/aerial-imagery` shows no services at all because the category-page component uses a hardcoded slug→category lookup table that can silently break rather than reading the category value already stored on the tile record itself.

## Done looks like
- All three homepage tile titles match their corresponding `/services` page section headings exactly.
- Clicking any homepage tile takes the user to a `/category/:slug` page whose hero title and service list are consistent with what the `/services` page shows for the same group.
- `/category/aerial-imagery` (or whichever slug is chosen for the real-estate group) shows the correct services — no empty page.
- The category page no longer uses a hardcoded slug-to-category map; it reads the `category` field from the tile record so any future admin-created tile works automatically without a code change.
- The `/services` page section headings remain correct and unchanged.

## Out of scope
- Adding or removing services from any category.
- Changing the actual slug values stored in the database (slugs can stay as `aerial-imagery`, `inspections`, `construction-mapping` — only the display titles change).
- Any admin UI changes beyond verifying the existing tile editor already exposes the `category` field.

## Steps
1. **Remove the hardcoded `SLUG_TO_CATEGORY` map** in the industry-page component and replace it with `tileData.category` — the value already returned by the `/api/industry-tiles/:slug` query — to filter services. Add a clear fallback/empty state when `tileData.category` is absent.
2. **Update the three tile display titles** in the database to match the service page section headings: `Real Estate & Marketing`, `Property Inspections`, and `Mapping & Modeling`. Do this via a one-time safe `UPDATE` through the existing storage layer or a targeted seed call — do NOT use `db:push` or touch the schema.
3. **Verify** that `/category/aerial-imagery`, `/category/inspections`, and `/category/construction-mapping` each load with the correct heading and a non-empty service list, and that the `/services` page section headings are still correct.

## Relevant files
- `client/src/pages/industry-page.tsx`
- `client/src/components/services-section.tsx`
- `shared/schema.ts`
- `server/routes.ts`
