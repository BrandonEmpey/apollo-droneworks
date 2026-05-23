import { sql } from "drizzle-orm";
import { db } from "../db";

export async function addHeroSlides() {
  console.log("Starting hero slides migration...");

  try {
    const tableExists = await db.execute(sql`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'hero_slides'
      );
    `);

    if (!tableExists.rows[0].exists) {
      console.log("Creating hero_slides table...");
      await db.execute(sql`
        CREATE TABLE hero_slides (
          id SERIAL PRIMARY KEY,
          type TEXT NOT NULL DEFAULT 'image',
          title TEXT NOT NULL,
          url TEXT NOT NULL,
          display_order INTEGER NOT NULL DEFAULT 100,
          is_active BOOLEAN NOT NULL DEFAULT true,
          created_at TIMESTAMP NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMP NOT NULL DEFAULT NOW()
        );
      `);
      console.log("hero_slides table created successfully");
    } else {
      console.log("hero_slides table already exists, skipping");
    }

    console.log("Hero slides migration completed successfully");
  } catch (error) {
    console.error("Error in hero slides migration:", error);
    throw error;
  }
}
