import { drizzle } from 'drizzle-orm/neon-serverless';
import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
import { sql } from 'drizzle-orm';

// Setup Neon config
neonConfig.webSocketConstructor = ws;

async function main() {
  console.log("Starting to add project fields to bookings table...");
  
  try {
    // Connect to the database
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL is not defined");
    }
    
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const db = drizzle(pool);

    // Check if the columns already exist
    const checkProjectIdColumn = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'bookings' AND column_name = 'project_id'
    `);

    const checkProjectNameColumn = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'bookings' AND column_name = 'project_name'
    `);

    // Add project_id column if it doesn't exist
    if (checkProjectIdColumn.rows.length === 0) {
      console.log("Adding project_id column to bookings table...");
      await db.execute(sql`
        ALTER TABLE bookings 
        ADD COLUMN project_id INTEGER
      `);
      console.log("project_id column added successfully");
    } else {
      console.log("project_id column already exists, skipping");
    }

    // Add project_name column if it doesn't exist
    if (checkProjectNameColumn.rows.length === 0) {
      console.log("Adding project_name column to bookings table...");
      await db.execute(sql`
        ALTER TABLE bookings 
        ADD COLUMN project_name TEXT
      `);
      console.log("project_name column added successfully");
    } else {
      console.log("project_name column already exists, skipping");
    }

    console.log("Project fields migration completed successfully");
  } catch (error) {
    console.error("Error adding project fields to bookings table:", error);
  }
}

main().catch(console.error);