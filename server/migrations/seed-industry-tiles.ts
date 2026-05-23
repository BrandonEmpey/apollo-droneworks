import { db } from "../db";
import { sql } from "drizzle-orm";
import { industryTiles } from "@shared/schema";

const MIGRATION_KEY = "seed-industry-tiles-defaults";

const DEFAULT_TILES = [
  {
    slug: "aerial-imagery",
    title: "Real Estate & Marketing",
    tagline: null,
    subtitle:
      "Professional, drone-captured photos and videos that showcase properties, landscapes, and projects in ways ground-level shots never can. Perfect for marketing, promotion, and creating lasting impressions.",
    category: "Real Estate & Marketing",
    imageUrl: "/uploads/industry/aerial-imagery.png",
    targetPath: "/category/aerial-imagery",
    examples: [
      "Real Estate",
      "Property Tours",
      "Marketing Videos",
      "Promotional Content",
      "Social Media Content",
    ],
    displayOrder: 1,
    isActive: true,
  },
  {
    slug: "inspections",
    title: "Property Inspections",
    tagline: null,
    subtitle:
      "High-resolution, AI assisted aerial inspections that deliver clear, accurate data on roofs, structures, and assets. Eliminating ladders and scaffolding while speeding up assessments for insurance, maintenance, record keeping and reporting.",
    category: "Property Inspections",
    imageUrl: "/uploads/industry/inspections.png",
    targetPath: "/category/inspections",
    examples: [
      "Roof Inspections",
      "Tower Inspections",
      "Property Assessment",
      "Insurance Assessment",
      "As-Built 3D Modeling",
    ],
    displayOrder: 2,
    isActive: true,
  },
  {
    slug: "construction-mapping",
    title: "Mapping & Modeling",
    tagline: null,
    subtitle:
      "Advanced drone mapping and measurement services providing orthomosaics, 3D models, volumetrics, and progress documentation. Giving contractors, builders, and managers the accurate insights needed to plan, track, and complete projects efficiently and keeping investors updated.",
    category: "Mapping & Modeling",
    imageUrl: "/uploads/industry/construction-mapping.png",
    targetPath: "/category/construction-mapping",
    examples: [
      "Land Surveys",
      "Topographic Maps",
      "3D Mapping",
      "Construction Progress",
      "Volume Calculations",
      "Site Analysis",
      "Point Clouds",
      "Orthomosaic",
    ],
    displayOrder: 3,
    isActive: true,
  },
];

export const CANONICAL_TILE_SLUGS = DEFAULT_TILES.map((t) => t.slug);

/**
 * Seed the three canonical homepage industry tiles.
 *
 * Each tile is inserted only when its slug is absent from the database, so
 * this function is safe to call on every startup — it is a no-op once all
 * three slugs are present.  This means it will also re-create any tile that
 * was accidentally deleted even after the schema_migrations key has been
 * recorded, unlike a one-shot migration that checks the key and returns early.
 *
 * The schema_migrations key is still recorded so historical environments that
 * were set up before this seed existed don't receive spurious log output on
 * every restart.
 */
export async function seedIndustryTiles(): Promise<void> {
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        key TEXT PRIMARY KEY,
        applied_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `);

    for (const tile of DEFAULT_TILES) {
      const existing = await db
        .select({ id: industryTiles.id })
        .from(industryTiles)
        .where(sql`slug = ${tile.slug}`)
        .limit(1);

      if (existing.length === 0) {
        await db.insert(industryTiles).values({
          slug: tile.slug,
          title: tile.title,
          tagline: tile.tagline,
          subtitle: tile.subtitle,
          category: tile.category,
          imageUrl: tile.imageUrl,
          targetPath: tile.targetPath,
          examples: tile.examples,
          displayOrder: tile.displayOrder,
          isActive: tile.isActive,
        });
        console.log(`Seeded industry tile: ${tile.slug}`);
      }
    }

    await db.execute(sql`
      INSERT INTO schema_migrations (key) VALUES (${MIGRATION_KEY})
      ON CONFLICT (key) DO NOTHING
    `);
  } catch (error) {
    console.error("Error seeding default industry tiles:", error);
    throw error;
  }
}
