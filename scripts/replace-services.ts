import { db } from '../server/db';
import { sql } from 'drizzle-orm';

// ─── 10 canonical services ────────────────────────────────────────────────────
const CANONICAL_SERVICES = [
  // ── Real Estate & Aerial Services ──────────────────────────────────────────
  {
    name: "Real Estate Listings",
    description: "Professional drone photography and video that makes properties stand out on MLS, websites, and social media. Choose from four value-packed packages.",
    price: 11900,
    pricingType: "range_based",
    priceRanges: JSON.stringify([{ minPrice: 11900, maxPrice: 32900, label: "4 value-packed packages" }]),
    category: "Real Estate & Aerial Services",
    folderStructure: "{01_Raw_Photos,02_Edited_Photos,03_Final_Delivery,04_Client_Gallery}",
    imageUrl: "/uploads/svc-real-estate-listings.png",
    features: JSON.stringify([
      "High-resolution aerial photos and cinematic video with DJI Air 3S",
      "Professional color correction, straightening, and enhancement",
      "Fast 48-hour digital delivery via secure gallery",
      "Watermark-free files optimized for MLS and web use",
      "FAA Part 107 compliant with full insurance",
      "Local travel included in 84780 / St. George area",
      "Subtle logo option available",
      "Expert pilot with real estate marketing experience"
    ]),
  },
  {
    name: "Property Tours",
    description: "Immersive cinematic drone tours that give buyers a complete understanding of the property layout, surroundings, and key features.",
    price: 34900,
    pricingType: "flat",
    priceRanges: JSON.stringify([]),
    category: "Real Estate & Aerial Services",
    folderStructure: "{01_Raw_Footage,02_Edited_Tour,03_Final_Video,04_Photos}",
    imageUrl: "/uploads/svc-property-tours.png",
    features: JSON.stringify([
      "Full cinematic video tour with smooth transitions and music",
      "High-resolution aerial photos included",
      "Optional 360° virtual tour integration",
      "Professional editing with text overlays and pacing",
      "Optimized for websites, MLS, and virtual showings",
      "Fast 48-hour delivery",
      "Local St. George area travel included",
      "Expert shot planning based on your listing needs"
    ]),
  },
  {
    name: "Promotional Content",
    description: "Custom aerial imagery and video for businesses, events, grand openings, resorts, and marketing campaigns.",
    price: 39900,
    pricingType: "flat",
    priceRanges: JSON.stringify([]),
    category: "Real Estate & Aerial Services",
    folderStructure: "{01_Raw_Photos,02_Raw_Footage,03_Edited_Content,04_Social_Formats,05_Final_Delivery}",
    imageUrl: "/uploads/svc-promotional-content.png",
    features: JSON.stringify([
      "Dynamic before-and-after shots and scenic overviews",
      "Professional cinematic video with music and transitions",
      "High-resolution stills for print and digital use",
      "Trending vertical formats for social platforms",
      "Creative concept development with client input",
      "Fast turnaround and multiple file formats",
      "Local travel in 84780 area included",
      "Brand-elevating visuals that capture attention"
    ]),
  },
  // ── Property Inspections ────────────────────────────────────────────────────
  {
    name: "Roof Inspections",
    description: "Safe, detailed drone roof inspections for residential and commercial properties without ladders or risk.",
    price: 17900,
    pricingType: "flat",
    priceRanges: JSON.stringify([]),
    category: "Property Inspections",
    folderStructure: "{01_Raw_Inspection_Photos,02_Annotated_Images,03_Inspection_Report}",
    imageUrl: "/uploads/svc-roof-inspections.png",
    features: JSON.stringify([
      "Close-up high-resolution imagery of all roof surfaces",
      "Damage assessment (hail, storm, wear)",
      "Annotated photos highlighting issues",
      "Professional PDF inspection report",
      "Fast 24–48 hour delivery",
      "FAA compliant and fully insured",
      "Local St. George service",
      "Ideal for homeowners, property managers, and adjusters"
    ]),
  },
  {
    name: "Property & Site Evaluation",
    description: "Comprehensive aerial inspection and analysis for pre-purchase due diligence, condition assessment, development planning, and insurance documentation.",
    price: 29900,
    pricingType: "flat",
    priceRanges: JSON.stringify([]),
    category: "Property Inspections",
    folderStructure: "{01_Raw_Photos,02_Raw_Footage,03_Annotated_Report,04_Final_Delivery}",
    imageUrl: "/uploads/svc-property-site-evaluation.png",
    features: JSON.stringify([
      "High-resolution aerial photos and video of entire property",
      "Detailed visual condition assessment",
      "Annotated images and professional summary report",
      "Insurance-ready documentation for claims",
      "Layout, surroundings, and neighborhood context",
      "Fast 48-hour delivery",
      "Local 84780 area travel included",
      "Perfect for investors, buyers, sellers, and adjusters"
    ]),
  },
  {
    name: "Infrastructure & Structure Inspections",
    description: "Professional drone inspections of cell towers, antennas, utility structures, bridges, and other hard-to-reach infrastructure.",
    price: 34900,
    pricingType: "flat",
    priceRanges: JSON.stringify([]),
    category: "Property Inspections",
    folderStructure: "{01_Raw_Inspection_Photos,02_Annotated_Images,03_Compliance_Report,04_Final_Delivery}",
    imageUrl: "/uploads/svc-infrastructure-inspections.png",
    features: JSON.stringify([
      "Safe, high-resolution close-up imagery",
      "Detailed visual integrity assessment",
      "Annotated photos and compliance documentation",
      "Professional PDF report",
      "No need for expensive climbing crews",
      "Fast turnaround",
      "Fully insured and FAA compliant",
      "Local service in southern Utah"
    ]),
  },
  // ── Mapping & Modeling ──────────────────────────────────────────────────────
  {
    name: "Construction Planning & Monitoring",
    description: "High-accuracy drone surveying for point clouds, topographic maps, volume calculations, and ongoing construction progress monitoring.",
    price: 54900,
    pricingType: "flat",
    priceRanges: JSON.stringify([]),
    category: "Mapping & Modeling",
    folderStructure: "{01_Raw_Images,02_Point_Cloud,03_Topographic_Maps,04_Progress_Reports,05_GIS_Export}",
    imageUrl: "/uploads/svc-construction-planning.png",
    features: JSON.stringify([
      "Dense point cloud generation",
      "Topographic maps and contour lines",
      "Accurate stockpile / earthwork volume calculations",
      "Regular progress monitoring flights",
      "Before/after comparison overlays",
      "GIS-ready deliverables (LAS, DEM, etc.)",
      "Professional reports with visuals",
      "Local 84780 area service"
    ]),
  },
  {
    name: "Aerial Mapping",
    description: "High-accuracy orthomosaic maps and advanced 2D data products for site planning, land surveying, and precision analysis. Every package includes a geo-referenced orthomosaic map with optional elevation, contour, and volumetric add-ons.",
    price: 25000,
    pricingType: "flat",
    priceRanges: JSON.stringify([]),
    category: "Mapping & Modeling",
    folderStructure: "{01_Flight_&_Data_Capture,02_Processing/Orthomosaic,02_Processing/Elevation_Data,02_Processing/Contour_Maps,02_Processing/Volumetric_Reports,03_Deliverables/GIS_Files,03_Deliverables/CAD_Exports,03_Deliverables/Client_Formats,Raw_Data,Edited_Assets}",
    imageUrl: "/uploads/svc-aerial-mapping.png",
    features: JSON.stringify([
      "Orthomosaic map included in every package",
      "Geo-referenced for accurate real-world measurements",
      "Topographic contour maps and elevation data available",
      "Digital Elevation Model (DEM) and Digital Terrain Model (DTM) outputs",
      "Volumetric and stockpile calculations",
      "GIS-ready and CAD-compatible export formats",
      "Measurable dimensions and scale for planning",
      "Professional delivery in 48 hours"
    ]),
  },
  {
    name: "3D Modeling",
    description: "Professional as-built 3D models and point clouds created from drone photogrammetry for documentation, verification, and project visualization.",
    price: 59900,
    pricingType: "flat",
    priceRanges: JSON.stringify([]),
    category: "Mapping & Modeling",
    folderStructure: "{01_Raw_Images,02_Point_Cloud,03_Mesh_Model,04_Textured_Model,05_Walkthrough_Video,06_Final_Export}",
    imageUrl: "/uploads/svc-3d-modeling.png",
    features: JSON.stringify([
      "Dense photogrammetry data capture",
      "Accurate 3D model creation",
      "Point cloud generation and cleanup",
      "Multiple export formats (OBJ, FBX, etc.)",
      "Walkthrough video included",
      "Ideal for BIM, engineering, and as-built records",
      "High precision with DJI Air 3S",
      "Fast professional delivery"
    ]),
  },
  {
    name: "Timelapse Creation",
    description: "Dynamic construction progress timelapse videos documenting changes over days, weeks, or months.",
    price: 54900,
    pricingType: "flat",
    priceRanges: JSON.stringify([]),
    category: "Mapping & Modeling",
    folderStructure: "{01_Raw_Frames,02_Processed_Timelapse,03_Final_Video,04_Archive}",
    imageUrl: "/uploads/svc-timelapse-creation.png",
    features: JSON.stringify([
      "Professional camera positioning and interval setup",
      "Multi-day or multi-week capture",
      "Stabilized, color-graded final video",
      "Speed ramping and cinematic editing",
      "Music and text overlays available",
      "Raw frames available upon request",
      "Ideal for project marketing and records",
      "Local southern Utah service"
    ]),
  },
];

