import { db } from "../db";
import { sql } from "drizzle-orm";

export async function main() {
  console.log("Starting client projects migration...");

  try {
    // Check if the client_projects table exists
    const tableExists = await db.execute(sql`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'client_projects'
      );
    `);
    
    if (!tableExists.rows[0].exists) {
      console.log("Creating client_projects table...");
      
      // Create client_projects table
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS client_projects (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          description TEXT,
          client_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
          service_id INTEGER REFERENCES services(id) ON DELETE SET NULL,
          status VARCHAR(50) DEFAULT 'active',
          start_date TIMESTAMPTZ DEFAULT NOW(),
          completed_date TIMESTAMPTZ,
          address TEXT,
          notes TEXT,
          display_order INTEGER DEFAULT 0,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
      `);
      
      console.log("Client projects table created successfully");
      
      // Add project_id reference to client_files if it doesn't exist
      const projectIdExists = await db.execute(sql`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'client_files' 
          AND column_name = 'project_id'
        );
      `);
      
      if (!projectIdExists.rows[0].exists) {
        console.log("Adding project_id to client_files table...");
        
        await db.execute(sql`
          ALTER TABLE client_files 
          ADD COLUMN project_id INTEGER REFERENCES client_projects(id) ON DELETE SET NULL;
        `);
        
        console.log("Added project_id to client_files table successfully");
      } else {
        console.log("project_id column already exists in client_files table");
      }
    } else {
      console.log("client_projects table already exists, skipping creation");
    }
    
    console.log("Client projects migration completed successfully");
  } catch (error) {
    console.error("Error in client projects migration:", error);
    throw error;
  }
}

main().catch(console.error);