import { drizzle } from 'drizzle-orm/neon-serverless';
import { Pool } from '@neondatabase/serverless';
import ws from 'ws';
import { serviceAddons } from '../../shared/schema';
import { sql } from 'drizzle-orm';

// This migration adds fields to support standalone add-ons that aren't linked to existing services
async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL environment variable is required");
  }

  // Set websocket constructor for Neon
  (globalThis as any).WebSocket = ws;

  // Create a connection pool
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool);

  try {
    console.log("Starting standalone add-on fields migration...");

    // Check if addonName column already exists to avoid duplicate migrations
    const columnsResult = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'service_addons' AND column_name = 'addon_name'
    `);

    if (columnsResult.length > 0) {
      console.log("Standalone add-on fields already exist, skipping migration");
      return;
    }

    // Add the new columns
    await db.execute(sql`
      ALTER TABLE service_addons
      ADD COLUMN addon_name TEXT,
      ADD COLUMN addon_description TEXT,
      ADD COLUMN is_standalone BOOLEAN DEFAULT FALSE,
      ALTER COLUMN addon_service_id DROP NOT NULL
    `);

    console.log("Standalone add-on fields migration completed successfully!");
  } catch (error) {
    console.error("Error during migration:", error);
    throw error;
  } finally {
    await pool.end();
  }
}

main().catch(console.error);