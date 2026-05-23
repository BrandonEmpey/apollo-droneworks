---
title: Replace full service and add-on catalog with the 10 owner-specified services
---
# Replace Full Service & Add-on Catalog

## What & Why
Wipe every existing service and add-on from the database and seed exactly the 10 services the owner specified, each with its own dedicated add-ons at the prices listed. Service images must look like they were taken in the Southern Utah / St. George area (aerial perspective, no aircraft in frame).

## Done looks like
- Exactly 10 services exist in the database — no more, no less — matching the names, descriptions, prices, categories, features, and folder structures below.
- Every old add-on is deleted; only the add-ons listed per service exist, linked to their correct service.
- Each service card on the public site and in the admin panel shows a Southern Utah aerial image.
- `server/init-db.ts` canonical guard is updated so the app seeds these 10 on first run and skips re-seeding if all 10 are already present.
- `scripts/replace-services.ts` is updated to match the same canonical list so it can be run manually if needed.

## Out of scope
- Changes to booking, quote, or checkout logic
- Subscription pricing (no service in the new list uses subscriptions)
- Admin UI redesign

## Steps

1. **Generate Southern Utah aerial images** — Use the AI image generation tool to produce one image per service (10 total). Each prompt must describe an aerial/bird's-eye view of a scene relevant to that service located in the red-rock / desert landscape of St. George / Southern Utah. No drones, aircraft, propellers, watermarks, text, or logos may appear in any image. Save each image to `public/uploads/` and note the paths.

2. **Wipe and reseed add-ons** — In `scripts/replace-services.ts` (and mirrored in `server/init-db.ts`): delete all rows from `service_addons` and `addons`, then insert the new add-ons from the list below as individual rows in the `addons` table.

3. **Wipe and reseed services** — Delete all rows from `services`, then insert the 10 services below with their correct name, short description, price (in cents), category, features array, folder structure, and the image URL from step 1.

4. **Link add-ons to services** — Insert `service_addons` rows linking each service's ID to its specific add-on IDs from step 2. No add-on should be shared globally — each is tied only to the service(s) it was listed under.

5. **Update the canonical guard in `server/init-db.ts`** — Replace `CANONICAL_NAMES` with the new 10 service names so the app correctly skips re-seeding on restart when they already exist.

---

## Canonical Service Catalog

### Real Estate Aerial Services

**Real Estate Listings** | Category: Real Estate & Aerial Services | Price: range $119–$329 (use `pricingType: "range_based"`, set base `price` to 11900 cents with a `priceRanges` entry covering $119–$329 and label "4 value-packed packages")
- Description: Professional drone photography and video that makes properties stand out on MLS, websites, and social media. Choose from four value-packed packages.
- Features: High-resolution aerial photos and cinematic video with DJI Air 3S, Professional color correction, straightening, and enhancement, Fast 48-hour digital delivery via secure gallery, Watermark-free files optimized for MLS and web use, FAA Part 107 compliant with full insurance, Local travel included in 84780 / St. George area, Subtle logo option available, Expert pilot with real estate marketing experience
- Folder structure: 01_Raw_Photos, 02_Edited_Photos, 03_Final_Delivery, 04_Client_Gallery
- Add-ons: Twilight/Golden Hour ($49), Same-day delivery ($35), Extra 5 photos ($30), Extend video ($40), Lot-line overlays ($25), Social Media Content package ($79)

**Property Tours** | Category: Real Estate & Aerial Services | Price: $349
- Description: Immersive cinematic drone tours that give buyers a complete understanding of the property layout, surroundings, and key features.
- Features: Full cinematic video tour with smooth transitions and music, High-resolution aerial photos included, Optional 360° virtual tour integration, Professional editing with text overlays and pacing, Optimized for websites, MLS, and virtual showings, Fast 48-hour delivery, Local St. George area travel included, Expert shot planning based on your listing needs
- Folder structure: 01_Raw_Footage, 02_Edited_Tour, 03_Final_Video, 04_Photos
- Add-ons: Twilight/Golden Hour ($49), Same-day ($30), Voice-over ($75), Extended tour ($60), Social Media Content ($79), 360° integration ($99)

**Promotional Content** | Category: Real Estate & Aerial Services | Price: $399
- Description: Custom aerial imagery and video for businesses, events, grand openings, resorts, and marketing campaigns.
- Features: Dynamic before-and-after shots and scenic overviews, Professional cinematic video with music and transitions, High-resolution stills for print and digital use, Trending vertical formats for social platforms, Creative concept development with client input, Fast turnaround and multiple file formats, Local travel in 84780 area included, Brand-elevating visuals that capture attention
- Folder structure: 01_Raw_Photos, 02_Raw_Footage, 03_Edited_Content, 04_Social_Formats, 05_Final_Delivery
- Add-ons: Twilight/Golden Hour ($49), Same-day ($35), Extra video ($75), Social Media Content ($79), Custom voice-over ($60), Extended event coverage ($150)

### Property Inspections

