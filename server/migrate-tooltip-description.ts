import { db } from "./db";

/**
 * This script adds the tooltipDescription column to the services table
 */
async function main() {
  try {
    console.log("Adding tooltipDescription column to services table...");

    // Add the tooltipDescription column
    await db.execute(`
      ALTER TABLE services 
      ADD COLUMN IF NOT EXISTS tooltip_description TEXT;
    `);

    console.log("✓ Successfully added tooltipDescription column");
    
    // Update existing records to use description as fallback
    await db.execute(`
      UPDATE services 
      SET tooltip_description = description 
      WHERE tooltip_description IS NULL;
    `);

    console.log("✓ Updated existing services with tooltip descriptions");
    
  } catch (error) {
    console.error("Error migrating tooltip description:", error);
    throw error;
  }
}

main()
  .then(() => {
    console.log("Migration completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Migration failed:", error);
    process.exit(1);
  });

export { main };