---
title: Remove confirmed dead code and orphaned files
---
# Remove Confirmed Dead Code

## What & Why
An audit of the full codebase identified 26 files that have zero live references — orphaned component iterations, superseded utilities, never-registered route files, and one-off migration scripts whose work is already done. Removing them shrinks the bundle, eliminates confusion about which version of a component is canonical, and makes the codebase easier to navigate.

## Done looks like
- All 26 dead files are deleted
- The two commented-out service-sharing lines in `server/routes.ts` are removed
- The unused `service-sharing` page import in `client/src/App.tsx` is removed
- The app boots and lints cleanly after the deletions

## Out of scope
- `server/migrate-southern-utah-images.ts` — already covered by Task #218
- `public/uploads/` subfolders — already covered by Task #219
- Any refactoring or code consolidation beyond the literal file deletions

## Steps

1. **Delete orphaned client components and dev fixtures** — Remove the 13 unused client-side files: the two old social-media-portal iterations (portal.tsx, portal-new.tsx; the canonical one is -fixed.tsx), the superseded pricing-optimization.tsx page (the -new version is active), client-dashboard-new.tsx, test-about-editor.tsx, services-display-test.tsx, the duplicate use-mobile.ts hook (use-mobile.tsx is canonical), the superseded pdfGenerator.ts (pdfGenerator-fixed.ts is in use), pdfTest.ts, tableTest.ts, addon-indicator.tsx, and service-price-calculator.tsx.

2. **Remove the unrouted service-sharing page** — Delete `client/src/pages/service-sharing.tsx`, then remove its import from `client/src/App.tsx` (the page was imported but never assigned a route).

3. **Delete never-registered server route files** — Remove `server/service-sharing-routes.ts` and `server/test-routes.ts`, then delete the two commented-out lines in `server/routes.ts` that reference service-sharing (lines 19 and 192).

4. **Delete obsolete server scripts** — Remove `server/reassign-service-ids.ts`, `server/reset-service-ids.ts`, `server/simple-reset-ids.ts` (all specific to a defunct 7-service catalog), `server/setup-service-addons.ts` (references service names that no longer exist), `server/add-keywords-to-galleries.ts`, and `server/fix-images.ts` (both one-off data fixes already applied).

5. **Delete obsolete scripts/** — Remove `scripts/add-service-columns.ts` (superseded by `npm run db:push`), `scripts/seed-folder-structures.ts` (one-off, already applied), and `scripts/migrate-orthomosaic-to-aerial-mapping.ts` (one-off migration already run in Task #209).

6. **Verify** — Confirm the app starts cleanly (`npm run dev`), the lint workflow passes, and no TypeScript errors appear from the removed imports.

## Relevant files

- `client/src/components/social/social-media-portal.tsx`
- `client/src/components/social/social-media-portal-new.tsx`
- `client/src/pages/admin/pricing-optimization.tsx`
- `client/src/pages/client-dashboard-new.tsx`
- `client/src/components/admin/test-about-editor.tsx`
- `client/src/components/services-display-test.tsx`
- `client/src/hooks/use-mobile.ts`
- `client/src/lib/pdfGenerator.ts`
- `client/src/lib/pdfTest.ts`
- `client/src/lib/tableTest.ts`
- `client/src/components/addon-indicator.tsx`
- `client/src/components/service-price-calculator.tsx`
- `client/src/pages/service-sharing.tsx`
- `client/src/App.tsx`
- `server/service-sharing-routes.ts`
- `server/test-routes.ts`
- `server/routes.ts:19,192`
- `server/reassign-service-ids.ts`
- `server/reset-service-ids.ts`
- `server/simple-reset-ids.ts`
- `server/setup-service-addons.ts`
- `server/add-keywords-to-galleries.ts`
- `server/fix-images.ts`
- `scripts/add-service-columns.ts`
- `scripts/seed-folder-structures.ts`
- `scripts/migrate-orthomosaic-to-aerial-mapping.ts`