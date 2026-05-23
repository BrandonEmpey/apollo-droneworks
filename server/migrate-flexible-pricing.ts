import { db } from "./db";
import { sql } from "drizzle-orm";

async function addFlexiblePricingFields() {
  console.log("Adding flexible pricing fields to services table...");
  
  try {
    // Add new pricing fields to services table
    await db.execute(sql`
      ALTER TABLE services 
      ADD COLUMN IF NOT EXISTS pricing_type text DEFAULT 'flat',
      ADD COLUMN IF NOT EXISTS base_price_quantity integer DEFAULT 1,
      ADD COLUMN IF NOT EXISTS additional_price_per_unit integer DEFAULT 0,
      ADD COLUMN IF NOT EXISTS pricing_description text
    `);
    
    console.log("Flexible pricing fields added successfully!");
  } catch (error) {
    console.error("Error adding flexible pricing fields:", error);
    throw error;
  }
}

// Run the migration
addFlexiblePricingFields()
  .then(() => {
    console.log("Flexible pricing migration completed successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Migration failed:", error);
    process.exit(1);
  });