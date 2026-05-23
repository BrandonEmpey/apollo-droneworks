import { pool } from "../db";

/**
 * This script adds biweekly pricing fields to services and service_addons tables
 */
async function main() {
  console.log("Starting bi-weekly price fields migration...");

  try {
    // Check if the bi_weekly_price column exists in the services table
    const checkServicesResult = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'services' AND column_name = 'bi_weekly_price'
    `);

    if (checkServicesResult.rowCount === 0) {
      console.log("Adding bi_weekly_price to services table...");
      await pool.query(`
        ALTER TABLE services 
        ADD COLUMN bi_weekly_price INTEGER DEFAULT 0
      `);
      console.log("bi_weekly_price added to services table");
    } else {
      console.log("bi_weekly_price already exists in services table, skipping");
    }

    // Check if the bi_weekly_price column exists in the service_addons table
    const checkAddonsResult = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'service_addons' AND column_name = 'bi_weekly_price'
    `);

    if (checkAddonsResult.rowCount === 0) {
      console.log("Adding bi_weekly_price to service_addons table...");
      await pool.query(`
        ALTER TABLE service_addons 
        ADD COLUMN bi_weekly_price INTEGER DEFAULT 0
      `);
      console.log("bi_weekly_price added to service_addons table");
    } else {
      console.log("bi_weekly_price already exists in service_addons table, skipping");
    }

    console.log("Bi-weekly price fields migration completed successfully!");
  } catch (error) {
    console.error("Error in bi-weekly price fields migration:", error);
    throw error;
  }
}

// Run the migration
main()
  .then(() => {
    console.log("Bi-weekly price fields migration completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Bi-weekly price fields migration failed:", error);
    process.exit(1);
  });