/**
 * Apollo DroneWorks — service pricing & structure update
 * Applies new pricing tiers, flat rate changes, and converts
 * Construction Monitoring to a subscription service.
 *
 * Run: cd ~/apollo-droneworks && npx tsx server/update-service-pricing.ts
 */
import "dotenv/config";
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";

neonConfig.webSocketConstructor = ws;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// ── helpers ──────────────────────────────────────────────────────────────────
type Tier = {
  name: string; price: number; priceType: "fixed" | "quote";
  isPopular: boolean; displayOrder: number; description: string;
  features: string[]; deliverables: Array<{
    name: string; quantityType: "range" | "exact";
    exactQuantity?: number; minQuantity?: number; maxQuantity?: number;
    quantityUnit: string;
  }>;
  subscriptionEnabled: false; subscriptionPriceType: "fixed";
  subscriptionPercentage: 0; weeklySubscriptionPrice: 0;
  monthlySubscriptionPrice: 0; biWeeklySubscriptionPrice: 0;
};

const sub = {
  subscriptionEnabled: false as const, subscriptionPriceType: "fixed" as const,
  subscriptionPercentage: 0 as const, weeklySubscriptionPrice: 0 as const,
  monthlySubscriptionPrice: 0 as const, biWeeklySubscriptionPrice: 0 as const,
};

function tier(
  name: string, price: number, priceType: "fixed" | "quote",
  isPopular: boolean, displayOrder: number, description: string,
  deliverables: Tier["deliverables"]
): Tier {
  return { name, price, priceType, isPopular, displayOrder, description,
    features: [], deliverables, ...sub };
}

async function update(c: any, id: number, fields: Record<string, unknown>) {
  const keys = Object.keys(fields);
  const vals = Object.values(fields);
  const set  = keys.map((k, i) => `"${k}" = $${i + 2}`).join(", ");
  await c.query(`UPDATE services SET ${set}, updated_at = NOW() WHERE id = $1`,
    [id, ...vals]);
}

