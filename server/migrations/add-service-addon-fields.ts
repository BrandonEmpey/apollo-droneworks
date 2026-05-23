import { Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { boolean, integer } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

/**
 * This migration adds add-on functionality fields to the services table
 */
export async function addServiceAddonFields(pool: Pool) {
  console.log('Starting service add-on fields migration...');
  const db = drizzle(pool);
  
  try {
    // Check if the columns already exist
    const checkResult = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'services' 
      AND column_name = 'is_available_as_addon'
    `);
    
    if (checkResult.rowCount === 0) {
      // Add is_available_as_addon column
      await db.execute(sql`
        ALTER TABLE services
        ADD COLUMN is_available_as_addon boolean NOT NULL DEFAULT false
      `);
      console.log('Added is_available_as_addon column to services table');
      
      // Add addon_price column
      await db.execute(sql`
        ALTER TABLE services
        ADD COLUMN addon_price integer NOT NULL DEFAULT 0
      `);
      console.log('Added addon_price column to services table');
      
      console.log('Services table migration completed successfully!');
    } else {
      console.log('Service add-on fields already exist, skipping migration');
    }
  } catch (error) {
    console.error('Error during service add-on fields migration:', error);
    throw error;
  }
  
  return 'Service add-on fields migration completed successfully';
}