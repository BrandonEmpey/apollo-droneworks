import { db } from '../db';
import { sql } from 'drizzle-orm';

export async function createBusinessConfigTable() {
  try {
    console.log('Creating business config table...');
    
    // Create business config table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS business_config (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL DEFAULT 'default',
        depreciable_assets NUMERIC DEFAULT 10000,
        target_missions_per_week NUMERIC DEFAULT 3,
        target_reinvestment_years NUMERIC DEFAULT 2,
        yearly_advertisement_cost NUMERIC DEFAULT 2000,
        yearly_insurance_cost NUMERIC DEFAULT 1500,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
      )
    `);
    
    // Check if any records exist
    const count = await db.execute(sql`SELECT COUNT(*) FROM business_config`);
    const numRecords = parseInt(count.rows[0].count);
    
    // Insert default record if none exists
    if (numRecords === 0) {
      await db.execute(sql`
        INSERT INTO business_config (
          name, 
          depreciable_assets, 
          target_missions_per_week, 
          target_reinvestment_years, 
          yearly_advertisement_cost, 
          yearly_insurance_cost
        ) VALUES (
          'default', 
          10000, 
          3, 
          2, 
          2000, 
          1500
        )
      `);
      console.log('Default business config created');
    }
    
    console.log('Business config table setup complete');
  } catch (error) {
    console.error('Error creating business config table:', error);
    throw error;
  }
}