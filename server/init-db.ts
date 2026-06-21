import { db } from './db';
import { services, users, beforeAfterImages, testimonials, blogPosts } from '@shared/schema';
import { addons, serviceAddons } from '@shared/addons-schema';
import { scrypt, randomBytes } from 'crypto';
import { promisify } from 'util';
import { eq, sql } from 'drizzle-orm';

const scryptAsync = promisify(scrypt);

// Function to hash a password
async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

// The 11 canonical service names that constitute a complete catalog.
// Exported so automated tests can verify the guard without duplicating this list.
// If a service is ever renamed here, update the list AND the matching row in the DB
// (or run scripts/replace-services.ts to reset). A mismatch causes reseeding on the
// next server start, which is the correct and expected behaviour.
export const CANONICAL_SERVICE_NAMES: readonly string[] = [
  "Real Estate Listings",
  "Property Tours",
  "Promotional Content",
  "Roof Inspections",
  "Property & Site Evaluation",
  "Structural Inspections",
  "Aerial Mapping",
  "Construction Monitoring / Timelapse",
  "3D Digital Twin",
  "Rough-In Digital Twin",
  "Foundation to Finish",
] as const;

// Initialize the database with default data
export async function initializeDatabase() {
  console.log('Initializing database...');
  
  try {
    // Seed canonical services and add-ons when one or more canonical service
    // names are MISSING from the database (i.e., skip seeding only when all
    // 10 canonical names are already present).
    //
    // A name-based check (rather than a simple count check) means:
    //  • A fresh install (0 rows) always seeds.
    //  • A partial catalog (e.g., only 9 of 10 canonical services survived a
    //    manual deletion) triggers a full reseed to restore the catalog.
    //  • An installation where all 10 canonical names exist is left untouched,
    //    preserving admin customisations (edited prices, deleted add-ons, etc.).
    //
    // NOTE: if a canonical name is renamed in this file, CANONICAL_SERVICE_NAMES
    // must be updated to match, and scripts/replace-services.ts should be run to
    // update the live DB. Automated tests in server/__tests__/init-db-reseed-guard.test.ts
    // lock down the exact 10 names and will fail if a rename is missed.
    const existingServices = await db.select({ id: services.id, name: services.name }).from(services);
    const existingNames = new Set(existingServices.map((s) => s.name));
    const allCanonicalPresent = CANONICAL_SERVICE_NAMES.every((n) => existingNames.has(n));

    if (allCanonicalPresent) {
      console.log(`All ${CANONICAL_SERVICE_NAMES.length} canonical services present — skipping initialization.`);
      // Note: rebuild-service-catalog migration runs separately below regardless of this guard.
    } else {
      console.log('One or more canonical services missing — seeding catalog...');
      // Null out FK references in bookings before deleting services to avoid FK constraint errors
      await db.execute(sql`UPDATE bookings SET service_id = NULL WHERE service_id IS NOT NULL`);
      await db.execute(sql`DELETE FROM service_addons`);
      await db.execute(sql`DELETE FROM addons`);
      await db.execute(sql`DELETE FROM services`);

      // ── Add-ons ─────────────────────────────────────────────────────────────
      // Rebuilt from scratch. Index references used when linking to services.
      //  0  Extra 5 Photos                  → Real Estate Listings
      //  1  Social Media Crop Pack           → Real Estate Listings
      //  2  Extra Edited Video Cut           → Promotional Content
      //  3  Extended Site Coverage           → Promotional Content
      //  4  Additional Structure (same prop) → Roof Inspections
      //  5  Follow-Up Visit (shared)         → Roof / P&SE / Structural Inspections
      //  6  Thermal Imaging (disabled,shared)→ Roof / Structural Inspections
      //  7  Extended Property Coverage       → Property & Site Evaluation
      //  8  Additional Structure (same site) → Structural Inspections
      //  9  Custom CAD/GIS Export Formatting → Aerial Mapping
      // 10  Additional One-Off Monitoring Flight → Construction Monitoring/Timelapse
      // 11  Rendered Fly-Through Video Export → 3D Digital Twin
      // 12  Custom-Branded Embeddable Viewer  → 3D Digital Twin
      // 13  Extended/Upgraded Project Story Video (disabled) → Foundation to Finish
      const canonicalAddons = [
        /* 0 */ { name: "Extra 5 Photos",                        price: 3000,  description: "Add 5 additional edited aerial photos to your package",          tooltipDescription: "+5 professionally edited aerial photos" },
        /* 1 */ { name: "Social Media Crop Pack",                price: 3500,  description: "Vertical and square crops optimized for Instagram, Facebook, and TikTok", tooltipDescription: "Platform-ready crops in every standard social format" },
        /* 2 */ { name: "Extra Edited Video Cut",                price: 7500,  description: "An additional edited video cut from your footage",                tooltipDescription: "Extra finished video clip for your marketing campaign" },
        /* 3 */ { name: "Extended Site Coverage",                price: 10000, description: "Additional flight time covering more of your property or venue",   tooltipDescription: "Expands coverage to a larger area or additional angles" },
        /* 4 */ { name: "Additional Structure on Same Property",  price: 7500,  description: "Add a second structure on the same property to your inspection",   tooltipDescription: "Covers a garage, shed, or outbuilding on the same visit" },
        /* 5 */ { name: "Follow-Up Visit",                       price: 9900,  description: "Return visit to the same site for an updated inspection",          tooltipDescription: "Ideal after repairs or changes are completed" },
        /* 6 */ { name: "Thermal Imaging",                       price: 9900,  description: "Add thermal/infrared imaging to detect heat anomalies",            tooltipDescription: "Detects heat anomalies invisible to a standard camera" },
        /* 7 */ { name: "Extended Property Coverage",            price: 7500,  description: "Expanded coverage for larger acreage or multi-building properties", tooltipDescription: "Extends the evaluation to additional structures or acreage" },
        /* 8 */ { name: "Additional Structure on Same Site",     price: 10000, description: "Add a second structure on the same site to your inspection",       tooltipDescription: "Covers a second building or span on the same visit" },
        /* 9 */ { name: "Custom CAD/GIS Export Formatting",      price: 7500,  description: "Deliverables formatted and layered for your specific CAD or GIS platform", tooltipDescription: "Import-ready files in GeoTIFF, KML, DXF, and more" },
        /* 10 */ { name: "Additional One-Off Monitoring Flight",  price: 10000, description: "One extra visit outside your regular schedule",                    tooltipDescription: "Add a single unscheduled capture to your recurring plan" },
        /* 11 */ { name: "Rendered Fly-Through Video Export",     price: 15000, description: "Cinematic animated fly-through rendered from your Digital Twin",   tooltipDescription: "Polished video walkthrough exported from the 3D model" },
        /* 12 */ { name: "Custom-Branded Embeddable Viewer",      price: 5000,  description: "Your Digital Twin embedded in a branded viewer with your logo and colors", tooltipDescription: "White-labeled viewer you can embed on your own website" },
        /* 13 */ { name: "Extended/Upgraded Project Story Video", price: 15000, description: "A professionally edited project narrative video compiled from your Foundation to Finish footage", tooltipDescription: "Full cinematic story of your project from groundbreak to completion" },
      ];

      const insertedAddonIds: number[] = [];
      for (const a of canonicalAddons) {
        const rows = await db.execute(
          sql`INSERT INTO addons (name, description, tooltip_description, price, pricing_type, is_active, display_order)
              VALUES (${a.name}, ${a.description}, ${a.tooltipDescription}, ${a.price}, 'fixed', true, 999)
              RETURNING id`
        );
        insertedAddonIds.push((rows.rows[0] as { id: number }).id);
      }
      console.log(`Inserted ${insertedAddonIds.length} canonical add-ons.`);

      // ── Services ─────────────────────────────────────────────────────────────
      const defaultServices = [
        // ── Real Estate & Marketing ────────────────────────────────────────────
        {
          name: "Real Estate Listings",
          slug: "real-estate-listings",
          description: "Professional drone photography and video that makes properties stand out on MLS, websites, and social media.",
          price: 12500,
          pricingType: "range_based",
          priceRanges: [
            { minPrice: 12500, maxPrice: 12500, label: "Stills Only" },
            { minPrice: 19900, maxPrice: 19900, label: "Stills + Video" },
            { minPrice: 27500, maxPrice: 27500, label: "Stills + Video + Twilight" },
            { minPrice: 32500, maxPrice: 32500, label: "Full Showcase" },
          ],
          category: "Real Estate & Marketing",
          folderStructure: ["01_Raw_Photos", "02_Edited_Photos", "03_Final_Delivery", "04_Client_Gallery"],
          imageUrl: "/uploads/svc-real-estate-listings.png",
          features: ["High-resolution aerial photos and cinematic video", "Professional color correction and enhancement", "Fast 48-hour digital delivery via secure gallery", "Watermark-free files optimized for MLS and web use", "Expert pilot with real estate marketing experience", "Subtle logo option available"],
          addonIndices: [0, 1],
        },
        {
          name: "Property Tours",
          slug: "property-tours",
          description: "An immersive, buyer-navigable tour of a property — a true-to-life 3D walkthrough of the interior, paired with your choice of cinematic aerial video or a full 3D exterior twin.",
          price: 0,
          pricingType: "composite",
          priceRanges: [],
          category: "Real Estate & Marketing",
          folderStructure: ["01_Indoor_Digital_Twin", "02_Outdoor_Content", "03_Final_Delivery"],
          imageUrl: "/uploads/svc-property-tours.png",
          features: ["Indoor: navigable 3D Digital Twin walkthrough of the interior", "Outdoor: your choice of cinematic aerial video or full 3D exterior twin", "Photorealistic and fully explorable from any angle", "Price is computed from component services — see 3D Digital Twin and Real Estate Listings"],
          addonIndices: [],
        },
        {
          name: "Promotional Content",
          slug: "promotional-content",
          description: "Aerial imagery and video that showcases your business, resort, or golf course — built for branding and marketing.",
          price: 35000,
          pricingType: "flat",
          priceRanges: [],
          category: "Real Estate & Marketing",
          folderStructure: ["01_Raw_Photos", "02_Raw_Footage", "03_Edited_Content", "04_Social_Formats", "05_Final_Delivery"],
          imageUrl: "/uploads/svc-promotional-content.png",
          features: ["Dynamic aerial overviews of your property or venue", "Professional cinematic video with music and transitions", "High-resolution stills for print and digital use", "Creative concept development with client input", "Fast turnaround and multiple file formats", "Brand-elevating visuals that capture attention"],
          addonIndices: [2, 3],
        },
        // ── Property Inspections ───────────────────────────────────────────────
        {
          name: "Roof Inspections",
          slug: "roof-inspections",
          description: "Detailed drone roof inspections, including a full 360° tour of the roof alongside close, high-resolution images of every section — so you have complete coverage to review yourself or share with your roofer or insurance adjuster.",
          price: 30000,
          pricingType: "flat",
          priceRanges: [],
          category: "Property Inspections",
          folderStructure: ["01_360_Tour_Pass", "02_Detail_Images", "03_Final_Delivery"],
          imageUrl: "/uploads/svc-roof-inspections.png",
          features: ["Full 360° tour pass of the entire roof", "Close, high-resolution detail images of every roof section", "Complete imagery package — no ladders or climbing required", "Ideal for homeowners, property managers, roofing companies, and insurance adjusters", "Fast 48-hour digital delivery", "Custom quote for commercial properties and multi-building sites"],
          addonIndices: [4, 5, 6],
          addonEnabled: { 6: false }, // Thermal Imaging disabled by default
        },
        {
          name: "Property & Site Evaluation",
          slug: "property-site-evaluation",
          description: "Comprehensive aerial inspection and analysis for pre-purchase due diligence, condition assessment, development planning, and insurance documentation.",
          price: 27500,
          pricingType: "flat",
          priceRanges: [],
          category: "Property Inspections",
          folderStructure: ["01_Raw_Photos", "02_Raw_Footage", "03_Annotated_Report", "04_Final_Delivery"],
          imageUrl: "/uploads/svc-property-site-evaluation.png",
          features: ["High-resolution aerial photos and video of entire property", "Detailed visual condition assessment", "Annotated images and professional summary report", "Insurance-ready documentation for claims", "Layout, surroundings, and neighborhood context", "Fast 48-hour delivery"],
          addonIndices: [5, 7],
        },
        {
          name: "Structural Inspections",
          slug: "structural-inspections",
          description: "Safe, detailed aerial inspections of buildings, bridges, and infrastructure — without the cost or risk of a climbing crew.",
          price: 40000,
          pricingType: "flat",
          priceRanges: [],
          category: "Property Inspections",
          folderStructure: ["01_Raw_Inspection_Photos", "02_Annotated_Images", "03_Findings_Report", "04_Final_Delivery"],
          imageUrl: "/uploads/svc-infrastructure-inspections.png",
          features: ["Safe, high-resolution close-up imagery of every structure section", "Visual integrity assessment for damage, wear, and anomalies", "Annotated images and professional findings report", "No need for expensive climbing crews", "Custom quote for large, multi-structure, or unusually complex sites"],
          addonIndices: [5, 6, 8],
          addonEnabled: { 6: false }, // Thermal Imaging disabled by default
        },
        // ── Mapping & Site Data ────────────────────────────────────────────────
        {
          name: "Aerial Mapping",
          slug: "aerial-mapping",
          description: "Survey-grade-accuracy aerial mapping data — orthomosaics, elevation models, contours, and volumetric reports — available as a one-time capture or an ongoing recurring service to track changes over time.",
          price: 40000,
          pricingType: "tiered",
          pricingTiers: [
            { name: "Small Lot (under 1 acre)", price: 40000, priceType: "fixed", description: "Flat rate for sites under 1 acre" },
            { name: "1–5 acres", price: 20000, priceType: "fixed", description: "Per acre", quantityUnit: "acre" },
            { name: "5–20 acres", price: 15000, priceType: "fixed", description: "Per acre", quantityUnit: "acre" },
            { name: "20+ acres", price: 0, priceType: "quote", description: "Custom quote — contact us for large-site pricing" },
          ],
          priceRanges: [],
          category: "Mapping & Site Data",
          folderStructure: ["01_Flight_Data", "02_Orthomosaic", "03_Elevation_Data", "04_Contour_Maps", "05_Volumetric_Reports", "06_GIS_CAD_Exports", "07_Final_Delivery"],
          imageUrl: "/uploads/svc-aerial-mapping.png",
          features: ["Geo-referenced orthomosaic included with every capture", "Elevation models and contour data available", "Volumetric and stockpile calculations", "GIS-ready and CAD-compatible export formats", "One-time capture or recurring subscription cadence", "Measurable dimensions and scale for planning and engineering reference"],
          disclaimer: "Apollo DroneWorks is not a licensed land surveying firm, and our pilots are not licensed surveyors. Aerial Mapping deliverables provide survey-grade-accuracy data suitable for planning, design, and engineering reference, but are not a substitute for a licensed boundary survey. For legal property boundaries or stamped survey documentation, please consult a licensed Professional Land Surveyor.",
          addonIndices: [9],
          monthlySubscriptionEnabled: true,
          frequencyDetails: "Custom cadence — weekly, bi-weekly, or monthly recurring capture based on project needs. Contact us for subscription pricing.",
        },
        {
          name: "Construction Monitoring / Timelapse",
          slug: "construction-monitoring-timelapse",
          description: "Recurring site visits that document your project's progress — choose Progress Documentation for a timestamped visual record, or Cinematic Timelapse for a polished video built for marketing.",
          price: 30000,
          pricingType: "tiered",
          pricingTiers: [
            { name: "Progress Documentation — Standard", style: "progress",  tier: "standard", price: 30000, priceType: "fixed", description: "Per visit — timestamped photo and video record" },
            { name: "Progress Documentation — Premium",  style: "progress",  tier: "premium",  price: 40000, priceType: "fixed", description: "Per visit — enhanced coverage and faster delivery" },
            { name: "Cinematic Timelapse — Standard",    style: "timelapse", tier: "standard", price: 37500, priceType: "fixed", description: "Per visit — min 8 visits recommended", minRecommendedVisits: 8 },
            { name: "Cinematic Timelapse — Premium",     style: "timelapse", tier: "premium",  price: 47500, priceType: "fixed", description: "Per visit — premium edit; min 8 visits recommended", minRecommendedVisits: 8 },
          ],
          priceRanges: [],
          category: "Mapping & Site Data",
          folderStructure: ["01_Raw_Visit_Captures", "02_Edited_Output", "03_Project_Archive_Gallery", "04_Final_Delivery"],
          imageUrl: "/uploads/svc-construction-monitoring.png",
          features: ["Style A — Progress Documentation: timestamped photo and video record of every visit", "Style B — Cinematic Timelapse: a polished, professionally edited marketing video", "Client sets the cadence: monthly, milestone-based, or more frequent", "Cinematic Timelapse includes licensed background music; music-free cut available on request", "Minimum 8 visits recommended for Cinematic Timelapse for a smooth final cut"],
          addonIndices: [10],
          monthlySubscriptionEnabled: true,
          frequencyDetails: "Client-set cadence — monthly, milestone-based, weekly, or custom",
        },
        // ── Construction Lifecycle & 3D Digital Twins ──────────────────────────
        {
          name: "3D Digital Twin",
          slug: "3d-digital-twin",
          description: "A photorealistic, fully navigable 3D model of a property's interior, exterior, or both — built so you can explore a space from any angle, anywhere, anytime.",
          price: 40000,
          pricingType: "tiered",
          pricingTiers: [
            { name: "Indoor — Under 3,000 sq ft",                             scope: "indoor",           priceType: "range", price: 40000,  minPrice: 40000,  maxPrice: 60000  },
            { name: "Indoor — 3,000–6,000 sq ft",                             scope: "indoor_large",     priceType: "range", price: 60000,  minPrice: 60000,  maxPrice: 90000  },
            { name: "Outdoor — Standard (single property/lot)",                scope: "outdoor_standard", priceType: "range", price: 75000,  minPrice: 75000,  maxPrice: 120000 },
            { name: "Outdoor — Premium (larger acreage/multiple structures)",  scope: "outdoor_premium",  priceType: "range", price: 150000, minPrice: 150000, maxPrice: 300000 },
          ],
          priceRanges: [],
          category: "Construction Lifecycle & 3D Digital Twins",
          folderStructure: ["01_Raw_Capture", "02_Processed_Splat_Data", "03_Digital_Twin_Viewer_Files", "04_Renders_And_Video", "05_Final_Delivery"],
          imageUrl: "/uploads/svc-3d-digital-twin.png",
          features: ["Select Indoor, Outdoor, or both — price updates live", "Indoor: photorealistic capture of every room", "Outdoor: full exterior twin including structure and lot", "Explore from any angle, on any device", "25% discount when both Indoor and Outdoor are selected together", "Embeddable viewer link delivered with your files"],
          addonIndices: [11, 12],
        },
        {
          name: "Rough-In Digital Twin",
          slug: "rough-in-digital-twin",
          description: "A complete 3D digital record of your home at the one moment that matters most — right before drywall goes up, when every pipe, wire, and duct is still visible.",
          price: 70000,
          pricingType: "tiered",
          pricingTiers: [
            { name: "Standard", priceType: "fixed", price: 70000,  description: "Single-family home rough-in capture" },
            { name: "Premium",  priceType: "fixed", price: 115000, description: "Larger home or more complex rough-in" },
          ],
          priceRanges: [],
          category: "Construction Lifecycle & 3D Digital Twins",
          folderStructure: ["01_Raw_Capture", "02_Processed_Splat_Data", "03_Digital_Twin_Viewer_Files", "04_Final_Delivery"],
          imageUrl: "/uploads/svc-rough-in-digital-twin.png",
          features: ["Exterior and interior capture at the rough-in / pre-drywall stage", "Every pipe, wire, and duct permanently documented in 3D", "Full credit toward Foundation to Finish or 3D Digital Twin if you upgrade later", "One-time capture — this window closes the moment drywall goes up"],
          addonIndices: [],
        },
        {
          name: "Foundation to Finish",
          slug: "foundation-to-finish",
          description: "From the first stake in the ground to the final walkthrough, we follow your project the whole way. Apollo DroneWorks documents your build from bare dirt through completion, then delivers a complete, photorealistic 3D Digital Twin of the finished property — inside and out. Already under construction? No problem — we can step in at any stage and pick up documentation from wherever your project stands today.",
          price: 247500,
          pricingType: "tiered",
          pricingTiers: [
            { name: "Phase 1 — Baseline Mapping",       phase: 1,    priceType: "fixed", price: 50000,  premiumPrice: 80000,  description: "Initial aerial mapping of the bare-ground site" },
            { name: "Phase 2B — Rough-In Digital Twin", phase: "2b", priceType: "fixed", price: 70000,  premiumPrice: 115000, description: "Full Digital Twin at rough-in / pre-drywall stage" },
            { name: "Phase 3 — Completion Marketing",   phase: 3,    priceType: "fixed", price: 30000,  premiumPrice: 45000,  description: "Aerial photography and video at project completion" },
            { name: "Phase 4 — Outdoor Digital Twin",   phase: 4,    priceType: "fixed", price: 90000,  premiumPrice: 150000, description: "Full exterior Digital Twin of the finished property" },
            { name: "Phase 5 — Indoor Digital Twin",    phase: 5,    priceType: "fixed", price: 50000,  premiumPrice: 75000,  description: "Full interior Digital Twin of the finished home" },
            { name: "Phase 6 — Final Assembly & Delivery", phase: 6, priceType: "fixed", price: 40000,  premiumPrice: 60000,  description: "Assembly of the full project archive and combined twin" },
          ],
          priceRanges: [],
          category: "Construction Lifecycle & 3D Digital Twins",
          folderStructure: ["01_Baseline_Mapping", "02_Progress_Documentation", "03_RoughIn_Digital_Twin", "04_Completion_Marketing", "05_Outdoor_Digital_Twin", "06_Indoor_Digital_Twin", "07_Final_Combined_Twin_And_Project_Archive"],
          imageUrl: "/uploads/svc-foundation-to-finish.png",
          features: ["Entry-point selector — we step in wherever your project stands today", "Phase 1: Baseline aerial mapping of bare ground", "Phase 2B: Rough-In Digital Twin before drywall goes up", "Phase 3: Completion marketing photo and video", "Phase 4: Outdoor Digital Twin of the finished exterior", "Phase 5: Indoor Digital Twin of the finished interior", "Phase 6: Full project archive and combined twin delivery", "25% bundle discount applied to all selected phases", "Want regular progress visits too? Add Construction Monitoring separately."],
          addonIndices: [13],
          addonEnabled: { 13: false }, // Project Story Video disabled by default
        },
      ];

      const insertedServiceIds: Array<{ name: string; id: number }> = [];
      for (const svc of defaultServices) {
        const { addonIndices, addonEnabled, ...svcData } = svc as any;
        const rows = await db.insert(services).values(svcData).returning({ id: services.id, name: services.name });
        insertedServiceIds.push(rows[0]);
      }
      console.log('Canonical services inserted.');

      // ── Service-addon links ───────────────────────────────────────────────────
      let linkCount = 0;
      for (const svc of defaultServices) {
        const { addonIndices, addonEnabled } = svc as any;
        const svcRow = insertedServiceIds.find(r => r.name === (svc as any).name);
        if (!svcRow) continue;
        for (const idx of (addonIndices as number[])) {
          const addonId = insertedAddonIds[idx];
          if (!addonId) continue;
          const isEnabled = (addonEnabled as Record<number, boolean> | undefined)?.[idx] ?? true;
          await db.execute(
            sql`INSERT INTO service_addons (service_id, addon_id, is_enabled)
                VALUES (${svcRow.id}, ${addonId}, ${isEnabled})`
          );
          linkCount++;
        }
      }
      console.log(`Seeded ${linkCount} service-addon links.`);

      // ── Display order for new categories ─────────────────────────────────────
      const displayOrder: Record<string, number> = {
        "Real Estate Listings": 10,
        "Property Tours": 20,
        "Promotional Content": 30,
        "Roof Inspections": 40,
        "Property & Site Evaluation": 50,
        "Structural Inspections": 60,
        "Aerial Mapping": 70,
        "Construction Monitoring / Timelapse": 75,
        "3D Digital Twin": 80,
        "Rough-In Digital Twin": 85,
        "Foundation to Finish": 90,
      };
      for (const { name, id } of insertedServiceIds) {
        if (displayOrder[name] !== undefined) {
          await db.update(services).set({ displayOrder: displayOrder[name] }).where(eq(services.id, id));
        }
      }

      // ── Rush order pricing for all seeded services ────────────────────────────
      for (const { id } of insertedServiceIds) {
        const existing = await db.execute(sql`SELECT id FROM rush_order_pricing WHERE service_id = ${id} LIMIT 1`);
        if ((existing.rows as unknown[]).length === 0) {
          await db.execute(sql`
            INSERT INTO rush_order_pricing (service_id, rush_multiplier, minimum_notice_hours, is_active)
            VALUES (${id}, 1.25, 24, true)
          `);
        }
      }
    }
    
    // Check if admin user exists
    const existingAdmins = await db.select().from(users).where(eq(users.isAdmin, true));
    
    // Create admin user if none exists
    if (existingAdmins.length === 0) {
      console.log('Creating admin user...');
      
      // Hash the password
      const hashedPassword = await hashPassword('admin123');
      
      await db.insert(users).values({
        username: 'admin',
        password: hashedPassword,
        email: 'admin@admin.com',
        firstName: 'Admin',
        lastName: 'User',
        phone: null,
        isAdmin: true
      });
      
      console.log('Admin user created successfully.');
    } else {
      console.log('Admin user already exists, skipping creation.');
    }
    
    // Skip before/after images initialization to avoid database errors
    console.log('Skipping before/after images initialization for now...');
    
    // Check if testimonials exist
    const existingTestimonials = await db.select().from(testimonials);
    
    // Add sample testimonials if none exist
    if (existingTestimonials.length === 0) {
      console.log('Adding sample testimonials...');
      
      const sampleTestimonials = [
        {
          name: "Michael Johnson",
          company: "Johnson Real Estate Group",
          content: "Apollo DroneWorks transformed how we showcase our luxury properties. The aerial photography captured views that simply weren't possible before, and our listings with drone footage receive 3x more inquiries. Excellent service and attention to detail!",
          rating: 5,
          isApproved: true
        },
        {
          name: "Sarah Williams",
          company: "Williams Construction",
          content: "We've been using Apollo's construction monitoring service for over a year now. Their consistent documentation of our project sites has improved our reporting to clients and helped us track progress more efficiently. Highly recommend their services!",
          rating: 5,
          isApproved: true
        },
        {
          name: "David Chen",
          company: "Meridian Development",
          content: "The 3D models and orthomosaic maps provided by Apollo DroneWorks have been invaluable for our development planning. Their team is professional, responsive, and delivers high-quality results every time. A pleasure to work with!",
          rating: 5,
          isApproved: true
        },
        {
          name: "Rebecca Martinez",
          company: "Coastal Properties",
          content: "Apollo's drone photography has become an essential part of our marketing strategy. The aerial perspectives highlight our waterfront properties perfectly. Fast turnaround times and excellent customer service.",
          rating: 4,
          isApproved: true
        },
        {
          name: "James Wilson",
          company: "Wilson Event Management",
          content: "We hired Apollo for our annual outdoor festival, and the footage they captured was absolutely stunning. Their drone operators were professional and unobtrusive while capturing dynamic views of our event. Will definitely use their services again!",
          rating: 5,
          isApproved: true
        }
      ];
      
      await db.insert(testimonials).values(sampleTestimonials);
      console.log('Sample testimonials added successfully.');
    } else {
      console.log('Testimonials already exist, skipping initialization.');
    }
    
    // Check if blog posts exist
    const existingBlogPosts = await db.select().from(blogPosts);
    
    // Add sample blog posts if none exist
    if (existingBlogPosts.length === 0) {
      console.log('Adding sample blog posts...');
      
      const sampleBlogPosts = [
        {
          title: "5 Ways Drones Are Revolutionizing Real Estate Marketing",
          content: `<p>The real estate industry has always been quick to adopt new technologies that can give properties an edge in a competitive market. Drone photography and videography have emerged as one of the most influential innovations in real estate marketing, transforming how properties are presented to potential buyers.</p>
          
          <h2>1. Showcasing the Complete Property</h2>
          <p>Traditional photography can only capture so much of a property. Drones allow real estate professionals to showcase the entire property, including land boundaries, proximity to amenities, and the surrounding neighborhood. This comprehensive view gives potential buyers a much better understanding of what they're considering purchasing.</p>
          
          <h2>2. Highlighting Unique Selling Points</h2>
          <p>Many properties have features that are difficult to appreciate from ground level. Whether it's a sprawling backyard, proximity to waterfront, or amazing views, drone footage can highlight these unique selling points in ways that traditional photography simply cannot. Our clients report that highlighting these features has significantly increased buyer interest in their listings.</p>
          
          <h2>3. Creating Immersive Virtual Tours</h2>
          <p>By combining aerial footage with interior walkthroughs, real estate professionals can create truly immersive virtual tours. These tours allow potential buyers to experience a property remotely, saving time for both buyers and sellers. During the pandemic, this capability became especially valuable, and it continues to be an important tool for reaching out-of-town buyers.</p>
          
          <h2>4. Conveying Lifestyle Beyond the Property</h2>
          <p>Drone footage doesn't just highlight the property itself; it can showcase the lifestyle that comes with it. From nearby parks and recreation areas to local shopping districts and schools, aerial footage can help buyers envision what life would be like in the neighborhood. This emotional connection can be a powerful motivator in the purchasing decision.</p>
          
          <h2>5. Standing Out in Listing Services</h2>
          <p>In crowded online listing services, properties with drone footage stand out. The eye-catching aerial views grab attention and lead to higher click-through rates. Our clients report that listings with drone footage receive approximately three times more views than those without, leading to faster sales and often higher selling prices.</p>
          
          <p>At Apollo DroneWorks, we specialize in creating stunning aerial imagery that showcases properties in their best light. Our experienced drone operators understand how to capture the features that will appeal most to potential buyers. Contact us today to learn how we can elevate your real estate marketing strategy.</p>`,
          imageUrl: "https://images.unsplash.com/photo-1506947411487-a56738267384?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
          category: "TIPS & TRICKS",
          excerpt: "Discover how aerial photography is changing the way properties are showcased and marketed to potential buyers."
        },
        {
          title: "Understanding Photogrammetry: From Drone Images to 3D Models",
          content: `<p>Photogrammetry has emerged as one of the most valuable applications of drone technology, enabling the creation of highly accurate 3D models from aerial photographs. This technology has transformed industries ranging from construction and mining to archaeology and environmental conservation.</p>
          
          <h2>What is Photogrammetry?</h2>
          <p>At its core, photogrammetry is the science of making measurements from photographs. By taking multiple overlapping images of a subject from different angles, specialized software can identify common points across images and use them to build a three-dimensional representation. When combined with drone technology, this process becomes incredibly powerful, allowing for rapid creation of accurate 3D models of large areas or structures.</p>
          
          <h2>The Drone Photogrammetry Process</h2>
          <p>Creating 3D models with drone photogrammetry involves several key steps:</p>
          <ol>
            <li><strong>Flight Planning:</strong> Determining the optimal flight path, altitude, and camera settings to ensure adequate coverage and image overlap (typically 70-80%).</li>
            <li><strong>Data Collection:</strong> Flying the drone in a precise pattern to capture hundreds or even thousands of high-resolution images of the subject area.</li>
            <li><strong>Data Processing:</strong> Using specialized software to align the images, create a sparse point cloud, then a dense point cloud, and finally a textured mesh or surface model.</li>
            <li><strong>Model Refinement:</strong> Cleaning up the model, removing errors, and optimizing for the intended use.</li>
            <li><strong>Analysis and Measurement:</strong> Extracting valuable information from the model, including measurements, volumes, and changes over time.</li>
          </ol>
          
          <h2>Practical Applications</h2>
          <p>The applications of drone photogrammetry are vast and growing:</p>
          <ul>
            <li><strong>Construction Monitoring:</strong> Tracking progress, measuring stockpiles, and identifying potential issues before they become costly problems.</li>
            <li><strong>Land Development:</strong> Creating accurate topographic maps and calculating cut/fill volumes for earthwork planning.</li>
            <li><strong>Real Estate:</strong> Generating interactive 3D models of properties and developments for marketing purposes.</li>
            <li><strong>Infrastructure Inspection:</strong> Creating detailed models of bridges, towers, and other structures to identify maintenance needs.</li>
            <li><strong>Environmental Monitoring:</strong> Tracking changes in landscapes, coastlines, and vegetation over time.</li>
          </ul>
          
          <h2>Advantages Over Traditional Methods</h2>
          <p>Compared to traditional surveying methods, drone photogrammetry offers significant advantages:</p>
          <ul>
            <li>Dramatically faster data collection</li>
            <li>Reduced personnel requirements and safety risks</li>
            <li>Comprehensive visual documentation</li>
            <li>Ability to easily repeat surveys to track changes over time</li>
            <li>Cost-effective for medium to large areas</li>
          </ul>
          
          <p>At Apollo DroneWorks, we specialize in creating accurate, high-resolution 3D models using state-of-the-art drone photogrammetry techniques. Our experienced team can help you leverage this powerful technology for your specific needs, whether you're monitoring construction progress, planning land development, or documenting existing conditions.</p>`,
          imageUrl: "https://images.unsplash.com/photo-1579463148228-138296ac3b98?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
          category: "TECHNOLOGY",
          excerpt: "Learn about the technology behind creating accurate 3D models from aerial imagery and its practical applications."
        },
        {
          title: "How Drones Are Transforming Construction Monitoring",
          content: `<p>Construction monitoring has traditionally been a labor-intensive process requiring frequent site visits and manual documentation. Drone technology is revolutionizing this aspect of construction management, offering unprecedented efficiency, accuracy, and safety. This case study examines how one of our clients, a major commercial developer, utilized our drone monitoring services to transform their project management approach.</p>
          
          <h2>The Challenge</h2>
          <p>Our client was developing a 15-acre mixed-use complex with multiple buildings being constructed simultaneously. The project faced several monitoring challenges:</p>
          <ul>
            <li>Difficulty tracking progress across such a large site</li>
            <li>Inconsistent documentation between different site supervisors</li>
            <li>Delays in identifying and addressing construction issues</li>
            <li>Safety concerns with manual inspections of tall structures</li>
            <li>Time-consuming reporting process to stakeholders</li>
          </ul>
          
          <h2>The Solution: Weekly Drone Monitoring</h2>
          <p>Apollo DroneWorks implemented a comprehensive drone monitoring program that included:</p>
          <ol>
            <li><strong>Regular Aerial Surveys:</strong> Weekly drone flights to capture the entire site from multiple angles and altitudes.</li>
            <li><strong>Photogrammetry and 3D Modeling:</strong> Creation of accurate 3D models of the site showing precise measurements and volumes.</li>
            <li><strong>Progress Tracking:</strong> Comparative analysis of current and previous surveys to quantify progress.</li>
            <li><strong>Thermal Inspections:</strong> Periodic thermal imaging to identify potential issues with mechanical systems and building envelope.</li>
            <li><strong>Digital Documentation:</strong> Organized, date-stamped imagery accessible through a secure online portal.</li>
          </ol>
          
          <h2>The Results</h2>
          <p>After implementing drone monitoring for six months, our client reported significant improvements:</p>
          
          <h3>Quantifiable Benefits:</h3>
          <ul>
            <li><strong>Time Savings:</strong> 12 hours per week saved in manual site documentation and reporting</li>
            <li><strong>Cost Reduction:</strong> 8% decrease in overall project management costs</li>
            <li><strong>Issue Identification:</strong> 14 construction issues identified early through aerial imagery, preventing costly rework</li>
            <li><strong>Schedule Improvement:</strong> Project timeline accelerated by approximately 3 weeks due to improved coordination</li>
            <li><strong>Safety Incidents:</strong> Zero safety incidents related to inspections (compared to three minor incidents in previous similar projects)</li>
          </ul>
          
          <h3>Qualitative Benefits:</h3>
          <ul>
            <li>Improved stakeholder communication with visual progress updates</li>
            <li>Enhanced project team coordination through shared, accurate site visualization</li>
            <li>Better subcontractor accountability with clear documentation of work completed</li>
            <li>More accurate as-built documentation for future maintenance and renovations</li>
            <li>Comprehensive visual record for potential dispute resolution</li>
          </ul>
          
          <h2>Client Testimonial</h2>
          <p>"The drone monitoring program from Apollo DroneWorks has transformed how we manage large construction projects. The regular aerial surveys provide our team with accurate, comprehensive site data that has improved our decision-making and dramatically reduced the time spent on documentation. The ability to track progress visually and share it with stakeholders has been invaluable. We've already incorporated this approach into all our major development projects." - Sarah Williams, Project Director</p>
          
          <p>This case study demonstrates the significant value that drone technology can bring to construction monitoring. By providing accurate, consistent, and comprehensive site documentation, drones enable better project management, improved safety, and substantial cost savings.</p>`,
          imageUrl: "https://images.unsplash.com/photo-1562408590-e32931084e23?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
          category: "CASE STUDY",
          excerpt: "Explore a real-world case study showing how drone monitoring saved time and reduced costs for a major development."
        },
        {
          title: "Drone Regulations: What You Need to Know in 2023",
          content: `<p>As drone technology continues to advance and applications expand across industries, navigating the regulatory landscape becomes increasingly important for both commercial operators and hobbyists. Staying compliant not only keeps you on the right side of the law but also promotes safe and responsible drone use. Here's what you need to know about drone regulations in 2023.</p>
          
          <h2>Commercial vs. Recreational Operations</h2>
          <p>The first distinction to understand is between commercial and recreational drone operations:</p>
          <ul>
            <li><strong>Commercial Operations:</strong> Any use of drones for business purposes or compensation, including real estate photography, construction monitoring, or even posting monetized videos on YouTube.</li>
            <li><strong>Recreational Operations:</strong> Flying drones purely for personal enjoyment with no business purpose or compensation.</li>
          </ul>
          <p>This distinction is crucial as it determines which set of regulations applies to your activities.</p>
          
          <h2>Commercial Drone Operations: Part 107</h2>
          <p>If you're using drones for any commercial purpose, you must comply with the FAA's Part 107 regulations, which include:</p>
          <ul>
            <li><strong>Certification Requirements:</strong> Commercial pilots must obtain a Remote Pilot Certificate by passing an aeronautical knowledge test at an FAA-approved testing center and completing an application process.</li>
            <li><strong>Registration:</strong> All drones weighing between 0.55 lbs (250g) and 55 lbs must be registered with the FAA, with registration numbers displayed on the aircraft.</li>
            <li><strong>Operating Rules:</strong>
              <ul>
                <li>Maintain visual line-of-sight with the drone</li>
                <li>Fly below 400 feet above ground level</li>
                <li>Maximum groundspeed of 100 mph</li>
                <li>Fly only during daylight or civil twilight with appropriate lighting</li>
                <li>Yield right of way to manned aircraft</li>
                <li>No operations over people not directly participating in the operation</li>
                <li>No operations from moving vehicles except in sparsely populated areas</li>
              </ul>
            </li>
          </ul>
          
          <h2>New in 2023: Operations Over People and Moving Vehicles</h2>
          <p>Recent updates to the regulations now allow for operations over people and moving vehicles under certain conditions, based on four categories of risk:</p>
          <ol>
            <li><strong>Category 1:</strong> Small drones (less than 0.55 lbs) with no exposed rotating parts</li>
            <li><strong>Category 2:</strong> Drones that won't cause injury above a certain threshold</li>
            <li><strong>Category 3:</strong> Drones with higher injury risk, but operations limited to areas with restricted access</li>
            <li><strong>Category 4:</strong> Drones operating under an FAA-approved operating manual</li>
          </ol>
          <p>Each category has specific requirements for drone design, performance, and operational limitations.</p>
          
          <h2>Remote ID Requirements</h2>
          <p>Perhaps the biggest regulatory change affecting drone operators in 2023 is the implementation of Remote ID requirements. By September 16, 2023, nearly all drones operating in US airspace must have Remote ID capability, which broadcasts identification, location, and performance information about the drone and its control station.</p>
          
          <p>There are three ways to comply with Remote ID requirements:</p>
          <ol>
            <li><strong>Standard Remote ID:</strong> Drones built with Remote ID capabilities</li>
            <li><strong>Remote ID Broadcast Module:</strong> A separate device attached to older drones</li>
            <li><strong>Flying at FAA-Recognized Identification Areas (FRIAs):</strong> Designated areas where drones without Remote ID can operate</li>
          </ol>
          
          <h2>Airspace Restrictions</h2>
          <p>Understanding where you can and cannot fly is critical:</p>
          <ul>
            <li><strong>Controlled Airspace:</strong> Operations in controlled airspace (Classes B, C, D, and E to the surface) require prior authorization through the FAA's LAANC system or DroneZone portal.</li>
            <li><strong>Restricted Areas:</strong> No drone operations are permitted in restricted airspace, including:
              <ul>
                <li>Within 5 miles of airports without proper authorization</li>
                <li>Over or near emergency response efforts</li>
                <li>Near stadiums during major sporting events</li>
                <li>In national parks (without special permission)</li>
                <li>In areas covered by Temporary Flight Restrictions (TFRs)</li>
              </ul>
            </li>
          </ul>
          
          <h2>State and Local Regulations</h2>
          <p>Beyond federal regulations, many states and municipalities have enacted their own drone laws concerning:</p>
          <ul>
            <li>Privacy protections</li>
            <li>Limitations on flights over public property</li>
            <li>Restrictions on operations near critical infrastructure</li>
            <li>Local registration or permit requirements</li>
          </ul>
          <p>Always research and comply with both federal and local regulations before operations.</p>
          
          <h2>How Apollo DroneWorks Maintains Compliance</h2>
          <p>At Apollo DroneWorks, regulatory compliance is a cornerstone of our operations. Our approach includes:</p>
          <ul>
            <li>Maintaining current Part 107 certification for all pilots</li>
            <li>Comprehensive pre-flight planning with airspace checks</li>
            <li>Obtaining all necessary authorizations for controlled airspace operations</li>
            <li>Regular compliance training for our team</li>
            <li>Implementing Remote ID on our entire fleet</li>
            <li>Carrying appropriate liability insurance</li>
            <li>Maintaining detailed flight logs</li>
          </ul>
          
          <p>Navigating drone regulations can be complex, but understanding and following these rules is essential for safe and legal operations. Whether you're a commercial operator or a hobbyist, staying informed about current requirements will ensure you can continue to enjoy the benefits of drone technology while minimizing risks and potential penalties.</p>`,
          imageUrl: "https://images.unsplash.com/photo-1508444845599-5c89863b1c44?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
          category: "REGULATIONS",
          excerpt: "Stay up to date with the latest drone regulations and requirements for commercial and recreational drone pilots."
        },
        {
          title: "The Future of Aerial Cinematography",
          content: `<p>Aerial cinematography has undergone a remarkable transformation in the past decade. What once required helicopter rentals costing thousands of dollars per hour is now achievable with drones at a fraction of the cost. This democratization of aerial imaging has revolutionized filmmaking, television production, and commercial videography. As we look toward the future, several exciting trends and technologies are poised to take aerial cinematography to new heights.</p>
          
          <h2>Autonomous Flight Systems</h2>
          <p>The next generation of drones is increasingly focused on autonomy, with advanced flight systems that can execute complex camera movements with precision and repeatability.</p>
          
          <p>Current autonomous systems allow for pre-programmed flight paths, but future systems will incorporate real-time subject tracking with predictive movement algorithms. Imagine a drone that can anticipate where an athlete will move next and position itself for the perfect shot, or one that can navigate complex environments while maintaining perfect framing of its subject.</p>
          
          <p>This level of autonomy will enable solo filmmakers to capture shots that would traditionally require a pilot and camera operator working in tandem. It will also allow for more dynamic and complex shots in challenging environments where manual control might be difficult or unpredictable.</p>
          
          <h2>AI-Powered Shot Composition</h2>
          <p>Artificial intelligence is beginning to influence how drones frame and compose shots. Current systems can identify and track subjects, but future AI systems will understand cinematography principles and aesthetic considerations.</p>
          
          <p>These advanced systems will analyze scenes in real-time to identify optimal angles, lighting conditions, and compositions based on established filmmaking principles or even the specific style of a particular director. They'll also be able to anticipate dramatic moments and adjust framing accordingly.</p>
          
          <p>For commercial productions, this could mean AI systems that inherently understand brand guidelines and marketing objectives, automatically capturing footage that aligns with a company's visual identity and messaging goals.</p>
          
          <h2>Advanced Camera Systems</h2>
          <p>Drone cameras continue to improve dramatically, with several key developments on the horizon:</p>
          
          <h3>Global Shutter Sensors</h3>
          <p>Unlike the rolling shutters common in most drone cameras today, global shutter sensors capture the entire frame instantaneously, eliminating the distortion that can occur when filming fast-moving subjects or executing quick camera movements. As these sensors become more affordable and energy-efficient, they'll become standard in professional drone systems.</p>
          
          <h3>Larger Sensors with Better Low-Light Performance</h3>
          <p>The trend toward larger sensors will continue, with full-frame and even medium format sensors eventually making their way into drone systems. This will dramatically improve image quality, dynamic range, and low-light performance, opening up new possibilities for dawn, dusk, and nighttime aerial cinematography.</p>
          
          <h3>Computational Photography</h3>
          <p>Techniques that combine multiple exposures or use AI to enhance image quality will become more sophisticated, allowing drones to overcome some of their physical limitations. For example, computational methods might enable smaller drones to achieve the image quality traditionally associated with larger, more expensive systems.</p>
          
          <h2>Specialized Drone Designs</h2>
          <p>As the market matures, we're seeing more purpose-built drones designed for specific cinematography applications:</p>
          
          <h3>Indoor Cinematography Drones</h3>
          <p>Smaller, quieter drones with protective frames and advanced obstacle avoidance are being developed specifically for indoor filming. These systems will enable stunning reveals and transitions that move seamlessly from outside to inside environments.</p>
          
          <h3>High-Speed Tracking Drones</h3>
          <p>FPV (First-Person-View) drones have already demonstrated the potential for high-speed, dynamic shots that closely follow fast-moving subjects. Future systems will combine this capability with more sophisticated camera stabilization and tracking features, allowing for high-speed pursuit shots with cinema-quality image stability.</p>
          
          <h3>Heavy-Lift Cinema Drones</h3>
          <p>At the high end of the market, heavy-lift drones capable of carrying cinema cameras like ARRI and RED systems will become more refined, with longer flight times and more precise control systems. These will increasingly be accepted as standard tools on major film productions.</p>
          
          <h2>Regulatory Adaptation</h2>
          <p>As drone technology advances, regulatory frameworks are evolving to accommodate new capabilities while ensuring safety:</p>
          
          <h3>Beyond Visual Line of Sight (BVLOS)</h3>
          <p>Current regulations typically require operators to maintain visual contact with their drones, but frameworks for safe BVLOS operations are developing. This will enable much more extensive and creative filming opportunities, particularly for documentary and nature cinematography.</p>
          
          <h3>Night Operations</h3>
          <p>Restrictions on night flying are gradually easing with appropriate lighting and safety measures, opening up new aesthetic possibilities for aerial cinematography.</p>
          
          <h3>Flight Over People</h3>
          <p>As drone safety systems improve, restrictions on flying over people are being reconsidered, which will be particularly valuable for event coverage and urban filmmaking.</p>
          
          <h2>Integration with Virtual Production</h2>
          <p>Perhaps one of the most exciting frontiers is the integration of drone cinematography with virtual production techniques:</p>
          
          <h3>Real-time Environment Scanning</h3>
          <p>Drones equipped with LiDAR or photogrammetry capabilities can quickly scan environments to create 3D models for virtual production stages, enabling seamless integration between real and virtual elements.</p>
          
          <h3>In-camera VFX</h3>
          <p>Drone footage can be combined with LED volume technology (as used in productions like "The Mandalorian") to create realistic backgrounds for studio shooting, combining the best of location and controlled environment filming.</p>
          
          <h3>Previsualization</h3>
          <p>Drones are increasingly being used to test and previsualize complex shots before committing to expensive helicopter or crane setups, improving production efficiency.</p>
          
          <p>The future of aerial cinematography is not just about better image quality or longer flight times—it's about creating entirely new visual possibilities and storytelling opportunities. As drones become more intelligent, autonomous, and capable, they will continue to transform how we capture and experience visual media, enabling filmmakers to achieve their creative visions with fewer constraints than ever before.</p>`,
          imageUrl: "https://images.unsplash.com/photo-1473968512647-3e447244af8f?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
          category: "INDUSTRY TRENDS",
          excerpt: "Explore the latest trends and technologies shaping the future of aerial cinematography and drone videography."
        },
        {
          title: "Best Drones for Real Estate Photography in 2023",
          content: `<p>Real estate photography is one of the most common commercial applications for drones, and for good reason. Aerial images and video provide potential buyers with perspectives that simply aren't possible with traditional ground-based photography. As drone technology continues to evolve, real estate professionals have more options than ever when selecting the right equipment for their needs.</p>
          
          <p>At Apollo DroneWorks, we regularly evaluate and test the latest drone technology to ensure we're providing our clients with the best possible imagery. While we use professional-grade equipment for our services, we understand that many real estate professionals are interested in handling some aerial photography themselves. This guide will help you understand the key considerations and top options available in 2023.</p>
          
          <h2>Key Considerations for Real Estate Drones</h2>
          
          <h3>Image Quality</h3>
          <p>When it comes to showcasing properties, image quality is paramount. Look for drones with at least a 1-inch sensor, 20MP resolution, and the ability to shoot in RAW format for maximum editing flexibility. Video capabilities should include 4K resolution at a minimum of 30fps, though higher frame rates provide more flexibility in post-production.</p>
          
          <h3>Flight Time</h3>
          <p>Longer flight times mean you can capture more footage in a single session. For real estate purposes, aim for drones with at least 25-30 minutes of flight time per battery. Remember that advertised flight times are typically measured in ideal conditions, so real-world performance may be shorter, especially in windy conditions.</p>
          
          <h3>Ease of Use</h3>
          <p>If you're not a full-time drone operator, you'll want a system that's intuitive and includes automated flight modes specifically designed for real estate, such as orbit, waypoints, and automated panoramas.</p>
          
          <h3>Portability</h3>
          <p>Real estate professionals are often on the go, moving between multiple properties in a day. A drone that's easy to transport and quick to deploy is a significant advantage.</p>
          
          <h3>Obstacle Avoidance</h3>
          <p>When operating around buildings and trees, obstacle detection and avoidance systems can prevent costly accidents and protect your investment.</p>
          
          <h3>Regulatory Compliance</h3>
          <p>All drones used for commercial purposes (which includes real estate marketing) must comply with FAA regulations. This means operators need a Part 107 certificate, and the drone must be properly registered. Additionally, new Remote ID requirements are now in effect.</p>
          
          <h2>Top Drones for Real Estate Photography</h2>
          
          <h3>DJI Air 2S: Best Overall Value</h3>
          <p><strong>Price Range:</strong> $999 - $1,299</p>
          <p><strong>Key Specifications:</strong></p>
          <ul>
            <li>1-inch CMOS sensor with 20MP photos and 5.4K video</li>
            <li>Up to 31 minutes of flight time</li>
            <li>Omnidirectional obstacle sensing</li>
            <li>Compact, foldable design</li>
            <li>MasterShots feature for automated cinematic sequences</li>
            <li>10-bit D-Log color profile for professional color grading</li>
          </ul>
          <p><strong>Ideal For:</strong> Real estate professionals who want excellent image quality and smart features in a portable, user-friendly package. The Air 2S represents the sweet spot of performance and price for most real estate applications.</p>
          
          <h3>DJI Mini 3 Pro: Most Portable Option</h3>
          <p><strong>Price Range:</strong> $759 - $949</p>
          <p><strong>Key Specifications:</strong></p>
          <ul>
            <li>Sub-250g weight (requiring less regulatory oversight for recreational use)</li>
            <li>1/1.3-inch CMOS sensor with 48MP photos and 4K/60fps video</li>
            <li>Up to 34 minutes of flight time</li>
            <li>Tri-directional obstacle sensing</li>
            <li>True vertical shooting for social media content</li>
            <li>Extremely compact, foldable design</li>
          </ul>
          <p><strong>Ideal For:</strong> Agents who prioritize portability and need a drone they can always have with them. While it has a smaller sensor than the Air 2S, the image quality is still excellent for most real estate marketing needs.</p>
          
          <h3>DJI Mavic 3: Premium Choice</h3>
          <p><strong>Price Range:</strong> $1,599 - $4,999 (depending on edition)</p>
          <p><strong>Key Specifications:</strong></p>
          <ul>
            <li>Hasselblad 4/3 CMOS sensor with 20MP photos and 5.1K video</li>
            <li>Secondary telephoto camera with 28x hybrid zoom</li>
            <li>Up to 46 minutes of flight time</li>
            <li>Omnidirectional obstacle sensing</li>
            <li>Advanced Master Shots and panorama modes</li>
            <li>Apple ProRes 422 HQ support (Cine version)</li>
            <li>10-bit D-Log color profile</li>
          </ul>
          <p><strong>Ideal For:</strong> Luxury real estate marketing where the highest image quality and production value are essential. The Mavic 3's extended flight time also makes it ideal for covering large estates or commercial properties.</p>
          
          <h3>Autel Robotics Evo Lite+: Best Alternative to DJI</h3>
          <p><strong>Price Range:</strong> $1,249 - $1,549</p>
          <p><strong>Key Specifications:</strong></p>
          <ul>
            <li>1-inch CMOS sensor with 20MP photos and 6K video</li>
            <li>Up to 40 minutes of flight time</li>
            <li>Adjustable aperture (f/2.8-f/11)</li>
            <li>Forward, backward and downward obstacle avoidance</li>
            <li>4K night mode for low-light performance</li>
            <li>Dynamic tracking capabilities</li>
          </ul>
          <p><strong>Ideal For:</strong> Those looking for an alternative to DJI products with some unique advantages, such as longer flight time and adjustable aperture, which is particularly useful for controlling exposure in bright conditions often encountered in real estate photography.</p>
          
          <h3>Skydio 2+: Best Autonomous Flying</h3>
          <p><strong>Price Range:</strong> $1,099 - $1,949</p>
          <p><strong>Key Specifications:</strong></p>
          <ul>
            <li>1/2.3" CMOS sensor with 12MP photos and 4K/60fps video</li>
            <li>Up to 27 minutes of flight time</li>
            <li>Industry-leading obstacle avoidance and autonomous navigation</li>
            <li>KeyFrame autonomous cinematography</li>
            <li>3D scanning capabilities</li>
          </ul>
          <p><strong>Ideal For:</strong> Real estate professionals operating in complex environments with numerous obstacles, where the autonomous navigation capabilities can significantly reduce the risk of crashes while capturing smooth, professional footage.</p>
          
          <h2>Accessories Worth Considering</h2>
          
          <h3>ND Filters</h3>
          <p>Neutral Density filters are essential for controlling exposure in bright conditions and achieving the correct shutter speed for cinematic video (typically around 1/60 for 30fps recording).</p>
          
          <h3>Multiple Batteries</h3>
          <p>For larger properties or multiple shoots in a day, having 2-3 extra batteries ensures you won't run out of flight time at a critical moment.</p>
          
          <h3>Hard Case</h3>
          <p>A quality hard case protects your investment during transport and storage, particularly important for real estate agents who are frequently on the move.</p>
          
          <h3>Tablet Mount</h3>
          <p>Using a tablet instead of a smartphone provides a larger screen for monitoring your footage, making it easier to ensure you're capturing exactly what you need.</p>
          
          <h2>When to Hire Professionals</h2>
          
          <p>While many real estate agents can achieve good results with consumer drones, there are situations where hiring professional drone operators like Apollo DroneWorks makes more sense:</p>
          
          <ul>
            <li><strong>High-value properties</strong> that justify the investment in premium photography</li>
            <li><strong>Complex shooting environments</strong> that require advanced piloting skills</li>
            <li><strong>When time is limited</strong> and you need efficient, reliable results</li>
            <li><strong>If you lack a Part 107 certificate</strong> required for commercial drone operations</li>
            <li><strong>For specialized techniques</strong> like twilight photography or interior-to-exterior reveal shots</li>
          </ul>
          
          <p>Professional drone operators bring not only better equipment but also the experience to know exactly which angles and movements will best showcase a property's features.</p>
          
          <h2>Legal Requirements Reminder</h2>
          
          <p>Remember that using drones for real estate marketing is considered commercial operation by the FAA, which requires:</p>
          
          <ul>
            <li>A valid Part 107 Remote Pilot Certificate</li>
            <li>Proper drone registration with the FAA</li>
            <li>Compliance with airspace restrictions</li>
            <li>Adherence to all operating rules under Part 107</li>
            <li>As of 2023, Remote ID capability</li>
          </ul>
          
          <p>The right drone can significantly enhance your real estate marketing efforts, providing prospective buyers with compelling views and perspectives that help properties stand out in a competitive market. Whether you choose to invest in your own equipment or work with professional drone operators, aerial imagery has become an essential component of effective real estate marketing in 2023.</p>`,
          imageUrl: "https://images.unsplash.com/photo-1592862025931-40cde3b2946f?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
          category: "EQUIPMENT",
          excerpt: "Our expert recommendations for the best drones to use for professional real estate photography and videography."
        }
      ];
      
      await db.insert(blogPosts).values(sampleBlogPosts);
      console.log('Sample blog posts added successfully.');
    } else {
      console.log('Blog posts already exist, skipping initialization.');
    }
    
    // Run quotes migration
    try {
      const { createQuotesTable } = await import('./migrations/create-quotes-table');
      await createQuotesTable();
      console.log('Quotes table created successfully');
      
      // Update the quotes table with business costs fields
      const { updateQuotesBusinessCosts } = await import('./migrations/update-quotes-business-costs');
      await updateQuotesBusinessCosts();
      
      // Create business config table for persistent business costs
      const { createBusinessConfigTable } = await import('./migrations/create-business-config-table');
      await createBusinessConfigTable();
      
      // Add software subscriptions and custom costs fields to business config
      const { addSoftwareAndCustomCosts } = await import('./migrations/add-software-and-custom-costs');
      await addSoftwareAndCustomCosts();
      
      // Create payroll system tables
      const { createPayrollTables } = await import('./migrations/create-payroll-tables');
      try {
        await createPayrollTables();
        console.log('Payroll tables created successfully');
      } catch (payrollError) {
        console.error('Error creating payroll tables:', payrollError);
      }
    } catch (error) {
      console.error('Error with tables:', error);
    }

    // Service catalog rebuild (idempotent — skips if 3D Digital Twin already exists)
    try {
      const { rebuildServiceCatalog } = await import('./migrations/rebuild-service-catalog');
      await rebuildServiceCatalog();
    } catch (err) {
      console.error('Error in rebuild-service-catalog migration:', err);
    }

    // Populate service-addon links if missing (handles partial-seed recovery)
    try {
      const { populateServiceAddonLinks } = await import('./migrations/populate-service-addon-links');
      await populateServiceAddonLinks();
    } catch (err) {
      console.error('Error in populate-service-addon-links migration:', err);
    }

    // Populate rush order pricing if missing (handles partial-seed recovery)
    try {
      const { populateRushOrderPricing } = await import('./migrations/populate-rush-order-pricing');
      await populateRushOrderPricing();
    } catch (err) {
      console.error('Error in populate-rush-order-pricing migration:', err);
    }

    console.log('Database initialization complete.');
  } catch (error) {
    console.error('Error initializing database:', error);
  }
}