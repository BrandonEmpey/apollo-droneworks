import { db } from "../../server/db";
import { sql } from "drizzle-orm";

async function main() {
  console.log("Adding auto mode columns to business_config table...");

  try {
    // Add auto mode toggle columns
    await db.execute(sql`
      ALTER TABLE business_config 
      ADD COLUMN IF NOT EXISTS use_auto_equipment_depreciation BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS use_auto_battery_usage BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS use_auto_insurance BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS use_auto_transportation BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS use_auto_tax_percentage BOOLEAN DEFAULT FALSE,
      
      -- Add auto calculated values from analytics
      ADD COLUMN IF NOT EXISTS auto_equipment_depreciation NUMERIC,
      ADD COLUMN IF NOT EXISTS auto_battery_usage NUMERIC,
      ADD COLUMN IF NOT EXISTS auto_insurance NUMERIC,
      ADD COLUMN IF NOT EXISTS auto_transportation NUMERIC,
      ADD COLUMN IF NOT EXISTS auto_tax_percentage NUMERIC;
    `);

    console.log("Successfully added auto mode columns to business_config table");

    // Calculate and populate the auto values from analytics for the past year
    await populateAutoValuesFromAnalytics();

  } catch (error) {
    console.error("Error adding auto mode columns:", error);
    throw error;
  }
}

async function populateAutoValuesFromAnalytics() {
  console.log("Populating auto values from analytics data...");
  
  try {
    // Get current date
    const currentDate = new Date();
    const lastYear = currentDate.getFullYear() - 1;
    
    // Start and end dates for the previous calendar year
    const startDate = new Date(lastYear, 0, 1); // January 1st of last year
    const endDate = new Date(lastYear, 11, 31); // December 31st of last year

    // Calculate average equipment depreciation
    const equipmentDepQuery = await db.execute(sql`
      SELECT AVG(equipment_cost) as avg_equipment_depreciation
      FROM project_analytics
      WHERE date BETWEEN ${startDate.toISOString()} AND ${endDate.toISOString()};
    `);
    
    // Calculate average battery usage
    const batteryUsageQuery = await db.execute(sql`
      SELECT AVG(battery_cost) as avg_battery_usage
      FROM project_analytics
      WHERE date BETWEEN ${startDate.toISOString()} AND ${endDate.toISOString()};
    `);
    
    // Calculate average insurance cost per mission
    const insuranceQuery = await db.execute(sql`
      SELECT AVG(insurance_cost) as avg_insurance
      FROM project_analytics
      WHERE date BETWEEN ${startDate.toISOString()} AND ${endDate.toISOString()};
    `);
    
    // Calculate average transportation cost
    const transportationQuery = await db.execute(sql`
      SELECT AVG(travel_cost) as avg_transportation
      FROM project_analytics
      WHERE date BETWEEN ${startDate.toISOString()} AND ${endDate.toISOString()};
    `);

    // Calculate average tax percentage applied
    const taxQuery = await db.execute(sql`
      SELECT AVG(tax_percentage) as avg_tax_percentage
      FROM project_analytics
      WHERE date BETWEEN ${startDate.toISOString()} AND ${endDate.toISOString()}
      AND tax_percentage IS NOT NULL;
    `);

    // Extract values from query results
    const avgEquipmentDepreciation = equipmentDepQuery.rows[0]?.avg_equipment_depreciation || 0;
    const avgBatteryUsage = batteryUsageQuery.rows[0]?.avg_battery_usage || 0;
    const avgInsurance = insuranceQuery.rows[0]?.avg_insurance || 0;
    const avgTransportation = transportationQuery.rows[0]?.avg_transportation || 0;
    const avgTaxPercentage = taxQuery.rows[0]?.avg_tax_percentage || 8.25;

    // Update business config with these values
    await db.execute(sql`
      UPDATE business_config
      SET 
        auto_equipment_depreciation = ${avgEquipmentDepreciation},
        auto_battery_usage = ${avgBatteryUsage},
        auto_insurance = ${avgInsurance},
        auto_transportation = ${avgTransportation},
        auto_tax_percentage = ${avgTaxPercentage}
      WHERE id = 1;
    `);

    console.log("Auto values populated from analytics data");
  } catch (error) {
    console.error("Error populating auto values:", error);
    // Don't throw here, as we want the migration to complete even if analytics calculation fails
    console.log("Continuing with migration despite analytics calculation error");
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