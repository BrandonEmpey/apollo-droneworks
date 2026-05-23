import { pool } from "../db";

async function main() {
  console.log("Adding missing per-mission overhead columns to business_config table...");

  try {
    // Add the missing per-mission overhead columns
    await pool.query(`
      ALTER TABLE business_config
      ADD COLUMN IF NOT EXISTS equipment_depreciation NUMERIC DEFAULT 45,
      ADD COLUMN IF NOT EXISTS battery_usage NUMERIC DEFAULT 15,
      ADD COLUMN IF NOT EXISTS insurance NUMERIC DEFAULT 25,
      ADD COLUMN IF NOT EXISTS transportation NUMERIC DEFAULT 35;
    `);

    console.log("Successfully added missing per-mission overhead columns!");
    
  } catch (error) {
    console.error("Error adding per-mission overhead columns:", error);
    throw error;
  }
}

main()
  .then(() => {
    console.log("Migration completed successfully!");
    pool.end();
    process.exit(0);
  })
  .catch((error) => {
    console.error("Migration failed:", error);
    pool.end();
    process.exit(1);
  });