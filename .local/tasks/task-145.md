---
title: Choose delivery method per deliverable on a project
---
# Choose delivery method per deliverable

## What & Why
Right now every project deliverable on a customer's profile shows slots for both an uploaded file and an external link, even when only one will ever be used. This makes the customer view feel cluttered with empty placeholders.

Admins should be able to pick — per individual deliverable on a project — how that deliverable will be delivered (e.g., upload image, upload video, upload document, sharable link, and other types added later). Anything not selected is hidden from the customer's view, so they only see the slots that actually apply to them. By default, no method is selected, so the admin has to make an explicit choice for each deliverable.

The list of delivery method types must be open-ended — image, video, link, and document are just the starting set. The data model and UI should make it straightforward to add more types later (3D model, audio, embedded code, downloadable archive, physical/print delivery, etc.) without rewriting the picker or the customer view.

If multiple deliverables on the same project use the "sharable link" method, they all share the project's single sharable link rather than each having its own — the customer sees one link that covers all link-delivered items.

## Done looks like
- The set of delivery method types lives in one shared place (a single registry/enum with a label, icon, and matching renderer for each type) so adding a new type later is one entry, not a sweep across files.
- The starting set of types is at minimum: Upload Image, Upload Video, Upload Document/File, Sharable Link. The picker also includes "Not selected" as the default state. The plan should make adding more types (audio, 3D model, embedded media, etc.) trivial later.
- When viewing a client's project, the admin sees each deliverable with a small picker listing every available delivery type. The picker is driven by the shared registry, so any future type shows up automatically.
- Each deliverable starts with no delivery method chosen — the admin must pick one before the customer sees anything for it. However, the picker shows a *suggested* type next to the "Not selected" option based on the deliverable's name/service so the admin doesn't have to think for routine cases.
- The suggestion logic uses the existing service-deliverable templates as its source. Roughly:
  - Anything named like "photo / photos / imagery / shots / gallery" → suggest **Image**.
  - Anything named like "video / footage / reel / flyover / tour video / timelapse video" → suggest **Video**.
  - Anything named like "report / documentation / summary / PDF / written findings / annotated / measurement / classification / analysis" → suggest **Document/File**.
  - Technical export deliverables (point cloud, OBJ, GLB, GeoTIFF, CAD, DXF, LAS/LAZ, E57, DEM, BIM, orthomosaic file, mesh) → suggest **Document/File**.
  - Anything named like "viewer access / cloud viewer / web map / interactive hotspots / web tour / mobile tour" → suggest **Sharable Link**.
  - Anything else → no suggestion.
  The admin can always override the suggestion (for example, choosing Sharable Link for a photo deliverable when the photos live on an external gallery service).
- After picking a method on a deliverable, only the matching input is shown to the admin (image upload UI, video upload UI, document upload UI, link entry, etc.). The other inputs are hidden so the admin isn't confused either.
- On the customer's project view, deliverables only render the section corresponding to the chosen method. Deliverables with no method chosen yet are shown as "pending" with no empty upload slots.
- All deliverables on the project that use the "sharable link" method are grouped together and point to the project's single shared link (the existing `shareableLink` on the project). The admin sets that link once at the project level. Customers see one shared-link card listing the deliverables it covers, not one link per deliverable.
- The admin can change a deliverable's delivery method later; switching methods clears the unrelated stored values (e.g., switching from image to link clears the previously uploaded image reference) after a confirmation prompt.
- Existing deliverables that already have a `fileUrl` or `externalUrl` get migrated to the matching method automatically (file → "Upload Document" or "Upload Image"/"Upload Video" based on file type if easily detectable, link → "Sharable Link") so nothing already delivered disappears.

## Out of scope
- Adding new file storage backends or changing how uploads themselves work.
- Per-service-template defaults for delivery method (this is purely a per-deliverable, per-project choice on the admin side).
- Any change to billing, quotes, services configuration, or the service-deliverables admin page.
- Automated tests — they can be added in a follow-up task.
- Actually shipping additional delivery types beyond the starting set — the goal here is just to make adding them later easy.

## Steps
1. **Shared delivery-type registry**: Create one shared module that defines every delivery type as a data entry (id, label, icon, what storage fields it uses, which admin input renders it, which customer renderer displays it). The starting set is image, video, document/file, and link, but the registry is the single source of truth so new types can be appended without touching the picker, the admin form, or the customer view.

2. **Suggestion helper**: Add a small pure helper alongside the registry that takes a deliverable's name (and optionally its service name) and returns a *suggested* type id using the keyword rules in "Done looks like." It returns `null` when nothing matches. This same helper is used by both the admin picker (to highlight a suggestion) and the backfill in step 3.

3. **Schema + migration**: Add a `deliveryMethod` field to project deliverables. Store it as a string keyed to the registry (not a hard-coded SQL enum) so new types don't require a schema migration. Update the insert/select schemas with a Zod check that the value is one of the registry's known ids (or null). Backfill existing rows: if `externalUrl` is set, mark `link`; else if `fileUrl` is set, mark `document` (or `image`/`video` when the extension makes it obvious); else leave null. Existing rows with no data attached stay null but will pick up the suggestion from step 2 when the admin opens the picker.

4. **Backend routes**: Allow setting/updating `deliveryMethod` on a project deliverable. When the method changes, clear the now-irrelevant stored values for that deliverable based on what the registry says the new type uses. Continue using the existing `shareableLink` on the project for the link itself; do not store per-deliverable links anymore.

5. **Admin project view — delivery method picker**: On the admin's per-client project deliverables UI, add a picker on each deliverable that's populated from the shared registry, defaulting to "Not selected" but visually highlighting the suggested type from step 2 (e.g., "Suggested: Image"). When the admin picks a method, render only the input component the registry maps to that type (image upload, video upload, document upload, or — for link — a read-only reference to the project's shared link with a button to set/edit it once at the project level). Show a confirmation prompt if changing the method on a deliverable that already has data attached.

6. **Customer project view**: Update the customer-facing deliverables component so each deliverable renders only the viewer the registry maps to its chosen `deliveryMethod`. Deliverables with no method chosen show a clean "pending" state with no empty upload placeholders. Group all `link`-method deliverables under a single shared-link card that lists which deliverables it covers and links out to the project's `shareableLink`.

7. **Polish**: Make sure status indicators ("pending / in progress / completed") still work correctly per deliverable regardless of method, and that switching methods doesn't lose the deliverable's name, description, or due date.

## Relevant files
- `shared/schema.ts:2121-2144,3189-3237`
- `client/src/pages/admin/deliverables-management.tsx`
- `client/src/components/admin/project-files-manager.tsx`
- `client/src/components/client/project-deliverables.tsx`
- `client/src/components/client/file-manager.tsx`
- `server/storage.ts`
- `server/database-storage.ts`
- `server/client-project-routes.ts`