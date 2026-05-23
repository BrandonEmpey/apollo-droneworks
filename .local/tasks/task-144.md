---
title: Service visibility toggle + NIRA-style deliverable links
---
# Service Visibility Toggle + NIRA-Style Deliverable Links

## What & Why
Two related admin/client improvements:

1. **Per-service visibility toggle.** Some services are seasonal or temporarily unavailable. Admins need a one-click switch on each service to hide it from clients (booking flow, services page, industry pages, price calculator) without deleting it. The DB already has a `hideFromServicesPage` boolean on `services` that the public pages filter on, but there is no admin UI surfacing it. We will surface it as a clearly labeled "Visible to clients" toggle and make sure every client-facing surface respects it.

2. **External shareable deliverable links (e.g. NIRA.app) with a disclaimer interstitial.** For data-heavy deliverables (point clouds, 3D scans, etc.) the actual asset lives on a third-party viewer like NIRA.app. Admins need to attach a prominently displayed external URL to a deliverable in addition to the existing file upload. When a client clicks the link, they must first see a disclaimer page (we are leaving the Apollo DroneWorks site, third-party terms apply, data hosting/privacy notice) and then continue to the external site.

## Done looks like

**Visibility toggle**
- On the admin Services Management page, every service card / form has a clearly labeled "Visible to clients" switch (on by default).
- Toggling it off immediately removes that service from: the public Services page, Industry pages, the Service Price Calculator dropdown, the booking/quote flow, and any "available add-ons" pickers shown to clients.
- Admins still see the service everywhere in admin views, with a "Hidden" badge so it is obvious.
- The toggle persists across reloads and is reflected via the existing services API.

**NIRA / external deliverable link + disclaimer**
- On the admin Project Deliverables view (and the per-deliverable edit form in admin deliverables management), there is a new "Shareable link (e.g. NIRA.app)" URL field plus a short label/description.
- On the client Deliverables tab, when a deliverable has a shareable link it appears prominently above any download/preview action (large primary button: "View on NIRA" or the configured label).
- Clicking that primary button does NOT navigate directly to the external URL. It first opens an in-app disclaimer interstitial (route: `/external-link?to=...&label=...&deliverable=...`) that:
  - Shows the destination domain (extracted from the URL).
  - Displays a clear notice that the user is leaving Apollo DroneWorks, that third-party terms / privacy apply, and a generic data-hosting note that mentions NIRA when the host matches.
  - Has a "Continue to <domain>" primary action and a "Cancel / go back" secondary action.
  - Continue opens the destination in a new tab with `rel="noopener noreferrer"`.
- The interstitial is reachable to authenticated clients only (admins too) — protected route.
- (Optional, nice-to-have) Service template deliverables can carry a `defaultExternalUrlLabel` so newly generated project deliverables pre-fill the button label.

## Out of scope
- A formal "click-through agreement" log / audit trail of who clicked through (can be added later).
- Embedding the NIRA viewer in an iframe (NIRA generally requires a full page).
- Per-tenant white-label of the disclaimer copy.
- Renaming the existing DB column `hide_from_services_page` (we keep the column to avoid a destructive migration; only the UI label changes).
- Any change to the existing file upload / preview pipeline for deliverables.

## Steps

1. **Schema changes (additive only).** Add `externalUrl` (text, nullable) and `externalUrlLabel` (text, nullable, default e.g. "View deliverable") to `project_deliverables`. Add `defaultExternalUrlLabel` (text, nullable) to `service_deliverables` so templates can pre-fill the label. Update the matching `createInsertSchema` / insert types and re-export. Push with `npm run db:push` (use `--force` only if a data-loss warning appears).

2. **Admin: visibility toggle UI.** In the admin services management page (form and card), add a "Visible to clients" switch bound to the inverse of `hideFromServicesPage`. Add a "Hidden" badge on the admin service card whenever it is off. Make sure the existing PATCH/PUT service endpoint accepts the field (it already maps the column, but verify).

3. **Audit client-facing read sites for the visibility filter.** Confirm and, where missing, add the `!service.hideFromServicesPage` filter to: services section, industry pages, service price calculator, the booking flow service picker, and any "available add-ons" UI shown to clients. Admin views must continue to show all services.

4. **Admin: deliverable external link fields.** Surface `externalUrl` and `externalUrlLabel` inputs in (a) the per-project deliverable editor used inside the project deliverables view and (b) the admin deliverables management page (template editor with `defaultExternalUrlLabel`). When a service template is auto-generating project deliverables for a new booking, copy `defaultExternalUrlLabel` into the new project deliverable's `externalUrlLabel`.

5. **Client: prominent shareable link button.** In the client Deliverables tab, when `externalUrl` is set, render a large primary button ("View on NIRA" / the configured label) above the existing file preview/download. The button routes to the in-app disclaimer interstitial, never directly to the external host.

6. **Disclaimer interstitial route.** Add a new authenticated route `/external-link` that reads the destination URL, the label, and an optional deliverable id from the query string, validates the URL is `https`, parses the host, and shows the disclaimer card with destination domain, third-party notice, NIRA-specific data note when applicable, plus Continue / Cancel actions. Continue opens the destination in a new tab with `rel="noopener noreferrer"` and returns the user to where they came from.

7. **Tests.** Add a unit test for the disclaimer interstitial (renders host, NIRA note appears for nira.app hosts, blocks non-https). Add a snapshot/render test for the admin visibility toggle (off state shows "Hidden" badge). Extend the project-deliverables test to render the shareable link button when `externalUrl` is set and confirm it routes through the interstitial path.

## Relevant files
- `shared/schema.ts:18-99`
- `shared/schema.ts:3188-3268`
- `client/src/pages/admin/services-management.tsx`
- `client/src/pages/admin/__tests__/services-management.test.tsx`
- `client/src/pages/admin/deliverables-management.tsx`
- `client/src/components/client/project-deliverables.tsx`
- `client/src/components/services-section.tsx:40`
- `client/src/components/service-price-calculator.tsx:303`
- `client/src/pages/industry-page.tsx:99`
- `client/src/App.tsx`
- `server/routes.ts`
- `server/storage.ts`