---
title: Replace Orthomosaic with new Aerial Mapping service
---
# Replace Orthomosaic with Aerial Mapping Service

## What & Why
Remove the existing "Orthomosaic" service and replace it with a new "Aerial Mapping" service at $250. Update all bundle suggestions, folder structures, category ordering, and client portal project creation logic to reflect the new service.

## Done looks like
- The Orthomosaic service no longer appears anywhere in the app (services list, service detail pages, bundles, calculator, category views).
- "Aerial Mapping" at $250 appears in its place with the correct description, features, and add-ons:
  - Orthomosaic Map (included in base)
  - Topographic Contour Map: +$99
  - Digital Elevation Model (DEM): +$99
  - Digital Terrain Model (DTM): +$119
  - Basic Volumetric / Stockpile Report: +$129
  - Contour Lines + Elevation Data Package: +$149
  - Advanced Mapping Package (Ortho + DEM + Contours): +$199
  - Custom CAD/GIS Export & Layering: +$75
  - Same-day Delivery: +$40
- Bundle suggestions throughout the app show these Aerial Mapping combinations with correct prices and savings:
  - Real Estate Listings + Aerial Mapping → $349–$559 (save $20–$40)
  - Property Tours + Aerial Mapping → $549 (save $50)
  - Promotional Content + Aerial Mapping → $599 (save $50)
  - Roof Inspections + Aerial Mapping → $399 (save $30)
  - Property & Site Evaluation + Aerial Mapping → $499 (save $50)
  - Infrastructure & Structure Inspections + Aerial Mapping → $549 (save $50)
  - Construction Planning & Monitoring + Aerial Mapping → $699 (save $100)
  - 3D Modeling + Aerial Mapping → $749 (save $100)
  - Timelapse Creation + Aerial Mapping → $699 (save $100)
- The Mapping & Modeling category lists services in this order: Construction Planning & Monitoring, Aerial Mapping, 3D Modeling, Timelapse Creation.
- The client portal ZIP download uses this folder structure for Aerial Mapping projects:
  ```
  Aerial_Mapping/
  ├── 01_Flight_&_Data_Capture/
  ├── 02_Processing/
  │   ├── Orthomosaic/
  │   ├── Elevation_Data/
  │   ├── Contour_Maps/
  │   └── Volumetric_Reports/
  ├── 03_Deliverables/
  │   ├── GIS_Files/
  │   ├── CAD_Exports/
  │   └── Client_Formats/
  ├── Raw_Data/
  ├── Edited_Assets/
  └── README.md
  ```
- All other services and their folder structures are unchanged.
- The dark professional theme and all existing functionality remain intact.

## Out of scope
- Changing any service other than Orthomosaic → Aerial Mapping.
- Modifying payment/Stripe integration for the new service.
- Creating new pages — only updating existing service data and UI references.

## Steps
1. **Update the canonical service definition** — In `server/init-db.ts`, replace the Orthomosaic entry with Aerial Mapping: name, price (25000 cents = $250), short description, key features, category (Mapping & Modeling), and the new add-on list. Update the folder structure array to match the new Aerial_Mapping hierarchy (flattened to the nested paths needed for the ZIP generator). Also update any Orthomosaic references in `scripts/replace-services.ts` and `scripts/seed-folder-structures.ts`.

2. **Update the live database record** — Add a one-time migration script or use an existing migration pattern to UPDATE the existing Orthomosaic row in the `services` table: rename it to Aerial Mapping, set the new price, description, features JSON, and folder_structure array. Also update or replace associated add-on rows in the `addons` table to match the new add-on list. Run the migration.

3. **Fix service-page ID-specific logic** — In `client/src/pages/service-page-fixed.tsx`, remove or update any hardcoded `service.id === 6` (Orthomosaic) checks so they correctly apply to the Aerial Mapping service. Update the "Recommended Bundles" keyword rules so "mapping" / "aerial" pairings reflect the new bundle combinations and prices listed above.

4. **Update bundle suggestions in the price calculator** — In `client/src/components/service-price-calculator.tsx`, update `generateBundleSuggestions` and `calculatePricing` so the Aerial Mapping service participates in the correct bundle pairings with the correct discounted prices and savings amounts.

5. **Update category ordering** — Wherever the Mapping & Modeling category services are ordered or listed (init-db.ts, admin services management, or any frontend category component), ensure the display order is: Construction Planning & Monitoring, Aerial Mapping, 3D Modeling, Timelapse Creation.

6. **Update client portal ZIP logic** — In `server/routes.ts` (the `/api/admin/client-portal/download-zip` endpoint), ensure the nested Aerial Mapping folder structure (including sub-folders under `02_Processing/` and `03_Deliverables/`) is correctly generated. The existing logic iterates `folderStructure` as a flat array, so represent nested paths as `"02_Processing/Orthomosaic"`, `"02_Processing/Elevation_Data"`, etc., in the database array so the ZIP builder creates the correct hierarchy.

## Relevant files
- `server/init-db.ts`
- `scripts/replace-services.ts`
- `scripts/seed-folder-structures.ts`
- `client/src/pages/service-page-fixed.tsx`
- `client/src/components/service-price-calculator.tsx`
- `server/routes.ts`
- `shared/schema.ts`