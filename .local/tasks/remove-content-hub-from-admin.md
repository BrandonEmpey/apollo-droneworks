# Remove Content Hub From Admin Dashboard

## What & Why
The admin sidebar/overview currently includes a "Content Hub" landing page (`/admin/content-hub`, rendered by `client/src/pages/admin-dashboard-new.tsx`) that aggregates links to other admin sections. The user wants to manage content directly from each section's own page (Services, Galleries, Blog, etc.) instead of going through a central hub. The Content Hub is now redundant — every section it links to is already reachable from the main admin nav.

This task removes the Content Hub entirely from the admin experience: the page, the route, the overview card, the dismissible banner, and any cross-links pointing at it. Other content-management pages (`/admin/content`, `/admin/content-management`, Galleries, Blog, etc.) remain unchanged — only the aggregator hub goes away.

## Done looks like
- Visiting `/admin/content-hub` returns a 404 (or redirects to `/admin`). The `AdminContentHub` component file (`client/src/pages/admin-dashboard-new.tsx`) is deleted.
- The Admin Overview page (`/admin`) no longer shows the "Content Hub" card or the "Content Hub — Your central place for all media & content" dismissible banner. The overview cards still include Services, Galleries/Blog (Content Management), Marketing, Finance, Clients, Settings — every section the hub previously aggregated remains directly reachable from the overview, just without the hub layer.
- The "Go to Content Hub" link on the Client Operations page (`client/src/pages/admin/client-operations.tsx:149`) is removed (or repointed to a still-existing destination — preferred: just delete the link).
- The `BANNER_KEYS.CONTENT_HUB` entry is removed from `client/src/hooks/use-dismissible-banner.ts` and any Hints/banner-restore panel that listed it. Any localStorage cleanup for the dismissed flag is acceptable as a no-op (don't write a migration; the stale key just becomes inert).
- All routes for the hub are removed from `client/src/App.tsx` (`/admin/content-hub`). The `import AdminContentHub from "@/pages/admin-dashboard-new"` line is removed.
- `lint` workflow stays clean — no orphaned imports, no dead test files, no broken hub-features check (`scripts/check-hub-features.ts` may need to drop the Content Hub entry).
- All existing tests still pass. Any test specifically asserting Content Hub presence is updated to assert its absence.

## Out of scope
- Removing or restructuring `/admin/content` (Content Management page for Galleries & Blog) — that page stays exactly as it is, the user manages content from there and other section pages.
- Touching the Marketing Hub, Finance Hub, or any other hub page.
- Renaming or moving any of the actual content-management routes.
- Building new navigation; the existing per-section nav cards on `/admin` already cover everything the hub did.

## Steps
1. **Delete the page & route** — Remove the `/admin/content-hub` route from `App.tsx` and delete `client/src/pages/admin-dashboard-new.tsx`. Drop the `AdminContentHub` import.
2. **Clean the Admin Overview** — In `client/src/pages/admin/admin-overview.tsx`, remove the Content Hub card from the section cards array and remove the entire dismissible banner block that points to it. Keep all other overview cards intact.
3. **Remove cross-links** — Strip the "Go to Content Hub" link in `client/src/pages/admin/client-operations.tsx` and any other `/admin/content-hub` href found in a repo-wide search.
4. **Trim banner registry** — Remove the `CONTENT_HUB` entry from `client/src/hooks/use-dismissible-banner.ts` and any Hints/banner-settings panel that lists it.
5. **Update the hub-features check script** — Update `scripts/check-hub-features.ts` (run by the `lint` workflow) so it no longer expects a Content Hub entry; otherwise lint will fail.
6. **Verify** — Run `lint`, `Run tests`, and manually load `/admin` to confirm the page renders cleanly with no broken cards/banners and no console errors. Confirm `/admin/content-hub` no longer resolves.

## Relevant files
- `client/src/App.tsx:36,97`
- `client/src/pages/admin-dashboard-new.tsx`
- `client/src/pages/admin/admin-overview.tsx:32,40,46,60,147,149,195,212,218,225,235,237`
- `client/src/pages/admin/client-operations.tsx:149`
- `client/src/hooks/use-dismissible-banner.ts:10,17-19`
- `scripts/check-hub-features.ts`
