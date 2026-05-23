import { db } from "../db";
import { sql } from "drizzle-orm";

/**
 * This migration adds percentage-based pricing fields to the addons table
 */
async function main() {
  console.log("Starting addon percentage pricing migration...");

  try {
    // Check if pricingType column exists in addons table
    const checkQuery = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'addons' AND column_name = 'pricing_type'
    `);

    if (checkQuery.rowCount === 0) {
      console.log("Adding percentage pricing fields to addons table...");
      
      // Add pricingType column
      await db.execute(sql`
        ALTER TABLE addons
        ADD COLUMN pricing_type TEXT NOT NULL DEFAULT 'fixed'
      `);
      
      // Add percentage column
      await db.execute(sql`
        ALTER TABLE addons
        ADD COLUMN percentage INTEGER DEFAULT 0
      `);
      
      console.log("Addon percentage pricing fields added successfully");
    } else {
      console.log("Addon percentage pricing fields already exist, skipping migration");
    }

    console.log("Addon percentage pricing migration completed successfully");
  } catch (error) {
    console.error("Error in addon percentage pricing migration:", error);
    throw error;
  }
}

// Run the migration immediately
main()
  .then(() => {
    console.log("Addon percentage pricing migration completed successfully");
    process.exit(0);
  })
  .catch((err) => {
    console.error("Error in addon percentage pricing migration:", err);
    process.exit(1);
  });