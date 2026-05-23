# Services Overhaul And Client Portal

## What & Why
Replace the entire service catalog with a new streamlined list of 10 services across 3 categories (Real Estate & Marketing, Property Inspections, Mapping & Modeling), remove the existing client file upload/download/delivery features, and add a new admin "Client Portal / Project Management" tab that lets admins create a project by selecting services and download a ZIP containing the exact folder structure for each selected service. Service folder structures must be admin-editable. Maintain the existing dark professional theme.

## Done looks like
- The public Services page and admin "Manage Services" page show exactly the 10 new services (and only those), grouped under the three categories, with the exact short descriptions, key features, prices, and add-ons listed in the source brief. Existing services not in the new list are removed.
- All service data (name, category, description, features, price, add-ons, folder structure) is persisted in the database and remains fully editable from the admin UI.
- The old client file upload/download/file-sharing/direct-delivery UI and routes are removed from both the admin and client-facing areas; navigation entries pointing at them are gone.
- A new admin tab titled "Client Portal" (under Client Operations) provides:
  - A "Create New Project" button.
  - A Project Name input.
  - A multi-select checklist of all services, grouped by the three categories.
  - A live preview of the exact folder tree that will be generated based on the current selection.
  - A "Generate & Download Project Folder" button that downloads a ZIP containing the selected service folders, each matching the exact tree from the brief, with a `README.md` at the root and inside each service folder explaining the phases.
  - A success toast/message after generation including a direct link to the Client Portal.
- In Manage Services (or a clearly-linked sub-section), each service has an editor for its folder structure (tree editor or JSON editor) that is used by the ZIP generator.
- Dark theme and existing layout/components are preserved throughout.

## Out of scope
- Building a client-facing portal for clients to view/download projects (admin-side only for this task).
- Cloud storage integration; ZIPs are generated and streamed on demand.
- Migrating any historical client_files data — it is removed along with the feature.
- Changes to bookings, finance, CRM, trust admin, or marketing modules beyond what's needed to drop dead links to the removed file features.

## Steps
1. **Schema & seed data** — Add a `folderStructure` (JSON) column to the `services` table so each service stores its tree. Define the 10 new services (with category, price, short description, key features, add-ons, and the exact folder tree from the brief) as canonical seed data, and add a one-time seed/replace routine that wipes existing services + add-ons and inserts the new set. Ensure the three categories are represented consistently for grouping in the UI.

2. **Remove old client file features** — Delete the client file upload/download/file-sharing UI (file manager component, any "Files"/"Deliverables" tabs on client and admin pages), remove the corresponding server routes and `client_files` storage methods, drop the table, and clean up navigation entries and unused upload directories. Verify no remaining imports reference the removed modules.

3. **Manage Services updates** — Update the admin Manage Services editor so it displays/edits the new services with the new fields (category grouping, key features list, add-ons list, price), and add a folder-structure editor (tree or JSON) per service that round-trips to the new `folderStructure` column. Update the public Services page to render the new categorized list and content.

4. **Client Portal admin tab** — Add a new "Client Portal" tab inside the Client Operations admin hub with the Create New Project flow: project name input, grouped multi-select of services, and a live folder-tree preview that reflects the current selection by reading each service's `folderStructure`.

5. **ZIP generation endpoint and download** — Add a server endpoint that accepts a project name and a list of service IDs, builds the combined folder tree using each service's stored `folderStructure`, generates README.md files at the project root and inside each service folder describing the phases, and streams a ZIP (using `jszip`) back to the browser. Wire the "Generate & Download Project Folder" button to call it and show a success toast with a link back to the Client Portal.

6. **Polish and verification** — Confirm dark theme styling on all new screens, confirm the public Services page matches the brief exactly (prices, descriptions, features, add-ons), and manually test creating a project with various service combinations to confirm the downloaded ZIP matches the specified trees and includes the README files.

## Relevant files
- `shared/schema.ts`
- `server/routes.ts`
- `server/storage.ts`
- `server/client-routes.ts`
- `client/src/pages/admin/services-management.tsx`
- `client/src/pages/admin/admin-overview.tsx`
- `client/src/components/client/file-manager.tsx`
