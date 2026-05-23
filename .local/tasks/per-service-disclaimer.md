# Per-Service Disclaimer

## What & Why
Admins need a place to write a unique disclaimer for each service (think "weather-dependent, scheduled date may shift" or "FAA waivers required for tower inspections"). The disclaimer is added in the same admin services editor where the service description and tooltip description already live, and it then appears in two customer-visible places:

1. On that service's public service page.
2. On every customer receipt (on-screen, printed, downloaded PDF, and emailed).

This gives the customer the legal/expectation language attached to a service at the moment they're researching it and again when they pay for it.

## Done looks like
- In the admin services editor, there is a new "Disclaimer" textarea field directly alongside the existing "Tooltip Description" and "About This Service" fields. Saving a service stores the disclaimer.
- The customer service page shows that disclaimer in a clearly styled callout block (e.g. bordered box with a small "Disclaimer" label) under the service description. If the disclaimer is empty, nothing renders.
- The customer receipt includes one disclaimer block per service on the receipt that actually has a disclaimer, placed just above the "Thank you for choosing Apollo DroneWorks" footer.
- The disclaimer appears the same way in:
  - the on-screen receipt card,
  - the popup window opened by the Print Receipt button,
  - the downloaded PDF,
  - the HTML email sent by the Email Receipt button.
- A service with no disclaimer set behaves exactly like today (nothing extra renders).

## Out of scope
- Snapshotting the disclaimer onto the booking row itself. The disclaimer is read live from the service. (If we ever change a disclaimer for a service, past receipts pulled up later will reflect the current text. We can revisit this later if the user wants historical immutability.)
- Per-tier or per-add-on disclaimers. Disclaimer is a single field on the service.
- Translating / localizing the disclaimer.
- Surfacing the disclaimer anywhere else (booking confirmation emails, project dashboards, quote PDFs) — only the service page and the receipt as requested.
- Database migrations beyond adding the new nullable column via the standard schema-push flow.

## Steps
1. **Schema** — Add a nullable `disclaimer` text column to the `services` table and include it in the service insert schema, then push the schema change. No backfill required.
2. **Admin editor** — Add a "Disclaimer" textarea form field in the admin services editor next to the Tooltip Description / About This Service fields, wire it into the form's default values, validation, create/edit submit payload, and the per-service load that pre-fills the form when editing an existing service.
3. **Public service page** — Render the disclaimer as a small, visually distinct callout block (label + body) directly under the existing service description block. Render nothing when the field is empty.
4. **Customer receipt (shared component)** — In the shared printable receipt component, render a "Service Disclaimers" section listing one block per service in the receipt that has a disclaimer, placed just above the footer. Make sure the styles work in both the dark on-screen card and the light printable/PDF output (the print stylesheet inside the same file controls the popup; the PDF export rasterizes the on-screen DOM, so the on-screen block must look acceptable when scaled into the PDF too).
5. **Email receipt template** — In the `/api/receipts/:id/email` handler, include the same disclaimer section in the HTML email body, using the existing `escHtml` helper. Reuse the receipt's already-loaded list of services (no new query needed).

### Notes / constraints
- Read disclaimers live from the `services` table on the receipt. Don't snapshot onto bookings.
- Show one block per disclaiming service on the receipt; if no service in the receipt has a disclaimer, render nothing (don't show an empty section header).
- Keep the print-popup styles in `printable-receipt.tsx` consistent with the on-screen styles so the printed and downloaded versions match.

## Relevant files
- `shared/schema.ts:22-103,455-465`
- `client/src/pages/admin/services-management.tsx:25-50,135-145,460-470,1015-1054`
- `client/src/pages/service-page-fixed.tsx:490-510`
- `client/src/components/client/printable-receipt.tsx`
- `server/routes.ts:1119-1290`
