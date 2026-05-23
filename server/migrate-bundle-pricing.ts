import { db } from "./db";

/**
 * This script adds bundle pricing fields to the services table
 */
async function main() {
  try {
    console.log("Starting bundle pricing migration...");

    // Add bundle discount percentage field
    try {
      await db.execute(`
        ALTER TABLE services 
        ADD COLUMN IF NOT EXISTS bundle_discount_percentage INTEGER DEFAULT 0
      `);
      console.log("Bundle discount percentage field added successfully");
    } catch (error) {
      console.log("Bundle discount percentage field already exists or error:", error);
    }

    // Add available add-ons field
    try {
      await db.execute(`
        ALTER TABLE services 
        ADD COLUMN IF NOT EXISTS available_add_ons JSON DEFAULT '[]'::json
      `);
      console.log("Available add-ons field added successfully");
    } catch (error) {
      console.log("Available add-ons field already exists or error:", error);
    }

    console.log("Bundle pricing migration completed successfully");
  } catch (error) {
    console.error("Bundle pricing migration failed:", error);
    throw error;
  }
}

// Run migration if this file is executed directly
main()
  .then(() => {
    console.log("Bundle pricing migration completed successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Bundle pricing migration failed:", error);
    process.exit(1);
  });

export default main;