/**
 * Service catalog rebuild migration.
 *
 * Transforms the old 10-service catalog into the new 11-service catalog:
 *   - DELETES: Construction Planning & Monitoring, 3D Modeling, Timelapse Creation
 *   - RENAMES: Infrastructure & Structure Inspections → Structural Inspections
 *   - UPDATES: Real Estate Listings, Promotional Content, Property Tours,
 *               Roof Inspections, Property & Site Evaluation, Aerial Mapping
 *   - CREATES: 3D Digital Twin, Rough-In Digital Twin, Foundation to Finish,
 *               Construction Monitoring / Timelapse
 *   - REBUILDS: All addons from scratch; Rush delivery via rushOrderPricing
 *
 * Guard: idempotent — skips if "3D Digital Twin" already exists.
 */

import { db } from "../db";
import { sql } from "drizzle-orm";

export async function rebuildServiceCatalog() {
  // Idempotency guard
  const guard = await db.execute(sql`
    SELECT id FROM services WHERE name = '3D Digital Twin' LIMIT 1
  `);
  if (guard.rows.length > 0) {
    console.log("[rebuild-catalog] Already applied — skipping.");
    return;
  }

  console.log("[rebuild-catalog] Starting service catalog rebuild...");

  // ── 1. Null-out bookings that reference the three retired services ─────────
  await db.execute(sql`
    UPDATE bookings SET service_id = NULL
    WHERE service_id IN (
      SELECT id FROM services
      WHERE name IN ('Construction Planning & Monitoring', '3D Modeling', 'Timelapse Creation')
    )
  `);

  // ── 2. Delete service_addons rows for retired services (cascade-safe) ───────
  await db.execute(sql`
    DELETE FROM service_addons
    WHERE service_id IN (
      SELECT id FROM services
      WHERE name IN ('Construction Planning & Monitoring', '3D Modeling', 'Timelapse Creation')
    )
  `);

  // ── 3. Delete the three retired services ─────────────────────────────────────
  await db.execute(sql`
    DELETE FROM services
    WHERE name IN ('Construction Planning & Monitoring', '3D Modeling', 'Timelapse Creation')
  `);

  // ── 4. Rename & reprice Infrastructure & Structure Inspections ────────────────
  await db.execute(sql`
    UPDATE services SET
      name          = 'Structural Inspections',
      slug          = 'structural-inspections',
      price         = 40000,
      pricing_type  = 'flat',
      description   = 'Safe, detailed aerial inspections of buildings, bridges, and infrastructure — without the cost or risk of a climbing crew.',
      features      = '["Safe, high-resolution close-up imagery of every structure section","Visual integrity assessment for damage, wear, and anomalies","Annotated images and professional findings report","No need for expensive climbing crews","Fully insured and FAA Part 107 compliant","Custom quote for large, multi-structure, or unusually complex sites"]'::jsonb,
      folder_structure = ARRAY['01_Raw_Inspection_Photos','02_Annotated_Images','03_Findings_Report','04_Final_Delivery'],
      category      = 'Property Inspections',
      pricing_tiers = '[]'::jsonb,
      price_ranges  = '[]'::jsonb,
      disclaimer    = NULL,
      updated_at    = NOW()
    WHERE name = 'Infrastructure & Structure Inspections'
  `);

  // ── 5. Update Real Estate Listings ────────────────────────────────────────────
  await db.execute(sql`
    UPDATE services SET
      price         = 12500,
      pricing_type  = 'range_based',
      price_ranges  = '[
        {"minPrice":12500,"maxPrice":12500,"label":"Stills Only"},
        {"minPrice":19900,"maxPrice":19900,"label":"Stills + Video"},
        {"minPrice":27500,"maxPrice":27500,"label":"Stills + Video + Twilight"},
        {"minPrice":32500,"maxPrice":32500,"label":"Full Showcase"}
      ]'::jsonb,
      pricing_tiers = '[]'::jsonb,
      description   = 'Professional drone photography and video that makes properties stand out on MLS, websites, and social media.',
      features      = '["High-resolution aerial photos and cinematic video","Professional color correction and enhancement","Fast 48-hour digital delivery via secure gallery","Watermark-free files optimized for MLS and web use","Expert pilot with real estate marketing experience","Subtle logo option available"]'::jsonb,
      folder_structure = ARRAY['01_Raw_Photos','02_Edited_Photos','03_Final_Delivery','04_Client_Gallery'],
      updated_at    = NOW()
    WHERE name = 'Real Estate Listings'
  `);

  // ── 6. Update Promotional Content ─────────────────────────────────────────────
  await db.execute(sql`
    UPDATE services SET
      price         = 35000,
      pricing_type  = 'flat',
      price_ranges  = '[]'::jsonb,
      pricing_tiers = '[]'::jsonb,
      description   = 'Aerial imagery and video that showcases your business, resort, or golf course — built for branding and marketing.',
      features      = '["Dynamic aerial overviews of your property or venue","Professional cinematic video with music and transitions","High-resolution stills for print and digital use","Creative concept development with client input","Fast turnaround and multiple file formats","Brand-elevating visuals that capture attention"]'::jsonb,
      folder_structure = ARRAY['01_Raw_Photos','02_Raw_Footage','03_Edited_Content','04_Social_Formats','05_Final_Delivery'],
      updated_at    = NOW()
    WHERE name = 'Promotional Content'
  `);

  // ── 7. Update Property Tours → composite (price computed from components) ─────
  await db.execute(sql`
    UPDATE services SET
      price         = 0,
      pricing_type  = 'composite',
      price_ranges  = '[]'::jsonb,
      pricing_tiers = '[]'::jsonb,
      description   = 'An immersive, buyer-navigable tour of a property — a true-to-life 3D walkthrough of the interior, paired with your choice of cinematic aerial video or a full 3D exterior twin.',
      features      = '["Indoor: navigable 3D Digital Twin walkthrough of the interior","Outdoor: your choice of cinematic aerial video or full 3D exterior twin","Photorealistic and fully explorable from any angle","Price is computed from component services — see 3D Digital Twin and Real Estate Listings"]'::jsonb,
      folder_structure = ARRAY['01_Indoor_Digital_Twin','02_Outdoor_Content','03_Final_Delivery'],
      updated_at    = NOW()
    WHERE name = 'Property Tours'
  `);

  // ── 8. Update Roof Inspections ────────────────────────────────────────────────
  await db.execute(sql`
    UPDATE services SET
      price         = 30000,
      pricing_type  = 'flat',
      price_ranges  = '[]'::jsonb,
      pricing_tiers = '[]'::jsonb,
      description   = 'Detailed drone roof inspections, including a full 360° tour of the roof alongside close, high-resolution images of every section — so you have complete coverage to review yourself or share with your roofer or insurance adjuster.',
      features      = '["Full 360° tour pass of the entire roof","Close, high-resolution detail images of every roof section","Complete imagery package — no ladders or climbing required","Ideal for homeowners, property managers, roofing companies, and insurance adjusters","Fast 48-hour digital delivery","Custom quote for commercial properties and multi-building sites"]'::jsonb,
      folder_structure = ARRAY['01_360_Tour_Pass','02_Detail_Images','03_Final_Delivery'],
      disclaimer    = NULL,
      updated_at    = NOW()
    WHERE name = 'Roof Inspections'
  `);

  // ── 9. Update Property & Site Evaluation ──────────────────────────────────────
  await db.execute(sql`
    UPDATE services SET
      price         = 27500,
      pricing_type  = 'flat',
      price_ranges  = '[]'::jsonb,
      pricing_tiers = '[]'::jsonb,
      updated_at    = NOW()
    WHERE name = 'Property & Site Evaluation'
  `);

  // ── 10. Update Aerial Mapping ──────────────────────────────────────────────────
  await db.execute(sql`
    UPDATE services SET
      price         = 40000,
      pricing_type  = 'tiered',
      price_ranges  = '[]'::jsonb,
      pricing_tiers = '[
        {"name":"Small Lot (under 1 acre)","price":40000,"priceType":"fixed","description":"Flat rate for sites under 1 acre"},
        {"name":"1–5 acres","price":20000,"priceType":"fixed","description":"Per acre","quantityUnit":"acre"},
        {"name":"5–20 acres","price":15000,"priceType":"fixed","description":"Per acre","quantityUnit":"acre"},
        {"name":"20+ acres","price":0,"priceType":"quote","description":"Custom quote — contact us for large-site pricing"}
      ]'::jsonb,
      monthly_subscription_enabled = true,
      frequency_details = 'Custom cadence — weekly, bi-weekly, or monthly recurring capture based on project needs. Contact us for subscription pricing.',
      description   = 'Survey-grade-accuracy aerial mapping data — orthomosaics, elevation models, contours, and volumetric reports — available as a one-time capture or an ongoing recurring service to track changes over time.',
      features      = '["Geo-referenced orthomosaic included with every capture","Elevation models and contour data available","Volumetric and stockpile calculations","GIS-ready and CAD-compatible export formats","One-time capture or recurring subscription cadence","Measurable dimensions and scale for planning and engineering reference"]'::jsonb,
      folder_structure = ARRAY['01_Flight_Data','02_Orthomosaic','03_Elevation_Data','04_Contour_Maps','05_Volumetric_Reports','06_GIS_CAD_Exports','07_Final_Delivery'],
      disclaimer    = 'Apollo DroneWorks is not a licensed land surveying firm, and our pilots are not licensed surveyors. Aerial Mapping deliverables provide survey-grade-accuracy data suitable for planning, design, and engineering reference, but are not a substitute for a licensed boundary survey. For legal property boundaries or stamped survey documentation, please consult a licensed Professional Land Surveyor.',
      category      = 'Mapping & Site Data',
      updated_at    = NOW()
    WHERE name = 'Aerial Mapping'
  `);

  // Update remaining services' categories to match new 4-category structure
  await db.execute(sql`
    UPDATE services SET category = 'Real Estate & Marketing'
    WHERE name IN ('Real Estate Listings','Property Tours','Promotional Content')
  `);
  await db.execute(sql`
    UPDATE services SET category = 'Property Inspections'
    WHERE name IN ('Roof Inspections','Property & Site Evaluation','Structural Inspections')
  `);

  // ── 11. Clear all addons (full rebuild from scratch) ──────────────────────────
  await db.execute(sql`DELETE FROM service_addons`);
  await db.execute(sql`DELETE FROM addons`);

  // ── 12. Insert new canonical addons ───────────────────────────────────────────
  //   Ordered so we can reference indices when linking to services.
  //   Index:  0 Extra 5 Photos
  //           1 Social Media Crop Pack
  //           2 Extra Edited Video Cut
  //           3 Extended Site Coverage
  //           4 Additional Structure on Same Property (Roof)
  //           5 Follow-Up Visit                 ← SHARED: Roof / P&SE / Structural
  //           6 Thermal Imaging (disabled)      ← SHARED: Roof / Structural
  //           7 Extended Property Coverage
  //           8 Additional Structure on Same Site (Structural)
  //           9 Custom CAD/GIS Export Formatting
  //          10 Additional One-Off Monitoring Flight
  //          11 Rendered Fly-Through Video Export
  //          12 Custom-Branded Embeddable Viewer
  //          13 Extended/Upgraded Project Story Video (disabled)

  const newAddons = [
    /* 0 */ { name: "Extra 5 Photos",                      price: 3000,  description: "Add 5 additional edited aerial photos to your package",          tooltip: "+5 professionally edited aerial photos" },
    /* 1 */ { name: "Social Media Crop Pack",              price: 3500,  description: "Vertical and square crops optimized for Instagram, Facebook, and TikTok", tooltip: "Platform-ready crops in every standard social format" },
    /* 2 */ { name: "Extra Edited Video Cut",              price: 7500,  description: "An additional edited video cut from your footage",                tooltip: "Extra finished video clip for your marketing campaign" },
    /* 3 */ { name: "Extended Site Coverage",              price: 10000, description: "Additional flight time covering more of your property or venue",   tooltip: "Expands coverage to a larger area or additional angles" },
    /* 4 */ { name: "Additional Structure on Same Property", price: 7500, description: "Add a second structure on the same property to your inspection",   tooltip: "Covers a garage, shed, or outbuilding on the same visit" },
    /* 5 */ { name: "Follow-Up Visit",                     price: 9900,  description: "Return visit to the same site for an updated inspection",         tooltip: "Ideal after repairs or changes are completed" },
    /* 6 */ { name: "Thermal Imaging",                     price: 9900,  description: "Add thermal/infrared imaging to detect heat anomalies",           tooltip: "Detects heat anomalies invisible to a standard camera" },
    /* 7 */ { name: "Extended Property Coverage",          price: 7500,  description: "Expanded coverage for larger acreage or multi-building properties", tooltip: "Extends the evaluation to additional structures or acreage" },
    /* 8 */ { name: "Additional Structure on Same Site",   price: 10000, description: "Add a second structure on the same site to your inspection",      tooltip: "Covers a second building or span on the same visit" },
    /* 9 */ { name: "Custom CAD/GIS Export Formatting",    price: 7500,  description: "Deliverables formatted and layered for your specific CAD or GIS platform", tooltip: "Import-ready files in GeoTIFF, KML, DXF, and more" },
    /* 10 */ { name: "Additional One-Off Monitoring Flight", price: 10000, description: "One extra visit outside your regular schedule",                 tooltip: "Add a single unscheduled capture to your recurring plan" },
    /* 11 */ { name: "Rendered Fly-Through Video Export",  price: 15000, description: "Cinematic animated fly-through rendered from your Digital Twin",  tooltip: "Polished video walkthrough exported from the 3D model" },
    /* 12 */ { name: "Custom-Branded Embeddable Viewer",   price: 5000,  description: "Your Digital Twin embedded in a branded viewer with your logo and colors", tooltip: "White-labeled viewer you can embed on your own website" },
    /* 13 */ { name: "Extended/Upgraded Project Story Video", price: 15000, description: "A professionally edited project narrative video compiled from your Foundation to Finish footage", tooltip: "Full cinematic story of your project from groundbreak to completion" },
  ];

  const insertedAddonIds: number[] = [];
  for (const a of newAddons) {
    const row = await db.execute(sql`
      INSERT INTO addons (name, description, tooltip_description, price, pricing_type, is_active, display_order)
      VALUES (${a.name}, ${a.description}, ${a.tooltip}, ${a.price}, 'fixed', true, 999)
      RETURNING id
    `);
    insertedAddonIds.push((row.rows[0] as { id: number }).id);
  }
  console.log(`[rebuild-catalog] Inserted ${insertedAddonIds.length} new addons.`);

  // ── 13. Create 4 new services ─────────────────────────────────────────────────

  // Helper to insert a service and return its id
  async function insertService(data: Record<string, unknown>): Promise<number> {
    const row = await db.execute(sql`
      INSERT INTO services (
        name, slug, description, price, pricing_type, pricing_tiers, price_ranges,
        features, folder_structure, category, image_url, display_order, disclaimer,
        monthly_subscription_enabled, frequency_details
      ) VALUES (
        ${data.name as string},
        ${data.slug as string},
        ${data.description as string},
        ${data.price as number},
        ${data.pricingType as string},
        ${JSON.stringify(data.pricingTiers ?? [])}::jsonb,
        ${JSON.stringify(data.priceRanges ?? [])}::jsonb,
        ${JSON.stringify(data.features ?? [])}::jsonb,
        ${(data.folderStructure as string[]) ?? []},
        ${data.category as string},
        ${data.imageUrl as string},
        ${data.displayOrder as number ?? 999},
        ${(data.disclaimer as string) ?? null},
        ${(data.monthlySubscriptionEnabled as boolean) ?? false},
        ${(data.frequencyDetails as string) ?? null}
      )
      RETURNING id
    `);
    return (row.rows[0] as { id: number }).id;
  }

  // 3D Digital Twin
  const digitalTwinId = await insertService({
    name: "3D Digital Twin",
    slug: "3d-digital-twin",
    description: "A photorealistic, fully navigable 3D model of a property's interior, exterior, or both — built so you can explore a space from any angle, anywhere, anytime.",
    price: 40000,
    pricingType: "tiered",
    // pricingTiers stores all four selectable options; UI renders Indoor/Outdoor checkboxes
    pricingTiers: [
      { name: "Indoor — Under 3,000 sq ft",             scope: "indoor",          priceType: "range", minPrice: 40000,  maxPrice: 60000,  description: "Under 3,000 sq ft" },
      { name: "Indoor — 3,000–6,000 sq ft",             scope: "indoor_large",    priceType: "range", minPrice: 60000,  maxPrice: 90000,  description: "3,000–6,000 sq ft" },
      { name: "Outdoor — Standard (single property/lot)", scope: "outdoor_standard", priceType: "range", minPrice: 75000,  maxPrice: 120000, description: "Single property or lot" },
      { name: "Outdoor — Premium (larger acreage/multiple structures)", scope: "outdoor_premium", priceType: "range", minPrice: 150000, maxPrice: 300000, description: "Larger acreage or multiple structures" },
    ],
    features: [
      "Select Indoor, Outdoor, or both — price updates live",
      "Indoor: photorealistic capture of every room, fully navigable in 3D",
      "Outdoor: full exterior twin including structure and lot",
      "Explore from any angle, on any device",
      "25% discount when both Indoor and Outdoor are selected together",
      "Embeddable viewer link delivered with your files",
    ],
    folderStructure: ["01_Raw_Capture", "02_Processed_Splat_Data", "03_Digital_Twin_Viewer_Files", "04_Renders_And_Video", "05_Final_Delivery"],
    category: "Construction Lifecycle & 3D Digital Twins",
    imageUrl: "/uploads/svc-3d-digital-twin.png",
    displayOrder: 80,
  });

  // Rough-In Digital Twin
  const roughInId = await insertService({
    name: "Rough-In Digital Twin",
    slug: "rough-in-digital-twin",
    description: "A complete 3D digital record of your home at the one moment that matters most — right before drywall goes up, when every pipe, wire, and duct is still visible.",
    price: 70000,
    pricingType: "tiered",
    pricingTiers: [
      { name: "Standard", priceType: "fixed", price: 70000,  description: "Single-family home rough-in capture" },
      { name: "Premium",  priceType: "fixed", price: 115000, description: "Larger home or more complex rough-in" },
    ],
    features: [
      "Exterior and interior capture at the rough-in / pre-drywall stage",
      "Every pipe, wire, and duct permanently documented in 3D",
      "Full credit toward Foundation to Finish or 3D Digital Twin if you upgrade later",
      "One-time capture — this window closes the moment drywall goes up",
    ],
    folderStructure: ["01_Raw_Capture", "02_Processed_Splat_Data", "03_Digital_Twin_Viewer_Files", "04_Final_Delivery"],
    category: "Construction Lifecycle & 3D Digital Twins",
    imageUrl: "/uploads/svc-rough-in-digital-twin.png",
    displayOrder: 85,
  });

  // Foundation to Finish
  const foundationToFinishId = await insertService({
    name: "Foundation to Finish",
    slug: "foundation-to-finish",
    description: "From the first stake in the ground to the final walkthrough, we follow your project the whole way. Apollo DroneWorks documents your build from bare dirt through completion, then delivers a complete, photorealistic 3D Digital Twin of the finished property — inside and out. Already under construction? No problem — we can step in at any stage and pick up documentation from wherever your project stands today.",
    price: 247500, // All-phases Standard (computed: 25% off sum of phases)
    pricingType: "tiered",
    // pricingTiers stores per-phase prices; entry-point totals are computed in UI
    pricingTiers: [
      { name: "Phase 1 — Baseline Mapping",       phase: 1,    priceType: "fixed", price: 50000, premiumPrice: 80000,  description: "Initial aerial mapping of the bare-ground site" },
      { name: "Phase 2B — Rough-In Digital Twin", phase: "2b", priceType: "fixed", price: 70000, premiumPrice: 115000, description: "Full Digital Twin captured at rough-in / pre-drywall stage" },
      { name: "Phase 3 — Completion Marketing",   phase: 3,    priceType: "fixed", price: 30000, premiumPrice: 45000,  description: "Aerial photography and video at project completion" },
      { name: "Phase 4 — Outdoor Digital Twin",   phase: 4,    priceType: "fixed", price: 90000, premiumPrice: 150000, description: "Full exterior Digital Twin of the finished property" },
      { name: "Phase 5 — Indoor Digital Twin",    phase: 5,    priceType: "fixed", price: 50000, premiumPrice: 75000,  description: "Full interior Digital Twin of the finished home" },
      { name: "Phase 6 — Final Assembly & Delivery", phase: 6, priceType: "fixed", price: 40000, premiumPrice: 60000,  description: "Assembly of the full project archive and combined twin" },
    ],
    features: [
      "Entry-point selector — we step in wherever your project stands today",
      "Phase 1: Baseline aerial mapping of bare ground",
      "Phase 2B: Rough-In Digital Twin before drywall goes up",
      "Phase 3: Completion marketing photo and video",
      "Phase 4: Outdoor Digital Twin of the finished exterior",
      "Phase 5: Indoor Digital Twin of the finished interior",
      "Phase 6: Full project archive and combined twin delivery",
      "25% bundle discount applied to all selected phases",
      "Want regular progress visits too? Add Construction Monitoring separately.",
    ],
    folderStructure: [
      "01_Baseline_Mapping",
      "02_Progress_Documentation",
      "03_RoughIn_Digital_Twin",
      "04_Completion_Marketing",
      "05_Outdoor_Digital_Twin",
      "06_Indoor_Digital_Twin",
      "07_Final_Combined_Twin_And_Project_Archive",
    ],
    category: "Construction Lifecycle & 3D Digital Twins",
    imageUrl: "/uploads/svc-foundation-to-finish.png",
    displayOrder: 90,
  });

  // Construction Monitoring / Timelapse
  const constructionMonitoringId = await insertService({
    name: "Construction Monitoring / Timelapse",
    slug: "construction-monitoring-timelapse",
    description: "Recurring site visits that document your project's progress — choose Progress Documentation for a timestamped visual record, or Cinematic Timelapse for a polished video built for marketing.",
    price: 30000,
    pricingType: "tiered",
    pricingTiers: [
      { name: "Progress Documentation — Standard", style: "progress",   tier: "standard", priceType: "fixed", price: 30000, description: "Per visit — timestamped photo and video record, monthly or milestone-based cadence" },
      { name: "Progress Documentation — Premium",  style: "progress",   tier: "premium",  priceType: "fixed", price: 40000, description: "Per visit — enhanced coverage and faster delivery" },
      { name: "Cinematic Timelapse — Standard",    style: "timelapse",  tier: "standard", priceType: "fixed", price: 37500, description: "Per visit — polished marketing video; minimum 8 visits recommended", minRecommendedVisits: 8 },
      { name: "Cinematic Timelapse — Premium",     style: "timelapse",  tier: "premium",  priceType: "fixed", price: 47500, description: "Per visit — premium edit and faster delivery; minimum 8 visits recommended", minRecommendedVisits: 8 },
    ],
    features: [
      "Style A — Progress Documentation: timestamped photo and video record of every visit",
      "Style B — Cinematic Timelapse: a polished, professionally edited marketing video",
      "Client sets the cadence: monthly, milestone-based, or more frequent",
      "Cinematic Timelapse includes licensed background music; music-free cut available on request",
      "Minimum 8 visits recommended for Cinematic Timelapse for a smooth final cut",
    ],
    folderStructure: ["01_Raw_Visit_Captures", "02_Edited_Output", "03_Project_Archive_Gallery", "04_Final_Delivery"],
    category: "Mapping & Site Data",
    imageUrl: "/uploads/svc-construction-monitoring.png",
    displayOrder: 75,
    monthlySubscriptionEnabled: true,
    frequencyDetails: "Client-set cadence — monthly, milestone-based, weekly, or custom",
  });

  console.log(`[rebuild-catalog] Created 4 new services: IDs ${digitalTwinId}, ${roughInId}, ${foundationToFinishId}, ${constructionMonitoringId}`);

  // ── 14. Create service-addon links ────────────────────────────────────────────
  // Fetch current service IDs by name for the existing (updated) services
  const svcRows = await db.execute(sql`
    SELECT id, name FROM services
    WHERE name IN (
      'Real Estate Listings','Promotional Content','Property Tours',
      'Roof Inspections','Property & Site Evaluation','Structural Inspections',
      'Aerial Mapping'
    )
  `);
  const svcMap: Record<string, number> = {};
  for (const r of svcRows.rows as { id: number; name: string }[]) {
    svcMap[r.name] = r.id;
  }

  const links: { serviceId: number; addonIdx: number; isEnabled: boolean }[] = [
    // Real Estate Listings: Extra 5 Photos (0), Social Media Crop Pack (1)
    { serviceId: svcMap["Real Estate Listings"],    addonIdx: 0,  isEnabled: true },
    { serviceId: svcMap["Real Estate Listings"],    addonIdx: 1,  isEnabled: true },
    // Promotional Content: Extra Edited Video Cut (2), Extended Site Coverage (3)
    { serviceId: svcMap["Promotional Content"],     addonIdx: 2,  isEnabled: true },
    { serviceId: svcMap["Promotional Content"],     addonIdx: 3,  isEnabled: true },
    // Roof Inspections: Additional Structure (4), Follow-Up Visit (5), Thermal Imaging (6, disabled)
    { serviceId: svcMap["Roof Inspections"],        addonIdx: 4,  isEnabled: true },
    { serviceId: svcMap["Roof Inspections"],        addonIdx: 5,  isEnabled: true },
    { serviceId: svcMap["Roof Inspections"],        addonIdx: 6,  isEnabled: false },
    // Property & Site Evaluation: Follow-Up Visit (5), Extended Property Coverage (7)
    { serviceId: svcMap["Property & Site Evaluation"], addonIdx: 5, isEnabled: true },
    { serviceId: svcMap["Property & Site Evaluation"], addonIdx: 7, isEnabled: true },
    // Structural Inspections: Additional Structure (8), Follow-Up Visit (5), Thermal Imaging (6, disabled)
    { serviceId: svcMap["Structural Inspections"],  addonIdx: 8,  isEnabled: true },
    { serviceId: svcMap["Structural Inspections"],  addonIdx: 5,  isEnabled: true },
    { serviceId: svcMap["Structural Inspections"],  addonIdx: 6,  isEnabled: false },
    // Aerial Mapping: Custom CAD/GIS (9)
    { serviceId: svcMap["Aerial Mapping"],          addonIdx: 9,  isEnabled: true },
    // Construction Monitoring / Timelapse: Additional One-Off Flight (10)
    { serviceId: constructionMonitoringId,          addonIdx: 10, isEnabled: true },
    // 3D Digital Twin: Fly-Through Video (11), Custom-Branded Viewer (12)
    { serviceId: digitalTwinId,                     addonIdx: 11, isEnabled: true },
    { serviceId: digitalTwinId,                     addonIdx: 12, isEnabled: true },
    // Foundation to Finish: Project Story Video (13, disabled)
    { serviceId: foundationToFinishId,              addonIdx: 13, isEnabled: false },
  ];

  let linkCount = 0;
  for (const link of links) {
    if (!link.serviceId) continue;
    const addonId = insertedAddonIds[link.addonIdx];
    if (!addonId) continue;
    await db.execute(sql`
      INSERT INTO service_addons (service_id, addon_id, is_enabled)
      VALUES (${link.serviceId}, ${addonId}, ${link.isEnabled})
    `);
    linkCount++;
  }
  console.log(`[rebuild-catalog] Created ${linkCount} service-addon links.`);

  // ── 15. Rush Order Pricing for all 11 services ────────────────────────────────
  // Clear any existing rush pricing and rebuild
  await db.execute(sql`DELETE FROM rush_order_pricing`);

  const allSvcRows = await db.execute(sql`SELECT id FROM services`);
  for (const r of allSvcRows.rows as { id: number }[]) {
    await db.execute(sql`
      INSERT INTO rush_order_pricing (service_id, rush_multiplier, minimum_notice_hours, is_active)
      VALUES (${r.id}, 1.25, 24, true)
    `);
  }
  console.log(`[rebuild-catalog] Added rush order pricing for ${allSvcRows.rows.length} services.`);

  // ── 16. Add Rough-In upgrade credit columns to bookings (if not present) ──────
  const bookingCols = await db.execute(sql`
    SELECT column_name FROM information_schema.columns
    WHERE table_name = 'bookings'
    AND column_name IN ('credit_amount', 'credit_source_booking_id')
  `);
  const existingCols = (bookingCols.rows as { column_name: string }[]).map(r => r.column_name);
  if (!existingCols.includes('credit_amount')) {
    await db.execute(sql`ALTER TABLE bookings ADD COLUMN credit_amount INTEGER DEFAULT 0`);
  }
  if (!existingCols.includes('credit_source_booking_id')) {
    await db.execute(sql`ALTER TABLE bookings ADD COLUMN credit_source_booking_id INTEGER REFERENCES bookings(id)`);
  }

  console.log("[rebuild-catalog] Service catalog rebuild complete.");
}
