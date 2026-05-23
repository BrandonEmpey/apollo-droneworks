import { db } from "../db";
import { sql } from "drizzle-orm";

async function main() {
  console.log("Starting subscription price fields migration...");

  try {
    // Check if weekly_price column exists in service_addons
    const checkQuery = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'service_addons' AND column_name = 'weekly_price'
    `);

    if (checkQuery.rowCount === 0) {
      console.log("Adding subscription price fields to service_addons table...");
      
      // Add weekly_price column
      await db.execute(sql`
        ALTER TABLE service_addons
        ADD COLUMN weekly_price INTEGER DEFAULT 0
      `);
      
      // Add monthly_price column
      await db.execute(sql`
        ALTER TABLE service_addons
        ADD COLUMN monthly_price INTEGER DEFAULT 0
      `);
      
      // Set default values based on existing price
      await db.execute(sql`
        UPDATE service_addons
        SET weekly_price = price, monthly_price = price
      `);
      
      console.log("Service add-on subscription price fields added successfully");
    } else {
      console.log("Service add-on subscription price fields already exist, skipping migration");
    }

    console.log("Subscription price fields migration completed successfully");
  } catch (error) {
    console.error("Error in subscription price fields migration:", error);
    throw error;
  }
}

// Run the migration immediately
main()
  .then(() => {
    console.log("Subscription price fields migration completed successfully");
    process.exit(0);
  })
  .catch((err) => {
    console.error("Error in subscription price fields migration:", err);
    process.exit(1);
  });