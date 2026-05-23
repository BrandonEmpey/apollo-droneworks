import { db } from "../db";
import { sql } from "drizzle-orm";
import { heroSlides } from "@shared/schema";

const MIGRATION_KEY = "seed-hero-slides-defaults";

const DEFAULT_SLIDES = [
  {
    type: "image" as const,
    title: "Southern Utah Red Rock Canyon at Golden Hour",
    url: "/uploads/hero/hero_red_rock_canyon.png",
    displayOrder: 1,
    isActive: true,
  },
  {
    type: "image" as const,
    title: "Luxury Desert Estate from Above",
    url: "/uploads/hero/hero_luxury_estate.png",
    displayOrder: 2,
    isActive: true,
  },
  {
    type: "image" as const,
    title: "Active Commercial Construction Site",
    url: "/uploads/hero/hero_construction_site.png",
    displayOrder: 3,
    isActive: true,
  },
];

/**
 * Seed the three default Southern Utah hero slides on first run.
 *
 * Truly one-shot: records itself in `schema_migrations` so admins who
 * intentionally delete all slides via the admin UI won't see them
 * silently re-appear on the next restart.
 */
export async function seedHeroSlides() {
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        key TEXT PRIMARY KEY,
        applied_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `);

    const already = await db.execute(sql`
      SELECT key FROM schema_migrations WHERE key = ${MIGRATION_KEY}
    `);

    if ((already.rowCount ?? 0) > 0) {
      return;
    }

    const existing = await db.select({ id: heroSlides.id }).from(heroSlides).limit(1);
    if (existing.length === 0) {
      console.log("Seeding default Southern Utah hero slides...");
      await db.insert(heroSlides).values(DEFAULT_SLIDES);
      console.log(`Seeded ${DEFAULT_SLIDES.length} default hero slides`);
    }

    await db.execute(sql`
      INSERT INTO schema_migrations (key) VALUES (${MIGRATION_KEY})
    `);
  } catch (error) {
    console.error("Error seeding default hero slides:", error);
    throw error;
  }
}
