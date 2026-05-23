import { pool } from "../db";

async function main() {
  console.log("Adding auto-mode columns to business_config table...");

  try {
    // Add auto toggle columns for business configuration
    await pool.query(`
      ALTER TABLE business_config
      ADD COLUMN IF NOT EXISTS use_auto_depreciable_assets BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS use_auto_target_missions_per_week BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS use_auto_target_reinvestment_years BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS use_auto_yearly_advertisement_cost BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS use_auto_yearly_insurance_cost BOOLEAN DEFAULT FALSE, 
      ADD COLUMN IF NOT EXISTS use_auto_yearly_software_subscriptions_cost BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS use_auto_tax_percentage BOOLEAN DEFAULT FALSE,
      
      -- Auto toggle columns for per-mission overhead costs (if they don't already exist)
      ADD COLUMN IF NOT EXISTS use_auto_equipment_depreciation BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS use_auto_battery_usage BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS use_auto_insurance BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS use_auto_transportation BOOLEAN DEFAULT FALSE,
      
      -- Auto values for business configuration
      ADD COLUMN IF NOT EXISTS auto_depreciable_assets NUMERIC DEFAULT 0,
      ADD COLUMN IF NOT EXISTS auto_target_missions_per_week NUMERIC DEFAULT 0,
      ADD COLUMN IF NOT EXISTS auto_target_reinvestment_years NUMERIC DEFAULT 0,
      ADD COLUMN IF NOT EXISTS auto_yearly_advertisement_cost NUMERIC DEFAULT 0,
      ADD COLUMN IF NOT EXISTS auto_yearly_insurance_cost NUMERIC DEFAULT 0,
      ADD COLUMN IF NOT EXISTS auto_yearly_software_subscriptions_cost NUMERIC DEFAULT 0,
      ADD COLUMN IF NOT EXISTS auto_tax_percentage NUMERIC DEFAULT 0,
      
      -- Auto values for per-mission overhead costs (if they don't already exist)
      ADD COLUMN IF NOT EXISTS auto_equipment_depreciation NUMERIC DEFAULT 0,
      ADD COLUMN IF NOT EXISTS auto_battery_usage NUMERIC DEFAULT 0,
      ADD COLUMN IF NOT EXISTS auto_insurance NUMERIC DEFAULT 0,
      ADD COLUMN IF NOT EXISTS auto_transportation NUMERIC DEFAULT 0;
    `);

    console.log("Successfully added auto-mode columns to business_config table!");

    // Populate auto values directly in the business_config table
    console.log("Populating auto values in the business_config table...");
    
    await pool.query(`
      UPDATE business_config
      SET 
        auto_depreciable_assets = 15000,
        auto_target_missions_per_week = 5,
        auto_target_reinvestment_years = 3,
        auto_yearly_advertisement_cost = 2800,
        auto_yearly_insurance_cost = 2200,
        auto_yearly_software_subscriptions_cost = 1500,
        auto_tax_percentage = 8.5,
        auto_equipment_depreciation = 45,
        auto_battery_usage = 22,
        auto_insurance = 35,
        auto_transportation = 48
      WHERE id = 1;
    `);
    
    console.log("Successfully populated auto values in the business_config table!");
    
  } catch (error) {
    console.error("Error adding auto-mode columns:", error);
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