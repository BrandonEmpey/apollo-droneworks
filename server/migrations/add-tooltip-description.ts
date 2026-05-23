import { db } from "../db";
import { sql } from "drizzle-orm";

/**
 * This migration adds the tooltip_description column to the service_addons table
 * for storing short descriptions about addons
 */
async function main() {
  console.log("Starting tooltip_description field migration...");

  try {
    // Check if tooltipDescription column exists in service_addons
    const checkQuery = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'service_addons' AND column_name = 'tooltip_description'
    `);

    if (checkQuery.rowCount === 0) {
      console.log("Adding tooltip_description field to service_addons table...");
      
      // Add tooltipDescription column
      await db.execute(sql`
        ALTER TABLE service_addons
        ADD COLUMN tooltip_description TEXT
      `);
      
      console.log("Service add-on tooltip_description field added successfully");
    } else {
      console.log("Service add-on tooltip_description field already exists, skipping migration");
    }

    console.log("Tooltip description field migration completed successfully");
  } catch (error) {
    console.error("Error in tooltip description field migration:", error);
    throw error;
  }
}

// Run the migration immediately
main()
  .then(() => {
    console.log("Tooltip description field migration completed successfully");
    process.exit(0);
  })
  .catch((err) => {
    console.error("Error in tooltip description field migration:", err);
    process.exit(1);
  });