// ─── Canonical add-ons ────────────────────────────────────────────────────────
// Each entry: { name, description, price (cents), tooltipDescription }
// Shared add-ons (index 0-3) will be linked to multiple services.
const CANONICAL_ADDONS = [
  // 0 – shared across multiple services
  { name: "Twilight / Golden Hour",      price: 4900,  description: "Golden hour or twilight shoot for dramatic lighting",              tooltip: "Adds a separate golden-hour or twilight flight" },
  { name: "Same-day delivery",           price: 3500,  description: "Expedited same-day delivery of edited files",                      tooltip: "Receive your edited files the same day as your shoot" },
  { name: "Social Media Content",        price: 7900,  description: "Vertical / square crops and reels optimized for social platforms", tooltip: "Vertical and square formats ready to post" },
  { name: "Thermal imaging",             price: 9900,  description: "Add thermal / infrared imaging to your inspection",                tooltip: "Detects heat anomalies invisible to a standard camera" },

  // 4-6 – Real Estate Listings
  { name: "Extra 5 photos",             price: 3000,  description: "Add 5 additional edited photos to your package",                  tooltip: "+5 professionally edited aerial photos" },
  { name: "Extend video",               price: 4000,  description: "Extend your video to a longer duration",                          tooltip: "Longer finished video cut" },
  { name: "Lot-line overlays",          price: 2500,  description: "Add property lot-line overlays to aerial images",                 tooltip: "Highlight exact parcel boundaries on your photos" },

  // 7-10 – Property Tours
  { name: "Same-day (tours)",           price: 3000,  description: "Same-day delivery of edited tour footage",                        tooltip: "Tour delivered the same day as the shoot" },
  { name: "Voice-over",                 price: 7500,  description: "Professional voice-over narration added to your video",           tooltip: "Script-based narration recorded by a professional" },
  { name: "Extended tour",              price: 6000,  description: "Longer cinematic tour with additional scenes",                    tooltip: "More footage, more scenes, longer runtime" },
  { name: "360° virtual tour integration", price: 9900, description: "Full 360° virtual tour integrated with your video",            tooltip: "Embed an interactive 360° tour alongside your video" },

  // 11-13 – Promotional Content
  { name: "Extra promotional video",    price: 7500,  description: "Additional promotional video cut for your campaign",              tooltip: "Extra edited video clip for marketing" },
  { name: "Custom voice-over",          price: 6000,  description: "Custom branded voice-over for promotional content",               tooltip: "Tailored narration written and recorded for your brand" },
  { name: "Extended event coverage",    price: 15000, description: "Extended aerial coverage for larger events or venues",            tooltip: "Additional flight time covering more of your event" },

  // 14-16 – Roof Inspections
  { name: "Same-day report",            price: 3000,  description: "Receive your inspection report same day",                         tooltip: "Report delivered within hours of inspection" },
  { name: "Detailed written summary",   price: 4000,  description: "Expanded written narrative accompanying annotated photos",        tooltip: "More detailed written breakdown of findings" },
  { name: "Follow-up re-inspection",    price: 9900,  description: "Follow-up drone inspection after repairs are completed",          tooltip: "Verify repairs were made correctly" },

  // 17-18 – Property & Site Evaluation
  { name: "Advanced annotated report",  price: 5000,  description: "Expanded annotated image report with detailed notes",             tooltip: "More thorough annotation and written commentary" },
  { name: "Follow-up site visit",       price: 9900,  description: "Return site visit for updated evaluation",                        tooltip: "Re-inspect after changes or construction" },

  // 19-21 – Infrastructure & Structure Inspections
  { name: "Same-day preliminary report", price: 4000, description: "Preliminary findings report delivered same day",                  tooltip: "Quick summary of findings on inspection day" },
  { name: "Advanced structural analysis", price: 7500, description: "In-depth analysis with engineering-level commentary",            tooltip: "Detailed structural integrity findings" },
  { name: "Repeat inspection package", price: -25000, description: "Package of 3 inspection visits at a discounted rate",             tooltip: "Bundle 3 inspections for significant savings" },

  // 22-25 – Construction Planning & Monitoring
  { name: "Additional monitoring flight", price: 19900, description: "One extra scheduled monitoring flight",                         tooltip: "Add another flight to your monitoring schedule" },
  { name: "Advanced volumetric analysis", price: 7500,  description: "Detailed earthwork and volume calculation report",              tooltip: "Precise stockpile and cut/fill calculations" },
  { name: "Same-day data delivery",     price: 5000,   description: "Processed data delivered the same day",                         tooltip: "Faster turnaround on point clouds and reports" },
  { name: "Custom CAD/GIS exports",     price: 6000,   description: "Deliverables formatted for your CAD or GIS platform",            tooltip: "Files ready to import into your preferred software" },

  // 26-29 – 3D Modeling
  { name: "Additional model refinement", price: 7500,  description: "Extra refinement pass on your 3D model",                        tooltip: "Cleaner geometry and higher fidelity output" },
  { name: "3D walkthrough video upgrade", price: 5000, description: "Upgraded cinematic walkthrough video of your model",             tooltip: "Polished animated walkthrough instead of basic export" },
  { name: "CAD integration",            price: 9900,   description: "Deliverables formatted for CAD software integration",            tooltip: "Import-ready files for AutoCAD, Revit, etc." },
  { name: "Rush processing",            price: 6000,   description: "Expedited processing and delivery of your 3D model",             tooltip: "Move to the front of the processing queue" },

  // 30-37 – Aerial Mapping
  { name: "Topographic Contour Map",    price: 9900,   description: "Contour map overlaid on your orthomosaic for terrain analysis",  tooltip: "Precise elevation contour lines derived from flight data" },
  { name: "Digital Elevation Model (DEM)", price: 9900, description: "Digital elevation model showing surface height data",           tooltip: "Grid-based surface elevation for GIS analysis" },
  { name: "Digital Terrain Model (DTM)", price: 11900, description: "Bare-earth terrain model with vegetation and structures removed", tooltip: "Ground-level elevation model for engineering use" },
  { name: "Basic Volumetric / Stockpile Report", price: 12900, description: "Cut/fill and stockpile volume calculations from your map", tooltip: "Accurate volume measurements for earthwork and inventory" },
  { name: "Contour Lines + Elevation Data Package", price: 14900, description: "Full contour line overlay plus raw elevation data export", tooltip: "Contours and elevation data bundled together" },
  { name: "Advanced Mapping Package (Ortho + DEM + Contours)", price: 19900, description: "Complete mapping package: ortho, DEM, and contours in one", tooltip: "Everything you need for comprehensive site analysis" },
  { name: "Custom CAD/GIS Export & Layering", price: 7500, description: "Deliverables formatted and layered for your CAD or GIS platform", tooltip: "Import-ready files in GeoTIFF, KML, DXF, and more" },
  { name: "Same-day Delivery",          price: 4000,   description: "Receive your processed aerial map the same day as capture",       tooltip: "Rush processing and delivery on capture day" },

  // 38-41 – Timelapse Creation
  { name: "Extended capture period",    price: 15000,  description: "Add one additional week of capture to your timelapse project",   tooltip: "An extra week of scheduled flights" },
  { name: "4K cinematic upgrade",       price: 7500,   description: "Upgrade your timelapse to 4K cinematic quality",                tooltip: "Full 4K resolution with cinematic color grade" },
  { name: "Same-day preview clips",     price: 4000,   description: "Receive rough preview clips the same day as capture",            tooltip: "Quick look at your footage before final delivery" },
  { name: "Multiple angle timelapse",   price: 9900,   description: "Timelapse captured from two or more distinct angles",            tooltip: "Adds a second camera position for variety" },
];

