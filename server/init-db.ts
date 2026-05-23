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

// The 10 canonical service names that constitute a complete catalog.
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
  "Infrastructure & Structure Inspections",
  "Construction Planning & Monitoring",
  "Aerial Mapping",
  "3D Modeling",
  "Timelapse Creation",
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
    } else {
      console.log('One or more canonical services missing — seeding catalog...');
      await db.execute(sql`DELETE FROM service_addons`);
      await db.execute(sql`DELETE FROM addons`);
      await db.execute(sql`DELETE FROM services`);

      // ── Add-ons ─────────────────────────────────────────────────────────────
      // Shared add-ons (indices 0-3) are linked to multiple services.
      const canonicalAddons = [
        // 0-3: shared
        { name: "Twilight / Golden Hour",       price: 4900,  description: "Golden hour or twilight shoot for dramatic lighting",              tooltipDescription: "Adds a separate golden-hour or twilight flight" },
        { name: "Same-day delivery",            price: 3500,  description: "Expedited same-day delivery of edited files",                      tooltipDescription: "Receive your edited files the same day as your shoot" },
        { name: "Social Media Content",         price: 7900,  description: "Vertical / square crops and reels optimized for social platforms", tooltipDescription: "Vertical and square formats ready to post" },
        { name: "Thermal imaging",              price: 9900,  description: "Add thermal / infrared imaging to your inspection",                tooltipDescription: "Detects heat anomalies invisible to a standard camera" },
        // 4-6: Real Estate Listings
        { name: "Extra 5 photos",              price: 3000,  description: "Add 5 additional edited photos to your package",                  tooltipDescription: "+5 professionally edited aerial photos" },
        { name: "Extend video",                price: 4000,  description: "Extend your video to a longer duration",                          tooltipDescription: "Longer finished video cut" },
        { name: "Lot-line overlays",           price: 2500,  description: "Add property lot-line overlays to aerial images",                 tooltipDescription: "Highlight exact parcel boundaries on your photos" },
        // 7-10: Property Tours
        { name: "Same-day (tours)",            price: 3000,  description: "Same-day delivery of edited tour footage",                        tooltipDescription: "Tour delivered the same day as the shoot" },
        { name: "Voice-over",                  price: 7500,  description: "Professional voice-over narration added to your video",           tooltipDescription: "Script-based narration recorded by a professional" },
        { name: "Extended tour",               price: 6000,  description: "Longer cinematic tour with additional scenes",                    tooltipDescription: "More footage, more scenes, longer runtime" },
        { name: "360° virtual tour integration", price: 9900, description: "Full 360° virtual tour integrated with your video",             tooltipDescription: "Embed an interactive 360° tour alongside your video" },
        // 11-13: Promotional Content
        { name: "Extra promotional video",     price: 7500,  description: "Additional promotional video cut for your campaign",              tooltipDescription: "Extra edited video clip for marketing" },
        { name: "Custom voice-over",           price: 6000,  description: "Custom branded voice-over for promotional content",               tooltipDescription: "Tailored narration written and recorded for your brand" },
        { name: "Extended event coverage",     price: 15000, description: "Extended aerial coverage for larger events or venues",            tooltipDescription: "Additional flight time covering more of your event" },
        // 14-16: Roof Inspections
        { name: "Same-day report",             price: 3000,  description: "Receive your inspection report same day",                         tooltipDescription: "Report delivered within hours of inspection" },
        { name: "Detailed written summary",    price: 4000,  description: "Expanded written narrative accompanying annotated photos",        tooltipDescription: "More detailed written breakdown of findings" },
        { name: "Follow-up re-inspection",     price: 9900,  description: "Follow-up drone inspection after repairs are completed",          tooltipDescription: "Verify repairs were made correctly" },
        // 17-18: Property & Site Evaluation
        { name: "Advanced annotated report",   price: 5000,  description: "Expanded annotated image report with detailed notes",             tooltipDescription: "More thorough annotation and written commentary" },
        { name: "Follow-up site visit",        price: 9900,  description: "Return site visit for updated evaluation",                        tooltipDescription: "Re-inspect after changes or construction" },
        // 19-21: Infrastructure & Structure Inspections
        { name: "Same-day preliminary report", price: 4000,  description: "Preliminary findings report delivered same day",                  tooltipDescription: "Quick summary of findings on inspection day" },
        { name: "Advanced structural analysis", price: 7500, description: "In-depth analysis with engineering-level commentary",             tooltipDescription: "Detailed structural integrity findings" },
        { name: "Repeat inspection package",   price: -25000, description: "Package of 3 inspection visits at a discounted rate",            tooltipDescription: "Bundle 3 inspections for significant savings" },
        // 22-25: Construction Planning & Monitoring
        { name: "Additional monitoring flight", price: 19900, description: "One extra scheduled monitoring flight",                          tooltipDescription: "Add another flight to your monitoring schedule" },
        { name: "Advanced volumetric analysis", price: 7500,  description: "Detailed earthwork and volume calculation report",               tooltipDescription: "Precise stockpile and cut/fill calculations" },
        { name: "Same-day data delivery",      price: 5000,   description: "Processed data delivered the same day",                          tooltipDescription: "Faster turnaround on point clouds and reports" },
        { name: "Custom CAD/GIS exports",      price: 6000,   description: "Deliverables formatted for your CAD or GIS platform",             tooltipDescription: "Files ready to import into your preferred software" },
        // 26-29: 3D Modeling
        { name: "Additional model refinement", price: 7500,   description: "Extra refinement pass on your 3D model",                         tooltipDescription: "Cleaner geometry and higher fidelity output" },
        { name: "3D walkthrough video upgrade", price: 5000,  description: "Upgraded cinematic walkthrough video of your model",              tooltipDescription: "Polished animated walkthrough instead of basic export" },
        { name: "CAD integration",             price: 9900,   description: "Deliverables formatted for CAD software integration",             tooltipDescription: "Import-ready files for AutoCAD, Revit, etc." },
        { name: "Rush processing",             price: 6000,   description: "Expedited processing and delivery of your 3D model",              tooltipDescription: "Move to the front of the processing queue" },
        // 30-37: Aerial Mapping
        { name: "Topographic Contour Map",     price: 9900,   description: "Contour map overlaid on your orthomosaic for terrain analysis",   tooltipDescription: "Precise elevation contour lines derived from flight data" },
        { name: "Digital Elevation Model (DEM)", price: 9900, description: "Digital elevation model showing surface height data",              tooltipDescription: "Grid-based surface elevation for GIS analysis" },
        { name: "Digital Terrain Model (DTM)", price: 11900,  description: "Bare-earth terrain model with vegetation and structures removed",  tooltipDescription: "Ground-level elevation model for engineering use" },
        { name: "Basic Volumetric / Stockpile Report", price: 12900, description: "Cut/fill and stockpile volume calculations from your map",   tooltipDescription: "Accurate volume measurements for earthwork and inventory" },
        { name: "Contour Lines + Elevation Data Package", price: 14900, description: "Full contour line overlay plus raw elevation data export", tooltipDescription: "Contours and elevation data bundled together" },
        { name: "Advanced Mapping Package (Ortho + DEM + Contours)", price: 19900, description: "Complete mapping package: ortho, DEM, and contours in one", tooltipDescription: "Everything you need for comprehensive site analysis" },
        { name: "Custom CAD/GIS Export & Layering", price: 7500, description: "Deliverables formatted and layered for your CAD or GIS platform", tooltipDescription: "Import-ready files in GeoTIFF, KML, DXF, and more" },
        { name: "Same-day Delivery",           price: 4000,   description: "Receive your processed aerial map the same day as capture",        tooltipDescription: "Rush processing and delivery on capture day" },
        // 38-41: Timelapse Creation
        { name: "Extended capture period",     price: 15000,  description: "Add one additional week of capture to your timelapse project",    tooltipDescription: "An extra week of scheduled flights" },
        { name: "4K cinematic upgrade",        price: 7500,   description: "Upgrade your timelapse to 4K cinematic quality",                 tooltipDescription: "Full 4K resolution with cinematic color grade" },
        { name: "Same-day preview clips",      price: 4000,   description: "Receive rough preview clips the same day as capture",             tooltipDescription: "Quick look at your footage before final delivery" },
        { name: "Multiple angle timelapse",    price: 9900,   description: "Timelapse captured from two or more distinct angles",             tooltipDescription: "Adds a second camera position for variety" },
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
        // Real Estate & Marketing
        {
          name: "Real Estate Listings",
          description: "Professional drone photography and video that makes properties stand out on MLS, websites, and social media. Choose from four value-packed packages.",
          price: 11900,
          pricingType: "range_based",
          priceRanges: [{ minPrice: 11900, maxPrice: 32900, label: "4 value-packed packages" }],
          category: "Real Estate & Marketing",
          folderStructure: ["01_Raw_Photos", "02_Edited_Photos", "03_Final_Delivery", "04_Client_Gallery"],
          imageUrl: "/uploads/svc-real-estate-listings.png",
          features: ["High-resolution aerial photos and cinematic video with DJI Air 3S", "Professional color correction, straightening, and enhancement", "Fast 48-hour digital delivery via secure gallery", "Watermark-free files optimized for MLS and web use", "FAA Part 107 compliant with full insurance", "Local travel included in 84780 / St. George area", "Subtle logo option available", "Expert pilot with real estate marketing experience"],
          addonIndices: [0, 1, 2, 4, 5, 6],
        },
        {
          name: "Property Tours",
          description: "Immersive cinematic drone tours that give buyers a complete understanding of the property layout, surroundings, and key features.",
          price: 34900,
          pricingType: "flat",
          priceRanges: [],
          category: "Real Estate & Marketing",
          folderStructure: ["01_Raw_Footage", "02_Edited_Tour", "03_Final_Video", "04_Photos"],
          imageUrl: "/uploads/svc-property-tours.png",
          features: ["Full cinematic video tour with smooth transitions and music", "High-resolution aerial photos included", "Optional 360° virtual tour integration", "Professional editing with text overlays and pacing", "Optimized for websites, MLS, and virtual showings", "Fast 48-hour delivery", "Local St. George area travel included", "Expert shot planning based on your listing needs"],
          addonIndices: [0, 2, 7, 8, 9, 10],
        },
        {
          name: "Promotional Content",
          description: "Custom aerial imagery and video for businesses, events, grand openings, resorts, and marketing campaigns.",
          price: 39900,
          pricingType: "flat",
          priceRanges: [],
          category: "Real Estate & Marketing",
          folderStructure: ["01_Raw_Photos", "02_Raw_Footage", "03_Edited_Content", "04_Social_Formats", "05_Final_Delivery"],
          imageUrl: "/uploads/svc-promotional-content.png",
          features: ["Dynamic before-and-after shots and scenic overviews", "Professional cinematic video with music and transitions", "High-resolution stills for print and digital use", "Trending vertical formats for social platforms", "Creative concept development with client input", "Fast turnaround and multiple file formats", "Local travel in 84780 area included", "Brand-elevating visuals that capture attention"],
          addonIndices: [0, 1, 2, 11, 12, 13],
        },
        // Property Inspections
        {
          name: "Roof Inspections",
          description: "Safe, detailed drone roof inspections for residential and commercial properties without ladders or risk.",
          price: 17900,
          pricingType: "flat",
          priceRanges: [],
          category: "Property Inspections",
          folderStructure: ["01_Raw_Inspection_Photos", "02_Annotated_Images", "03_Inspection_Report"],
          imageUrl: "/uploads/svc-roof-inspections.png",
          features: ["Close-up high-resolution imagery of all roof surfaces", "Damage assessment (hail, storm, wear)", "Annotated photos highlighting issues", "Professional PDF inspection report", "Fast 24–48 hour delivery", "FAA compliant and fully insured", "Local St. George service", "Ideal for homeowners, property managers, and adjusters"],
          addonIndices: [3, 14, 15, 16],
        },
        {
          name: "Property & Site Evaluation",
          description: "Comprehensive aerial inspection and analysis for pre-purchase due diligence, condition assessment, development planning, and insurance documentation.",
          price: 29900,
          pricingType: "flat",
          priceRanges: [],
          category: "Property Inspections",
          folderStructure: ["01_Raw_Photos", "02_Raw_Footage", "03_Annotated_Report", "04_Final_Delivery"],
          imageUrl: "/uploads/svc-property-site-evaluation.png",
          features: ["High-resolution aerial photos and video of entire property", "Detailed visual condition assessment", "Annotated images and professional summary report", "Insurance-ready documentation for claims", "Layout, surroundings, and neighborhood context", "Fast 48-hour delivery", "Local 84780 area travel included", "Perfect for investors, buyers, sellers, and adjusters"],
          addonIndices: [0, 1, 3, 17, 18],
        },
        {
          name: "Infrastructure & Structure Inspections",
          description: "Professional drone inspections of cell towers, antennas, utility structures, bridges, and other hard-to-reach infrastructure.",
          price: 34900,
          pricingType: "flat",
          priceRanges: [],
          category: "Property Inspections",
          folderStructure: ["01_Raw_Inspection_Photos", "02_Annotated_Images", "03_Compliance_Report", "04_Final_Delivery"],
          imageUrl: "/uploads/svc-infrastructure-inspections.png",
          features: ["Safe, high-resolution close-up imagery", "Detailed visual integrity assessment", "Annotated photos and compliance documentation", "Professional PDF report", "No need for expensive climbing crews", "Fast turnaround", "Fully insured and FAA compliant", "Local service in southern Utah"],
          addonIndices: [3, 19, 20, 21],
        },
        // Mapping & Modeling
        {
          name: "Construction Planning & Monitoring",
          description: "High-accuracy drone surveying for point clouds, topographic maps, volume calculations, and ongoing construction progress monitoring.",
          price: 54900,
          pricingType: "flat",
          priceRanges: [],
          category: "Mapping & Modeling",
          folderStructure: ["01_Raw_Images", "02_Point_Cloud", "03_Topographic_Maps", "04_Progress_Reports", "05_GIS_Export"],
          imageUrl: "/uploads/svc-construction-planning.png",
          features: ["Dense point cloud generation", "Topographic maps and contour lines", "Accurate stockpile / earthwork volume calculations", "Regular progress monitoring flights", "Before/after comparison overlays", "GIS-ready deliverables (LAS, DEM, etc.)", "Professional reports with visuals", "Local 84780 area service"],
          addonIndices: [22, 23, 24, 25],
        },
        {
          name: "Aerial Mapping",
          description: "High-accuracy orthomosaic maps and advanced 2D data products for site planning, land surveying, and precision analysis. Every package includes a geo-referenced orthomosaic map with optional elevation, contour, and volumetric add-ons.",
          price: 25000,
          pricingType: "flat",
          priceRanges: [],
          category: "Mapping & Modeling",
          folderStructure: ["01_Flight_&_Data_Capture", "02_Processing/Orthomosaic", "02_Processing/Elevation_Data", "02_Processing/Contour_Maps", "02_Processing/Volumetric_Reports", "03_Deliverables/GIS_Files", "03_Deliverables/CAD_Exports", "03_Deliverables/Client_Formats", "Raw_Data", "Edited_Assets"],
          imageUrl: "/uploads/svc-aerial-mapping.png",
          features: ["Orthomosaic map included in every package", "Geo-referenced for accurate real-world measurements", "Topographic contour maps and elevation data available", "Digital Elevation Model (DEM) and Digital Terrain Model (DTM) outputs", "Volumetric and stockpile calculations", "GIS-ready and CAD-compatible export formats", "Measurable dimensions and scale for planning", "Professional delivery in 48 hours"],
          addonIndices: [30, 31, 32, 33, 34, 35, 36, 37],
        },
        {
          name: "3D Modeling",
          description: "Professional as-built 3D models and point clouds created from drone photogrammetry for documentation, verification, and project visualization.",
          price: 59900,
          pricingType: "flat",
          priceRanges: [],
          category: "Mapping & Modeling",
          folderStructure: ["01_Raw_Images", "02_Point_Cloud", "03_Mesh_Model", "04_Textured_Model", "05_Walkthrough_Video", "06_Final_Export"],
          imageUrl: "/uploads/svc-3d-modeling.png",
          features: ["Dense photogrammetry data capture", "Accurate 3D model creation", "Point cloud generation and cleanup", "Multiple export formats (OBJ, FBX, etc.)", "Walkthrough video included", "Ideal for BIM, engineering, and as-built records", "High precision with DJI Air 3S", "Fast professional delivery"],
          addonIndices: [26, 27, 28, 29],
        },
        {
          name: "Timelapse Creation",
          description: "Dynamic construction progress timelapse videos documenting changes over days, weeks, or months.",
          price: 54900,
          pricingType: "flat",
          priceRanges: [],
          category: "Mapping & Modeling",
          folderStructure: ["01_Raw_Frames", "02_Processed_Timelapse", "03_Final_Video", "04_Archive"],
          imageUrl: "/uploads/svc-timelapse-creation.png",
          features: ["Professional camera positioning and interval setup", "Multi-day or multi-week capture", "Stabilized, color-graded final video", "Speed ramping and cinematic editing", "Music and text overlays available", "Raw frames available upon request", "Ideal for project marketing and records", "Local southern Utah service"],
          addonIndices: [38, 39, 40, 41],
        },
      ];

      const insertedServiceIds: Array<{ name: string; id: number }> = [];
      for (const svc of defaultServices) {
        const { addonIndices, ...svcData } = svc;
        const rows = await db.insert(services).values(svcData).returning({ id: services.id, name: services.name });
        insertedServiceIds.push(rows[0]);
      }
      console.log('Canonical services inserted.');

      // ── Service-addon links ───────────────────────────────────────────────────
      let linkCount = 0;
      for (const svc of defaultServices) {
        const svcRow = insertedServiceIds.find(r => r.name === svc.name);
        if (!svcRow) continue;
        for (const idx of svc.addonIndices) {
          const addonId = insertedAddonIds[idx];
          if (!addonId) continue;
          await db.execute(
            sql`INSERT INTO service_addons (service_id, addon_id, is_enabled)
                VALUES (${svcRow.id}, ${addonId}, true)
                ON CONFLICT (service_id, addon_id) DO NOTHING`
          );
          linkCount++;
        }
      }
      console.log(`Seeded ${linkCount} service-addon links.`);

      // ── Display order for Mapping & Modeling category ─────────────────────────
      const mappingOrder: Record<string, number> = {
        "Construction Planning & Monitoring": 70,
        "Aerial Mapping": 80,
        "3D Modeling": 90,
        "Timelapse Creation": 100,
      };
      for (const { name, id } of insertedServiceIds) {
        if (mappingOrder[name] !== undefined) {
          await db.update(services).set({ displayOrder: mappingOrder[name] }).where(eq(services.id, id));
        }
      }

      // ── Aerial Mapping bundle configurations ──────────────────────────────────
      const aerialMappingRow = insertedServiceIds.find(s => s.name === "Aerial Mapping");
      if (aerialMappingRow) {
        // Real Estate Listings is range_based ($119–$329); the $20 savings applies to
        // Aerial Mapping itself via the name-based fallback in the UI, not customPrice.
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
        const bundleConfigurations = insertedServiceIds
          .filter(s => s.name !== "Aerial Mapping" && bundleSavingsCustomPrice[s.name] !== undefined)
          .map(s => ({ serviceId: s.id, customPrice: bundleSavingsCustomPrice[s.name] }));
        await db.update(services)
          .set({ bundleConfigurations })
          .where(eq(services.id, aerialMappingRow.id));
        console.log(`Set ${bundleConfigurations.length} bundle configurations on Aerial Mapping.`);
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
    
    console.log('Database initialization complete.');
  } catch (error) {
    console.error('Error initializing database:', error);
  }
}