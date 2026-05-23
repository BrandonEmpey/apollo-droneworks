import { db } from "./db";

/**
 * This script adds subscription pricing columns to the services table
 */
async function main() {
  try {
    console.log("Adding subscription pricing columns to services table...");
    
    // Add new subscription pricing columns
    await db.execute(`
      ALTER TABLE services 
      ADD COLUMN IF NOT EXISTS weekly_subscription_enabled BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS weekly_price_type TEXT DEFAULT 'fixed',
      ADD COLUMN IF NOT EXISTS weekly_percentage INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS bi_weekly_subscription_enabled BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS bi_weekly_price_type TEXT DEFAULT 'fixed',
      ADD COLUMN IF NOT EXISTS bi_weekly_percentage INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS monthly_subscription_enabled BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS monthly_price_type TEXT DEFAULT 'fixed',
      ADD COLUMN IF NOT EXISTS monthly_percentage INTEGER DEFAULT 0;
    `);
    
    console.log("Successfully added subscription pricing columns!");
    
  } catch (error) {
    console.error("Error adding subscription pricing columns:", error);
  } finally {
    process.exit(0);
  }
}

main();