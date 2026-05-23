import { drizzle } from "drizzle-orm/neon-serverless";
import { Pool, neonConfig } from "@neondatabase/serverless";
import { eq } from "drizzle-orm";
import { services, serviceAddons } from "../../shared/schema";
import dotenv from "dotenv";
import ws from "ws";

dotenv.config();
neonConfig.webSocketConstructor = ws;

async function main() {
  console.log("Starting migration: Adding service addon relations table");
  
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL environment variable is not set");
  }
  
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool);
  
  try {
    // Step 1: Create the new service_addons table using a raw query
    await pool.query(`
      CREATE TABLE IF NOT EXISTS service_addons (
        id SERIAL PRIMARY KEY,
        service_id INTEGER NOT NULL REFERENCES services(id) ON DELETE CASCADE,
        addon_service_id INTEGER NOT NULL REFERENCES services(id) ON DELETE CASCADE,
        price INTEGER NOT NULL DEFAULT 0,
        is_enabled BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
      );
    `);
    console.log("Service addons table created successfully");
    
    // Step 2: Get all services to create initial addon relations
    const allServices = await db.select().from(services);
    console.log(`Found ${allServices.length} services to process`);
    
    // Step 3: For each service, create addon entries for all other services (initially disabled)
    for (const service of allServices) {
      const addonCandidates = allServices.filter(s => s.id !== service.id);
      
      // Check if this service was marked as an add-on in the old schema
      const wasAddon = service.isAvailableAsAddon;
      
      for (const addonService of addonCandidates) {
        // If this service was previously marked as an addon, enable it for all other services
        // with the previously set addon price
        const isEnabled = wasAddon;
        const price = wasAddon ? service.addonPrice : 0;
        
        // Insert the addon relation
        await db.insert(serviceAddons).values({
          serviceId: addonService.id,
          addonServiceId: service.id,
          price: price,
          isEnabled: isEnabled
        });
      }
    }
    
    console.log("Migration completed successfully");
  } catch (error) {
    console.error("Migration failed:", error);
    throw error;
  } finally {
    await pool.end();
  }
}

main().catch(err => {
  console.error("Migration failed:", err);
  process.exit(1);
});