---
title: Fix 'Cannot delete service' error and surface a friendly message instead
---
# Fix Delete Service Foreign Key Error

## What & Why
Deleting a service from the admin services page fails with a 500 error when the service is referenced by other tables. Reproduced today on "Event Coverage": the server returns
`update or delete on table "services" violates foreign key constraint "service_bundle_discounts_primary_service_id_fkey"`.

Two underlying problems are causing this:

1. **Database drift**: `shared/schema.ts` declares `onDelete: 'cascade'` for the bundle-discount foreign keys, but the live database has them as `NO ACTION`. The DB never picked up the schema change, so cascade deletes don't actually cascade. (Verified — same family of issue as the recent analytics/payroll table drift.)
2. **Schema gap**: `bookings.service_id` has no `onDelete` rule at all. Even after the bundle-discount drift is fixed, a service with any bookings would fail to delete with the same kind of error. Bookings should never be silently destroyed when a service is removed; they should block the delete with a clear message.

The admin UI also surfaces the raw 500 message ("update or delete on table…") instead of something a non-engineer can act on.

## Done looks like
- "Event Coverage" (and any other service) can be deleted from `/admin/services` without a 500 error, even when it has bundle-discount rows pointing to it.
- Deleting a service automatically removes its bundle-discount rows, addons, pricing tiers, subscription tiers, and other always-cascading children — same as before the drift.
- Trying to delete a service that has historical **bookings** gets refused with a friendly message like "Cannot delete 'Event Coverage' — it has 3 bookings. Archive it instead, or remove the bookings first." (HTTP 409, not 500.)
- The toast in the admin services page shows that friendly message, not the raw SQL error.
- The actual database foreign-key rules match what `shared/schema.ts` declares, so future schema changes stay in sync.
- A targeted automated test covers the happy path (delete service with bundle discounts) and the bookings-blocked path.

## Out of scope
- Soft-delete / "archive" support for services (the friendly error mentions archiving, but adding a real archive flag is a future task).
- A bulk "reassign bookings to a different service" tool.
- A general DB-vs-schema reconciliation audit beyond the service-related tables (covered by the existing analytics-schema follow-up task).

## Steps
1. **Make the delete operation defensive in storage.** Update `deleteService` in `database-storage.ts` to run inside a transaction: first count `bookings` for the service and abort with a typed error if any exist, then explicitly delete dependent rows in `service_bundle_discounts` (both `primary_service_id` and `secondary_service_id` matches), then delete the service itself. Mirror the same logic in the in-memory `MemStorage.deleteService` so tests stay aligned. Returning `false` (not throwing) for the bookings case keeps the function shape simple; throw a tagged error class instead so the route can map it to HTTP 409.
2. **Surface a friendly error from the route.** Update the `DELETE /api/services/:id` handler in `routes.ts` to catch the new tagged "has bookings" error and return `409` with `{ message, bookingsCount }`. All other errors stay as 500 but with the cleaner message.
3. **Patch the missing `onDelete` rule in the schema.** Add `{ onDelete: 'restrict' }` to `bookings.serviceId` in `shared/schema.ts` so the database reflects the same intent the route now enforces (restrict, not cascade — bookings are never auto-deleted). Run `npm run db:push --force` to push both the bundle-discount cascade fix and the bookings restrict rule into the live DB. Verify with an `information_schema` query that `service_bundle_discounts_primary_service_id_fkey` and `service_bundle_discounts_secondary_service_id_fkey` are now `CASCADE` and `bookings_service_id_fkey` is `RESTRICT`.
4. **Update the admin services page to show the server message.** In the services management page's delete mutation `onError` handler, prefer the JSON `message` field returned by the server (already passes through `apiRequest`) and feed it into the existing toast instead of a generic "Failed to delete service" string.
5. **Manually test from the admin UI.** Log in as admin, delete "Event Coverage" — should succeed. Create a quick fake bundle discount through the admin and re-delete to confirm cascade still works. Then attempt to delete a service that has at least one booking and confirm the toast shows the friendly count message.
6. **Add a regression test.** Add a vitest spec covering: (a) `deleteService` removes bundle discount rows on both sides and the service itself when there are no bookings; (b) `deleteService` throws the typed "has bookings" error when bookings exist and leaves all rows intact. The route-level 409 mapping can be covered with a thin supertest-style test if convenient, otherwise the storage-level test is sufficient.

Architectural notes:
- Use a single Drizzle transaction in `deleteService` so a partial failure rolls back. Don't rely solely on DB cascade — explicit deletion in code keeps behaviour correct even if the DB drifts again.
- The 409-with-count pattern mirrors how other "blocked by dependent data" errors should be reported app-wide; keep the response shape simple (`{ message: string, bookingsCount: number }`) so future similar handlers can copy it.

## Relevant files
- `server/database-storage.ts:222-225`
- `server/storage.ts:896-915`
- `server/routes.ts:588-600`
- `shared/schema.ts:117-124,1060-1069`
- `client/src/pages/admin/services-management.tsx`
- `client/src/pages/admin/__tests__/services-management.test.tsx`