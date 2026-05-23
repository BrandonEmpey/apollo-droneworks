/**
 * Migration to add enhanced pricing features:
 * 1. Add unitType field to services table for per-unit pricing (acre, square_foot, unit)
 * 2. Create service_bundle_discounts table for individual bundle percentages
 */

import { db } from "./db";
import { sql } from "drizzle-orm";

async function main() {
  console.log("Starting enhanced pricing migration...");

  try {
    // Add unitType column to services table
    await db.execute(sql`
      ALTER TABLE services 
      ADD COLUMN IF NOT EXISTS unit_type TEXT DEFAULT 'unit'
    `);
    console.log("Added unit_type column to services table");

    // Create service_bundle_discounts table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS service_bundle_discounts (
        id SERIAL PRIMARY KEY,
        primary_service_id INTEGER NOT NULL REFERENCES services(id) ON DELETE CASCADE,
        secondary_service_id INTEGER NOT NULL REFERENCES services(id) ON DELETE CASCADE,
        discount_percentage INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
        UNIQUE(primary_service_id, secondary_service_id)
      )
    `);
    console.log("Created service_bundle_discounts table");

    console.log("Enhanced pricing migration completed successfully!");
  } catch (error) {
    console.error("Enhanced pricing migration failed:", error);
    throw error;
  }
}

if (import.meta.main) {
  main().catch(console.error);
}

export { main };