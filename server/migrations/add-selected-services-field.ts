import { db } from '../db';
import { sql } from 'drizzle-orm';

/**
 * This migration adds the selected_services column to bookings and client_projects tables
 * to support multiple services per booking and project
 */
async function main() {
  console.log('Starting to add selected_services column migration...');

  try {
    // Check if selected_services column exists in bookings table
    const bookingsHasColumn = await checkColumnExists('bookings', 'selected_services');
    
    if (!bookingsHasColumn) {
      // Add the column to the bookings table
      await db.execute(sql`
        ALTER TABLE bookings
        ADD COLUMN selected_services JSONB DEFAULT '[]'::jsonb;
      `);
      console.log('Added selected_services column to bookings table');
    } else {
      console.log('selected_services column already exists in bookings table, skipping');
    }

    // Check if selected_services column exists in client_projects table
    const projectsHasColumn = await checkColumnExists('client_projects', 'selected_services');
    
    if (!projectsHasColumn) {
      // Add the column to the client_projects table
      await db.execute(sql`
        ALTER TABLE client_projects
        ADD COLUMN selected_services JSONB DEFAULT '[]'::jsonb;
      `);
      console.log('Added selected_services column to client_projects table');
    } else {
      console.log('selected_services column already exists in client_projects table, skipping');
    }

    // Check for existing bookings with serviceId but no selectedServices
    await db.execute(sql`
      UPDATE bookings
      SET selected_services = jsonb_build_array(service_id)
      WHERE (selected_services IS NULL OR selected_services = '[]'::jsonb)
      AND service_id IS NOT NULL;
    `);
    console.log('Updated existing bookings to include service_id in selected_services');

    // Do the same for client projects
    await db.execute(sql`
      UPDATE client_projects
      SET selected_services = jsonb_build_array(service_id)
      WHERE (selected_services IS NULL OR selected_services = '[]'::jsonb)
      AND service_id IS NOT NULL;
    `);
    console.log('Updated existing client projects to include service_id in selected_services');

    console.log('Selected services migration completed successfully');
  } catch (error) {
    console.error('Error in selected services migration:', error);
    throw error;
  }
}

// Helper to check if column exists
async function checkColumnExists(tableName: string, columnName: string): Promise<boolean> {
  const result = await db.execute(sql`
    SELECT EXISTS (
      SELECT 1 
      FROM information_schema.columns 
      WHERE table_name = ${tableName}
      AND column_name = ${columnName}
    ) as column_exists;
  `);
  
  return result.rows[0]?.column_exists === true;
}

main().catch(console.error);