// ── main ─────────────────────────────────────────────────────────────────────
async function run() {
  const c = await pool.connect();
  console.log("✏️   Updating Apollo DroneWorks service pricing…\n");

  try {

    // ── 1. REAL ESTATE LISTINGS ── tiered, add Luxury tier ──────────────────
    console.log("  1. Real Estate Listings — updating tiers + adding Luxury");
    const re_tiers: Tier[] = [
      tier("Essentials", 11900, "fixed", false, 0,
        "Entry-level aerial coverage for smaller homes and quick listings. " +
        "Includes 10–12 edited aerial photos and one 30–45 second cinematic video flyover — " +
        "everything you need for a fast, professional MLS boost.",
        [
          { name: "Edited aerial photos (MLS-optimized JPG)", quantityType: "range", minQuantity: 10, maxQuantity: 12, quantityUnit: "photos" },
          { name: "Cinematic video flyover", quantityType: "exact", exactQuantity: 1, quantityUnit: "30–45 sec reel" },
        ]),
      tier("Premium", 15900, "fixed", true, 1,
        "Our most popular package — the right balance of quality and value for most residential listings. " +
        "More photos, a longer cinematic video, and a vertical social media cut included.",
        [
          { name: "Edited aerial photos (MLS-optimized JPG)", quantityType: "range", minQuantity: 18, maxQuantity: 25, quantityUnit: "photos" },
          { name: "Cinematic video with music", quantityType: "exact", exactQuantity: 1, quantityUnit: "60–90 sec video" },
          { name: "Vertical social media cut (9:16)", quantityType: "exact", exactQuantity: 1, quantityUnit: "clip" },
        ]),
      tier("Pro", 21500, "fixed", false, 2,
        "Step-up professional visuals for larger or more competitive properties. " +
        "More photos, a 2-minute cinematic video, and two social-ready cuts.",
        [
          { name: "Edited aerial photos (MLS-optimized JPG)", quantityType: "range", minQuantity: 25, maxQuantity: 35, quantityUnit: "photos" },
          { name: "Cinematic video with music", quantityType: "exact", exactQuantity: 1, quantityUnit: "2-min video" },
          { name: "Vertical social media cuts (9:16)", quantityType: "exact", exactQuantity: 2, quantityUnit: "clips" },
        ]),
      tier("Luxury / Estate", 31900, "fixed", false, 3,
        "The full white-glove package for high-end estates where presentation is everything. " +
        "Includes a twilight exterior shoot, a premium 3–4 minute cinematic edit, four social cuts, and a 4K master archive.",
        [
          { name: "Edited aerial photos (MLS-optimized JPG)", quantityType: "range", minQuantity: 35, maxQuantity: 50, quantityUnit: "photos" },
          { name: "Cinematic video with licensed music", quantityType: "exact", exactQuantity: 1, quantityUnit: "3–4 min video" },
          { name: "Twilight exterior shoot", quantityType: "exact", exactQuantity: 1, quantityUnit: "session" },
          { name: "Vertical social media cuts (9:16)", quantityType: "exact", exactQuantity: 4, quantityUnit: "clips" },
          { name: "4K master file archive", quantityType: "exact", exactQuantity: 1, quantityUnit: "file set" },
        ]),
    ];
    await update(c, 1, {
      price: 11900,
      pricing_type: "tiered",
      pricing_tiers: JSON.stringify(re_tiers),
      price_ranges: JSON.stringify([{ label: "4 tailored packages", minPrice: 11900, maxPrice: 31900 }]),
    });

    // ── 2. PROPERTY TOURS ── flat rate update ────────────────────────────────
    console.log("  2. Property Tours — flat rate $349 → $359");
    await update(c, 2, { price: 35900, pricing_type: "flat", pricing_tiers: JSON.stringify([]) });

    // ── 3. PROMOTIONAL CONTENT ── flat → tiered ──────────────────────────────
    console.log("  3. Promotional Content — converting to 3-tier");
    const promo_tiers: Tier[] = [
      tier("Basic", 47900, "fixed", false, 0,
        "Ideal for small businesses, grand openings, and social media campaigns. " +
        "Single-location shoot with a complete edited deliverable and a social cut.",
        [
          { name: "On-site shoot time", quantityType: "exact", exactQuantity: 90, quantityUnit: "min" },
          { name: "Location", quantityType: "exact", exactQuantity: 1, quantityUnit: "location" },
          { name: "Edited promo video", quantityType: "exact", exactQuantity: 1, quantityUnit: "60–90 sec video" },
          { name: "Vertical social media cut (9:16)", quantityType: "exact", exactQuantity: 1, quantityUnit: "clip" },
        ]),
      tier("Standard", 79900, "fixed", true, 1,
        "Half-day production for businesses needing a polished multi-angle promotional package. " +
        "Two locations, a full edited video with color grade, aerial stills, and two social cuts.",
        [
          { name: "On-site shoot time", quantityType: "exact", exactQuantity: 4, quantityUnit: "hrs" },
          { name: "Locations", quantityType: "exact", exactQuantity: 2, quantityUnit: "locations" },
          { name: "Edited promo video", quantityType: "exact", exactQuantity: 1, quantityUnit: "2–3 min video" },
          { name: "Aerial stills", quantityType: "exact", exactQuantity: 15, quantityUnit: "edited photos" },
          { name: "Vertical social media cuts (9:16)", quantityType: "exact", exactQuantity: 2, quantityUnit: "clips" },
        ]),
      tier("Campaign", 119900, "fixed", false, 2,
        "Full-day brand campaign production for regional marketing, tourism, hospitality, or commercial clients. " +
        "Multiple locations, hero video, licensed music, and a complete suite of deliverables.",
        [
          { name: "On-site shoot time", quantityType: "exact", exactQuantity: 8, quantityUnit: "hrs" },
          { name: "Locations", quantityType: "range", minQuantity: 2, maxQuantity: 4, quantityUnit: "locations" },
          { name: "Hero brand video with licensed music", quantityType: "exact", exactQuantity: 1, quantityUnit: "3–5 min video" },
          { name: "Aerial stills", quantityType: "exact", exactQuantity: 30, quantityUnit: "edited photos" },
          { name: "Vertical social media cuts (9:16)", quantityType: "exact", exactQuantity: 4, quantityUnit: "clips" },
        ]),
    ];
    await update(c, 3, {
      price: 47900,
      pricing_type: "tiered",
      pricing_tiers: JSON.stringify(promo_tiers),
      price_ranges: JSON.stringify([{ label: "3 campaign packages", minPrice: 47900, maxPrice: 119900 }]),
    });

    // ── 4. ROOF INSPECTIONS ── flat → tiered ─────────────────────────────────
    console.log("  4. Roof Inspections — converting to 3-tier");
    const roof_tiers: Tier[] = [
      tier("Residential", 18300, "fixed", false, 0,
        "Complete visual drone inspection for homes up to 3,500 sq ft. " +
        "Ideal for insurance claims, storm damage assessments, and annual condition checks.",
        [
          { name: "Hi-res inspection photos", quantityType: "range", minQuantity: 20, maxQuantity: 40, quantityUnit: "photos" },
          { name: "Annotated PDF inspection report", quantityType: "exact", exactQuantity: 1, quantityUnit: "report" },
          { name: "Delivery", quantityType: "exact", exactQuantity: 24, quantityUnit: "hr turnaround" },
        ]),
      tier("Commercial — Single Building", 31900, "fixed", false, 1,
        "Detailed drone inspection for commercial properties and large residential buildings up to 20,000 sq ft. " +
        "Includes a comprehensive annotated report with geo-tagged photo sets.",
        [
          { name: "Hi-res inspection photos", quantityType: "range", minQuantity: 50, maxQuantity: 80, quantityUnit: "photos" },
          { name: "Annotated PDF report with zone callouts", quantityType: "exact", exactQuantity: 1, quantityUnit: "report" },
          { name: "Geo-tagged photo set", quantityType: "exact", exactQuantity: 1, quantityUnit: "included" },
          { name: "Delivery", quantityType: "exact", exactQuantity: 48, quantityUnit: "hr turnaround" },
        ]),
      tier("Commercial — Multi-Building", 0, "quote", false, 2,
        "Custom inspection package for multi-building properties, HOAs, and property management portfolios. " +
        "Per-building annotated reports plus a consolidated summary. Pricing based on number and size of buildings.",
        [
          { name: "Per-building annotated inspection report", quantityType: "exact", exactQuantity: 1, quantityUnit: "per building" },
          { name: "Portfolio summary report", quantityType: "exact", exactQuantity: 1, quantityUnit: "included" },
          { name: "Prioritized findings list", quantityType: "exact", exactQuantity: 1, quantityUnit: "included" },
        ]),
    ];
    await update(c, 4, {
      price: 18300,
      pricing_type: "tiered",
      pricing_tiers: JSON.stringify(roof_tiers),
      price_ranges: JSON.stringify([{ label: "Residential or commercial", minPrice: 18300, maxPrice: 31900 }]),
    });

    // ── 5. PROPERTY & SITE EVALUATION ── flat rate update ───────────────────
    console.log("  5. Property & Site Evaluation — flat rate $299 → $263");
    await update(c, 5, { price: 26300, pricing_type: "flat", pricing_tiers: JSON.stringify([]) });

    // ── 6. INFRASTRUCTURE & STRUCTURE INSPECTIONS ── flat → tiered ──────────
    console.log("  6. Infrastructure & Structure Inspections — converting to 3-tier");
    const infra_tiers: Tier[] = [
      tier("Standard", 51900, "fixed", false, 0,
        "Visual drone inspection for bridges, towers, retaining walls, and similar structures. " +
        "Delivers a comprehensive photo record of all accessible surfaces with a basic findings report.",
        [
          { name: "Hi-res inspection photos", quantityType: "range", minQuantity: 40, maxQuantity: 60, quantityUnit: "photos" },
          { name: "Basic PDF report with flagged areas", quantityType: "exact", exactQuantity: 1, quantityUnit: "report" },
        ]),
      tier("Detailed", 95900, "fixed", false, 1,
        "Comprehensive annotated inspection for structures where detailed documentation is required — " +
        "insurance, permitting, or maintenance planning. Includes geo-tagged photos mapped to a structure diagram.",
        [
          { name: "Full annotated photo set with callouts", quantityType: "range", minQuantity: 60, maxQuantity: 100, quantityUnit: "photos" },
          { name: "Geo-tagged photos mapped to structure diagram", quantityType: "exact", exactQuantity: 1, quantityUnit: "diagram overlay" },
          { name: "Comprehensive PDF report", quantityType: "exact", exactQuantity: 1, quantityUnit: "report" },
        ]),
      tier("Complex / Multi-Structure", 143900, "fixed", false, 2,
        "Full-scope inspection for complex or multi-structure sites. Includes thermal imaging, " +
        "detailed per-structure reports, and a consolidated overview suitable for engineering review.",
        [
          { name: "Detailed report per structure", quantityType: "exact", exactQuantity: 1, quantityUnit: "per structure" },
          { name: "Consolidated overview report", quantityType: "exact", exactQuantity: 1, quantityUnit: "included" },
          { name: "Thermal imaging", quantityType: "exact", exactQuantity: 1, quantityUnit: "included" },
        ]),
    ];
    await update(c, 6, {
      price: 51900,
      pricing_type: "tiered",
      pricing_tiers: JSON.stringify(infra_tiers),
      price_ranges: JSON.stringify([{ label: "3 inspection scopes", minPrice: 51900, maxPrice: 143900 }]),
    });

    // ── 7. CONSTRUCTION PLANNING & MONITORING ── flat → subscription ─────────
    console.log("  7. Construction Planning & Monitoring — converting to subscription service");
    await update(c, 7, {
      price: 55900,                          // single-visit walk-in rate
      pricing_type: "flat",
      pricing_tiers: JSON.stringify([]),
      is_subscription: true,
      weekly_subscription_enabled: true,
      weekly_price: 51900,                   // $519/week — weekly contract
      weekly_price_type: "fixed",
      bi_weekly_subscription_enabled: false,
      bi_weekly_price: 0,
      monthly_subscription_enabled: true,
      monthly_price: 175900,                 // $1,759/month — 4 visits/month
      monthly_price_type: "fixed",
      billing_frequency: "weekly",
      frequency_details: "Weekly: 1 site visit per week ($519) | Monthly: 4 site visits per month ($1,759)",
      price_ranges: JSON.stringify([]),
    });

    // ── 8. AERIAL MAPPING ── flat → tiered by acreage ────────────────────────
    console.log("  8. Aerial Mapping — converting to 4-tier acreage-based pricing");
    const map_tiers: Tier[] = [
      tier("Starter", 31900, "fixed", false, 0,
        "Aerial mapping for small residential lots and parcels up to 5 acres. " +
        "Delivers a georeferenced orthomosaic suitable for basic site planning and boundary visualization.",
        [
          { name: "Georeferenced orthomosaic (GeoTIFF)", quantityType: "exact", exactQuantity: 1, quantityUnit: "included" },
          { name: "Flight report", quantityType: "exact", exactQuantity: 1, quantityUnit: "included" },
          { name: "Coverage", quantityType: "exact", exactQuantity: 5, quantityUnit: "acres max" },
        ]),
      tier("Standard", 55900, "fixed", false, 1,
        "Mid-range aerial mapping for agricultural parcels, development sites, and subdivision planning up to 25 acres. " +
        "Adds a Digital Surface Model for elevation analysis.",
        [
          { name: "Georeferenced orthomosaic (GeoTIFF)", quantityType: "exact", exactQuantity: 1, quantityUnit: "included" },
          { name: "Digital Surface Model — DSM (GeoTIFF)", quantityType: "exact", exactQuantity: 1, quantityUnit: "included" },
          { name: "Coverage", quantityType: "range", minQuantity: 6, maxQuantity: 25, quantityUnit: "acres" },
        ]),
      tier("Professional", 95900, "fixed", true, 2,
        "Professional-grade mapping for larger developments and civil engineering projects up to 50 acres. " +
        "Includes full elevation models and 1-ft contour lines for engineering-grade deliverables.",
        [
          { name: "Georeferenced orthomosaic (GeoTIFF)", quantityType: "exact", exactQuantity: 1, quantityUnit: "included" },
          { name: "Digital Surface Model — DSM (GeoTIFF)", quantityType: "exact", exactQuantity: 1, quantityUnit: "included" },
          { name: "Digital Terrain Model — DTM (GeoTIFF)", quantityType: "exact", exactQuantity: 1, quantityUnit: "included" },
          { name: "1-ft contour lines (SHP/DXF)", quantityType: "exact", exactQuantity: 1, quantityUnit: "included" },
          { name: "Coverage", quantityType: "range", minQuantity: 26, maxQuantity: 50, quantityUnit: "acres" },
        ]),
      tier("Large Scale", 151900, "fixed", false, 3,
        "Full-scale aerial mapping for large parcels and complex development sites from 51 to 100 acres. " +
        "All Professional deliverables plus a KMZ for Google Earth and a complete flight log.",
        [
          { name: "Georeferenced orthomosaic (GeoTIFF)", quantityType: "exact", exactQuantity: 1, quantityUnit: "included" },
          { name: "Digital Surface Model — DSM (GeoTIFF)", quantityType: "exact", exactQuantity: 1, quantityUnit: "included" },
          { name: "Digital Terrain Model — DTM (GeoTIFF)", quantityType: "exact", exactQuantity: 1, quantityUnit: "included" },
          { name: "1-ft contour lines (SHP/DXF)", quantityType: "exact", exactQuantity: 1, quantityUnit: "included" },
          { name: "KMZ for Google Earth", quantityType: "exact", exactQuantity: 1, quantityUnit: "included" },
          { name: "Full flight log", quantityType: "exact", exactQuantity: 1, quantityUnit: "included" },
          { name: "Coverage", quantityType: "range", minQuantity: 51, maxQuantity: 100, quantityUnit: "acres" },
        ]),
    ];
    await update(c, 8, {
      price: 31900,
      pricing_type: "tiered",
      pricing_tiers: JSON.stringify(map_tiers),
      price_ranges: JSON.stringify([{ label: "4 tiers by acreage — 100+ acres: custom quote", minPrice: 31900, maxPrice: 151900 }]),
    });

    // ── 9. 3D MODELING ── flat → tiered ──────────────────────────────────────
    console.log("  9. 3D Modeling — converting to 3-tier acreage/complexity pricing");
    const model_tiers: Tier[] = [
      tier("Small", 67900, "fixed", false, 0,
        "3D modeling for residential lots, individual structures, and small parcels up to 1 acre. " +
        "Delivers a photo-realistic textured mesh and point cloud suitable for architectural review and visualization.",
        [
          { name: "Textured 3D mesh (OBJ + GLB)", quantityType: "exact", exactQuantity: 1, quantityUnit: "included" },
          { name: "Point cloud (LAS)", quantityType: "exact", exactQuantity: 1, quantityUnit: "included" },
          { name: "Web-viewable 3D model link", quantityType: "exact", exactQuantity: 1, quantityUnit: "included" },
          { name: "Coverage", quantityType: "exact", exactQuantity: 1, quantityUnit: "acre max" },
        ]),
      tier("Medium", 119900, "fixed", true, 1,
        "High-density 3D modeling for commercial parcels and small development sites from 1 to 5 acres. " +
        "Includes a full-density point cloud and a measurements report suitable for engineering use.",
        [
          { name: "High-density textured 3D mesh (OBJ + GLB)", quantityType: "exact", exactQuantity: 1, quantityUnit: "included" },
          { name: "Full-density point cloud (LAS/LAZ)", quantityType: "exact", exactQuantity: 1, quantityUnit: "included" },
          { name: "Measurements & elevations report (PDF)", quantityType: "exact", exactQuantity: 1, quantityUnit: "included" },
          { name: "Coverage", quantityType: "range", minQuantity: 1, maxQuantity: 5, quantityUnit: "acres" },
        ]),
      tier("Large", 199900, "fixed", false, 2,
        "Engineering-grade 3D modeling for subdivisions, resorts, and large parcels from 5 to 15 acres. " +
        "Classified point cloud, contour overlay, and KMZ — suitable for formal engineering review.",
        [
          { name: "Engineering-grade textured mesh", quantityType: "exact", exactQuantity: 1, quantityUnit: "included" },
          { name: "Classified point cloud (LAS/LAZ)", quantityType: "exact", exactQuantity: 1, quantityUnit: "included" },
          { name: "Measurements & elevations report (PDF)", quantityType: "exact", exactQuantity: 1, quantityUnit: "included" },
          { name: "Contour overlay", quantityType: "exact", exactQuantity: 1, quantityUnit: "included" },
          { name: "KMZ for Google Earth visualization", quantityType: "exact", exactQuantity: 1, quantityUnit: "included" },
          { name: "Coverage", quantityType: "range", minQuantity: 5, maxQuantity: 15, quantityUnit: "acres" },
        ]),
    ];
    await update(c, 9, {
      price: 67900,
      pricing_type: "tiered",
      pricing_tiers: JSON.stringify(model_tiers),
      price_ranges: JSON.stringify([{ label: "3 tiers by area — 15+ acres: custom quote", minPrice: 67900, maxPrice: 199900 }]),
    });

    // ── 10. TIMELAPSE CREATION ── flat rate update ────────────────────────────
    console.log("  10. Timelapse Creation — flat rate $549 → $519");
    await update(c, 10, { price: 51900, pricing_type: "flat", pricing_tiers: JSON.stringify([]) });

    // ── SUMMARY ──────────────────────────────────────────────────────────────
    console.log(`
✅  All services updated!

    Service                         Old Price   New Price / Structure
    ─────────────────────────────────────────────────────────────────
    Real Estate Listings            $119–$229   $119 / $159 / $215 / $319 (4 tiers + Luxury)
    Property Tours                  $349        $359 (flat)
    Promotional Content             $399        $479 / $799 / $1,199 (3 tiers)
    Roof Inspections                $179        $183 / $319 / custom (3 tiers)
    Property & Site Evaluation      $299        $263 (flat)
    Infrastructure Inspections      $349        $519 / $959 / $1,439 (3 tiers)
    Construction Monitoring         $549        $559/visit | $519/wk | $1,759/mo (subscription)
    Aerial Mapping                  $250        $319 / $559 / $959 / $1,519 (4 tiers by acreage)
    3D Modeling                     $599        $679 / $1,199 / $1,999 (3 tiers by area)
    Timelapse Creation              $549        $519 (flat)
`);

  } finally {
    c.release();
    await pool.end();
  }
}

run().catch((err) => {
  console.error("Update failed:", err);
  process.exit(1);
});
