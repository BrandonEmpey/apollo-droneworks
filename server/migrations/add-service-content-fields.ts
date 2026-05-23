/**
 * This migration adds content fields to the services table for storing
 * "About This Service" and "What's Included" content
 */
import { db } from "../db";
import { services } from "@shared/schema";
import { json, text } from "drizzle-orm/pg-core";

async function main() {
  try {
    console.log("Starting service content fields migration...");
    
    // First check if the table has the columns already
    const tableInfo = await db.execute(
      "SELECT column_name FROM information_schema.columns WHERE table_name = 'services' AND column_name = 'about_service_content'"
    );
    
    // If the column already exists, skip the migration
    if (tableInfo.rows.length > 0) {
      console.log("About service content column already exists, skipping migration");
      return;
    }

    // Add the about_service_content column to the services table
    await db.execute(
      "ALTER TABLE services ADD COLUMN about_service_content TEXT"
    );
    
    // Add the whats_included_content column to the services table
    await db.execute(
      "ALTER TABLE services ADD COLUMN whats_included_content JSONB DEFAULT '[]'::jsonb"
    );
    
    console.log("Service content fields migration completed successfully");
  } catch (error) {
    console.error("Error in service content fields migration:", error);
    throw error;
  }
}

main()
  .then(() => {
    console.log("Service content fields migration completed");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Service content fields migration failed:", error);
    process.exit(1);
  });