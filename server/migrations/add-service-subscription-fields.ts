import { db } from '../db';
import { sql } from 'drizzle-orm';

/**
 * This migration adds subscription-related fields to the services table.
 */
async function main() {
  try {
    console.log('Starting to add subscription fields to services table...');
    
    // Check if the columns already exist
    const result = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'services' AND column_name = 'is_subscription'
    `);
    
    if (result.rows.length === 0) {
      // Add subscription-related fields
      await db.execute(sql`
        ALTER TABLE services
        ADD COLUMN is_subscription BOOLEAN DEFAULT false,
        ADD COLUMN weekly_price INTEGER DEFAULT 0,
        ADD COLUMN monthly_price INTEGER DEFAULT 0,
        ADD COLUMN billing_frequency TEXT DEFAULT 'monthly',
        ADD COLUMN frequency_details TEXT
      `);
      console.log('Successfully added subscription fields to services table');
    } else {
      console.log('Subscription fields already exist, skipping migration');
    }
    
    console.log('Service subscription fields migration completed successfully');
  } catch (error) {
    console.error('Error adding subscription fields to services table:', error);
    throw error;
  }
}

export default main;