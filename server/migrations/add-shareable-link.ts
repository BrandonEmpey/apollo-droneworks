import { db } from "../db";
import { sql } from "drizzle-orm";

async function main() {
  console.log("Adding shareable_link column to client_projects table...");
  
  // Check if the column already exists to prevent errors
  try {
    // Add shareable_link column
    await db.execute(sql`
      ALTER TABLE client_projects 
      ADD COLUMN IF NOT EXISTS shareable_link VARCHAR(255),
      ADD COLUMN IF NOT EXISTS shareable_link_expiry TIMESTAMP WITH TIME ZONE
    `);
    
    console.log("Shareable link columns added successfully");
  } catch (error) {
    console.error("Error adding shareable link columns:", error);
    throw error;
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Migration failed:", error);
    process.exit(1);
  });