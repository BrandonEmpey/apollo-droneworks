import { Pool } from '@neondatabase/serverless';
import ws from 'ws';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { services } from '@shared/schema';
import { eq } from 'drizzle-orm';

// Configure the neon connection to use websockets
import { neonConfig } from '@neondatabase/serverless';
neonConfig.webSocketConstructor = ws;

/**
 * This script adds the displayOrder column to the services table
 * and sets initial default values.
 */
async function main() {
  try {
    console.log("Starting service order migration...");
    
    // Connect to the database
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const db = drizzle({ client: pool, schema: { services } });
    
    // Check if the column exists
    try {
      const checkQuery = `
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'services'
        AND column_name = 'display_order';
      `;
      const { rows } = await pool.query(checkQuery);
      
      if (rows.length === 0) {
        // Column doesn't exist, add it
        console.log("Adding display_order column to services table...");
        await pool.query(`
          ALTER TABLE services
          ADD COLUMN display_order INTEGER DEFAULT 999;
        `);
        console.log("Column added successfully");
      } else {
        console.log("display_order column already exists, skipping creation");
      }
    } catch (error) {
      console.error("Error checking column existence:", error);
      process.exit(1);
    }
    
    // Get all services
    const allServices = await db.select().from(services);
    console.log(`Found ${allServices.length} services`);
    
    // Update each service with a default displayOrder if it's not set
    // We'll set Real Estate Photography first (ID 1), then others in ID order
    for (const service of allServices) {
      // Skip if already has a non-default display order
      if (service.displayOrder !== 999) {
        console.log(`Service ${service.id} (${service.name}) already has display order ${service.displayOrder}, skipping`);
        continue;
      }
      
      // Set default order based on ID (ensure Real Estate is first)
      let defaultOrder = service.id;
      if (service.id === 1) { // Real Estate Photography & Videography
        defaultOrder = 1;
      } else {
        defaultOrder = service.id + 1; // Ensure other services come after Real Estate
      }
      
      console.log(`Setting display order for "${service.name}" (ID: ${service.id}) to ${defaultOrder}`);
      
      await db.update(services)
        .set({ displayOrder: defaultOrder })
        .where(eq(services.id, service.id));
    }
    
    console.log("Service display order migration completed successfully");
    process.exit(0);
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
}

main();