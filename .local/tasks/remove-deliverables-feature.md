# Remove deliverables & file-sharing feature

## What & Why
The current way customers receive their finished work — admin uploading files
into a "deliverables" area and clients viewing/downloading them through the
dashboard — is not working for the business. Strip the entire feature out so
we can design a new delivery flow from a clean slate.

## Done looks like
- No "My Deliverables" link in the site header (desktop or mobile menu).
- No "Deliverables" tab in the client dashboard.
- No `/admin/deliverables` admin page and no link to it from the admin nav.
- Admins can no longer upload files for a client/project anywhere in the UI.
- Clients can no longer see, download, or be notified about deliverables/files.
- Booking confirmation no longer auto-generates project-deliverable rows.
- `/api/service-deliverables`, `/api/admin/service-deliverables`,
  `/api/projects/:id/deliverables`, and `/api/client-files*` routes are gone
  (return 404).
- The `service_deliverables`, `project_deliverables`, and `client_files`
  tables (and their relations) are dropped from the schema and pushed to the
  database via `npm run db:push --force`.
- App still builds, `lint` passes, and the existing test suite still runs
  (tests that referenced removed components/routes are deleted along with
  them; no new functionality is added).

## Out of scope
- The `deliverables[]` array inside a service's pricing tiers
  (`shared/schema.ts` pricingTiers) — that is just marketing copy describing
  what a package includes and stays as-is.
- Client projects, project milestones, project tasks, and project
  communication features. Only the deliverables/files portion of the project
  experience is removed; the project shell, milestones, and messaging stay.
- Designing or building the new delivery workflow — that is a follow-up task
  the user will scope separately.
- Existing files already uploaded to `public/uploads/` and the legacy
  `drone_*.jpg` files referenced from `client_files.file_url`. The DB rows
  go away with the table drop; the on-disk files can be cleaned up later.
- The `ServiceDeliverableManager` step inside admin Services Management if it
  is purely a per-service template editor — confirm during implementation
  whether to remove it (it depends on the dropped table, so it must go).

## Steps
1. **Remove the admin-facing surface** — Delete the admin Deliverables
   Management page and any admin nav entry, sidebar link, or dashboard card
   pointing at it. Remove the file-upload form used by admins to push files
   to clients/projects, plus any service-deliverable template editor that
   reads from the dropped tables.
2. **Remove the client-facing surface** — Delete the "My Deliverables"
   header link (desktop and mobile), the Deliverables tab in the client
   dashboard, the ProjectDeliverables component, and the FileManager /
   file-viewers used to browse client files. Update the dashboard layout so
   no empty tab/space is left behind.
3. **Remove the API surface** — Delete the deliverables and client-files
   route handlers from `server/routes.ts` (and any helpers like
   `projectIdForDeliverable`). Remove the auto-generation of project
   deliverables from the booking-confirmation flow (both real and TEST MODE
   branches). Drop the per-deliverable delivery-method migration call from
   `server/index.ts`.
4. **Remove the storage layer** — Strip the deliverables and client-files
   methods, fields, and seed state from `IStorage`, `MemStorage`, and
   `DatabaseStorage`. Remove the `delivery-methods` shared module if it is
   only consumed by deliverables code.
5. **Drop the schema** — Remove the `serviceDeliverables`,
   `projectDeliverables`, and `clientFiles` tables, their relations, insert
   schemas, and exported types from `shared/schema.ts`. Delete the
   `server/migrations/*deliverable*` and `server/migrate-deliverable-*`
   files. Run `npm run db:push --force` so the production schema matches.
6. **Clean up tests, imports, and docs** — Delete the tests that exercised
   the removed components/routes (e.g. project-deliverables /
   admin-file-upload tests). Remove now-dead imports and feature-flag
   entries (`feature-testing-config`, hub-feature checks). Update
   `replit.md` so the architecture overview no longer mentions deliverables
   as a current feature, and note the intent to redesign the delivery flow.

## Relevant files
- `client/src/App.tsx`
- `client/src/pages/admin/deliverables-management.tsx`
- `client/src/pages/admin/services-management.tsx`
- `client/src/pages/admin/customer-experience.tsx`
- `client/src/pages/client-dashboard.tsx`
- `client/src/components/layout/header.tsx`
- `client/src/components/client/project-deliverables.tsx`
- `client/src/components/client/file-manager.tsx`
- `client/src/components/client/file-upload-form.tsx`
- `client/src/components/client/file-viewers`
- `client/src/components/client/client-projects.tsx`
- `client/src/components/admin/__tests__/admin-file-upload.test.tsx`
- `client/src/lib/feature-testing-config.ts`
- `server/routes.ts`
- `server/index.ts`
- `server/client-project-routes.ts`
- `server/customer-experience-routes.ts`
- `server/storage.ts`
- `server/database-storage.ts`
- `server/migrate-deliverable-delivery-method.ts`
- `server/migrations/add-process-steps.ts`
- `shared/schema.ts`
- `shared/customer-experience-schema.ts`
- `shared/delivery-methods.ts`
- `scripts/check-hub-features.ts`
- `replit.md`