**Roof Inspections** | Category: Property Inspections | Price: $179
- Description: Safe, detailed drone roof inspections for residential and commercial properties without ladders or risk.
- Features: Close-up high-resolution imagery of all roof surfaces, Damage assessment (hail, storm, wear), Annotated photos highlighting issues, Professional PDF inspection report, Fast 24–48 hour delivery, FAA compliant and fully insured, Local St. George service, Ideal for homeowners, property managers, and adjusters
- Folder structure: 01_Raw_Inspection_Photos, 02_Annotated_Images, 03_Inspection_Report
- Add-ons: Same-day report ($30), Thermal imaging ($99), Detailed written summary ($40), Follow-up re-inspection ($99)

**Property & Site Evaluation** | Category: Property Inspections | Price: $299
- Description: Comprehensive aerial inspection and analysis for pre-purchase due diligence, condition assessment, development planning, and insurance documentation.
- Features: High-resolution aerial photos and video of entire property, Detailed visual condition assessment, Annotated images and professional summary report, Insurance-ready documentation for claims, Layout, surroundings, and neighborhood context, Fast 48-hour delivery, Local 84780 area travel included, Perfect for investors, buyers, sellers, and adjusters
- Folder structure: 01_Raw_Photos, 02_Raw_Footage, 03_Annotated_Report, 04_Final_Delivery
- Add-ons: Twilight/Golden Hour ($49), Same-day ($35), Advanced annotated report ($50), Thermal imaging ($99), Follow-up site visit ($99)

**Infrastructure & Structure Inspections** | Category: Property Inspections | Price: $349
- Description: Professional drone inspections of cell towers, antennas, utility structures, bridges, and other hard-to-reach infrastructure.
- Features: Safe, high-resolution close-up imagery, Detailed visual integrity assessment, Annotated photos and compliance documentation, Professional PDF report, No need for expensive climbing crews, Fast turnaround, Fully insured and FAA compliant, Local service in southern Utah
- Folder structure: 01_Raw_Inspection_Photos, 02_Annotated_Images, 03_Compliance_Report, 04_Final_Delivery
- Add-ons: Thermal imaging ($99), Same-day preliminary report ($40), Advanced structural analysis ($75), Repeat inspection package 3 visits ($250 discount — store as -25000 cents)

### Mapping & Modeling

**Construction Planning & Monitoring** | Category: Mapping & Modeling | Price: $549
- Description: High-accuracy drone surveying for point clouds, topographic maps, volume calculations, and ongoing construction progress monitoring.
- Features: Dense point cloud generation, Topographic maps and contour lines, Accurate stockpile / earthwork volume calculations, Regular progress monitoring flights, Before/after comparison overlays, GIS-ready deliverables (LAS, DEM, etc.), Professional reports with visuals, Local 84780 area service
- Folder structure: 01_Raw_Images, 02_Point_Cloud, 03_Topographic_Maps, 04_Progress_Reports, 05_GIS_Export
- Add-ons: Additional monitoring flight ($199), Advanced volumetric ($75), Same-day data ($50), Custom CAD/GIS exports ($60)

**3D Modeling** | Category: Mapping & Modeling | Price: $599
- Description: Professional as-built 3D models and point clouds created from drone photogrammetry for documentation, verification, and project visualization.
- Features: Dense photogrammetry data capture, Accurate 3D model creation, Point cloud generation and cleanup, Multiple export formats (OBJ, FBX, etc.), Walkthrough video included, Ideal for BIM, engineering, and as-built records, High precision with your Air 3S, Fast professional delivery
- Folder structure: 01_Raw_Images, 02_Point_Cloud, 03_Mesh_Model, 04_Textured_Model, 05_Walkthrough_Video, 06_Final_Export
- Add-ons: Additional refinement ($75), 3D walkthrough video upgrade ($50), CAD integration ($99), Rush processing ($60)

**Orthomosaic** | Category: Mapping & Modeling | Price: $299
- Description: High-resolution, geo-referenced 2D stitched maps perfect for site planning, documentation, and measurements.
- Features: Accurate overlapping grid flight capture, Seamless high-resolution orthomosaic image, Geo-referenced for GIS use, Measurable scale and dimensions, Professional editing and export, Fast 48-hour delivery, Local travel included, Great foundation for further mapping work
- Folder structure: 01_Raw_Images, 02_Processed_Orthomosaic, 03_GIS_Export, 04_Final_Delivery
- Add-ons: Contour lines/elevation data ($50), Same-day ($40), CAD/GIS integration ($60)

**Timelapse Creation** | Category: Mapping & Modeling | Price: $549
- Description: Dynamic construction progress timelapse videos documenting changes over days, weeks, or months.
- Features: Professional camera positioning and interval setup, Multi-day or multi-week capture, Stabilized, color-graded final video, Speed ramping and cinematic editing, Music and text overlays available, Raw frames available upon request, Ideal for project marketing and records, Local southern Utah service
- Folder structure: 01_Raw_Frames, 02_Processed_Timelapse, 03_Final_Video, 04_Archive
- Add-ons: Extended capture period ($150/week — store as 15000 cents), 4K cinematic upgrade ($75), Same-day preview clips ($40), Multiple angle timelapse ($99)

## Relevant files
- `server/init-db.ts:17-156`
- `scripts/replace-services.ts`
- `shared/addons-schema.ts`
- `shared/schema.ts:18-100`