// ─── Service → addon index mapping ───────────────────────────────────────────
// Values are 0-based indices into CANONICAL_ADDONS above.
const SERVICE_ADDON_INDICES: Record<string, number[]> = {
  "Real Estate Listings":                   [0, 1, 2, 4, 5, 6],
  "Property Tours":                         [0, 2, 7, 8, 9, 10],
  "Promotional Content":                    [0, 1, 2, 11, 12, 13],
  "Roof Inspections":                       [3, 14, 15, 16],
  "Property & Site Evaluation":             [0, 1, 3, 17, 18],
  "Infrastructure & Structure Inspections": [3, 19, 20, 21],
  "Construction Planning & Monitoring":     [22, 23, 24, 25],
  "3D Modeling":                            [26, 27, 28, 29],
  "Aerial Mapping":                         [30, 31, 32, 33, 34, 35, 36, 37],
  "Timelapse Creation":                     [38, 39, 40, 41],
};

async function main() {
  console.log("Wiping existing service_addons, addons, and services...");
  await db.execute(sql`DELETE FROM service_addons`);
  await db.execute(sql`DELETE FROM addons`);
  await db.execute(sql`DELETE FROM services`);
  console.log("Tables wiped.");

  // ── 1. Insert addons ────────────────────────────────────────────────────────
  console.log(`Inserting ${CANONICAL_ADDONS.length} canonical addons...`);
  const addonIds: number[] = [];
  for (const addon of CANONICAL_ADDONS) {
    const rows = await db.execute(
      sql`INSERT INTO addons (name, description, tooltip_description, price, pricing_type, is_active, display_order)
          VALUES (${addon.name}, ${addon.description}, ${addon.tooltip}, ${addon.price}, 'fixed', true, 999)
          RETURNING id`
    );
    const row = rows.rows[0] as { id: number };
    addonIds.push(row.id);
  }
  console.log(`Inserted ${addonIds.length} addons.`);

  // ── 2. Insert services ──────────────────────────────────────────────────────
  console.log(`Inserting ${CANONICAL_SERVICES.length} canonical services...`);
  const serviceIds: Record<string, number> = {};
  for (const svc of CANONICAL_SERVICES) {
    const rows = await db.execute(
      sql`INSERT INTO services
            (name, description, price, pricing_type, price_ranges, category,
             folder_structure, image_url, is_active, features)
          VALUES
            (${svc.name}, ${svc.description}, ${svc.price}::integer,
             ${svc.pricingType}, ${svc.priceRanges}::jsonb, ${svc.category},
             ${svc.folderStructure}::text[], ${svc.imageUrl}, true,
             ${svc.features}::jsonb)
          RETURNING id`
    );
    const row = rows.rows[0] as { id: number };
    serviceIds[svc.name] = row.id;
  }
  console.log(`Inserted ${Object.keys(serviceIds).length} services.`);

  // ── 3. Link addons to services ──────────────────────────────────────────────
  console.log("Seeding service_addons links...");
  let linkCount = 0;
  for (const [serviceName, indices] of Object.entries(SERVICE_ADDON_INDICES)) {
    const serviceId = serviceIds[serviceName];
    if (!serviceId) { console.warn(`  No ID for service: ${serviceName}`); continue; }
    for (const idx of indices) {
      const addonId = addonIds[idx];
      if (!addonId) { console.warn(`  No addon at index ${idx}`); continue; }
      await db.execute(
        sql`INSERT INTO service_addons (service_id, addon_id, is_enabled)
            VALUES (${serviceId}, ${addonId}, true)
            ON CONFLICT (service_id, addon_id) DO NOTHING`
      );
      linkCount++;
    }
  }
  console.log(`Seeded ${linkCount} service_addon links.`);

  // ── 4. Set Aerial Mapping bundle configurations ──────────────────────────────
  const aerialMappingId = serviceIds["Aerial Mapping"];
  if (aerialMappingId) {
    // Real Estate Listings is range_based ($119–$329); the $20 savings is applied to
    // Aerial Mapping itself (not Real Estate) so the partner keeps its full price range.
    // It is handled by the name-based AERIAL_MAPPING_SAVINGS fallback in the UI.
    const bundleSavingsCustomPrice: Record<string, number> = {
      "Property Tours": 29900,
      "Promotional Content": 34900,
      "Roof Inspections": 14900,
      "Property & Site Evaluation": 24900,
      "Infrastructure & Structure Inspections": 29900,
      "Construction Planning & Monitoring": 44900,
      "3D Modeling": 49900,
      "Timelapse Creation": 44900,
    };
    const bundleConfigurations = Object.entries(bundleSavingsCustomPrice)
      .filter(([name]) => serviceIds[name] !== undefined)
      .map(([name, customPrice]) => ({ serviceId: serviceIds[name], customPrice }));
    await db.execute(
      sql`UPDATE services SET bundle_configurations = ${JSON.stringify(bundleConfigurations)}::jsonb WHERE id = ${aerialMappingId}`
    );
    console.log(`Set ${bundleConfigurations.length} bundle configurations on Aerial Mapping.`);
  }

  // ── 5. Set display order for Mapping & Modeling category ────────────────────
  const displayOrders: Record<string, number> = {
    "Construction Planning & Monitoring": 70,
    "Aerial Mapping": 80,
    "3D Modeling": 90,
    "Timelapse Creation": 100,
  };
  for (const [name, order] of Object.entries(displayOrders)) {
    const id = serviceIds[name];
    if (id) {
      await db.execute(sql`UPDATE services SET display_order = ${order} WHERE id = ${id}`);
    }
  }
  console.log("Display orders set for Mapping & Modeling services.");

  console.log("Done.");
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
