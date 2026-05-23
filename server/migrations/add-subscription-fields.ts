import { db } from "../db";
import { sql } from "drizzle-orm";

async function main() {
  console.log("Starting subscription fields migration...");

  try {
    // Check if isSubscription column exists in service_addons
    const checkQuery = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'service_addons' AND column_name = 'is_subscription'
    `);

    if (checkQuery.rowCount === 0) {
      console.log("Adding subscription fields to service_addons table...");
      
      // Add isSubscription column
      await db.execute(sql`
        ALTER TABLE service_addons
        ADD COLUMN is_subscription BOOLEAN DEFAULT FALSE
      `);
      
      // Add billingFrequency column
      await db.execute(sql`
        ALTER TABLE service_addons
        ADD COLUMN billing_frequency TEXT DEFAULT 'monthly'
      `);
      
      console.log("Service add-on subscription fields added successfully");
    } else {
      console.log("Service add-on subscription fields already exist, skipping migration");
    }

    console.log("Subscription fields migration completed successfully");
  } catch (error) {
    console.error("Error in subscription fields migration:", error);
    throw error;
  }
}

// Run the migration immediately
main()
  .then(() => {
    console.log("Subscription fields migration completed successfully");
    process.exit(0);
  })
  .catch((err) => {
    console.error("Error in subscription fields migration:", err);
    process.exit(1);
  });