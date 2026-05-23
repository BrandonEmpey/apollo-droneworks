import { db } from '../db';
import { sql } from 'drizzle-orm';

export async function updateQuotesBusinessCosts() {
  try {
    console.log('Updating quotes table with business costs fields...');
    
    // Add business costs fields
    await db.execute(sql`
      ALTER TABLE quotes 
      ADD COLUMN IF NOT EXISTS depreciable_assets REAL,
      ADD COLUMN IF NOT EXISTS target_missions_per_week INTEGER,
      ADD COLUMN IF NOT EXISTS target_reinvestment_years INTEGER,
      ADD COLUMN IF NOT EXISTS yearly_advertisement_cost REAL,
      ADD COLUMN IF NOT EXISTS yearly_insurance_cost REAL,
      ADD COLUMN IF NOT EXISTS depreciable_assets_split TEXT,
      ADD COLUMN IF NOT EXISTS advertisement_split TEXT,
      ADD COLUMN IF NOT EXISTS insurance_split TEXT,
      ADD COLUMN IF NOT EXISTS net_profit TEXT
    `);
    
    console.log('Quotes table updated successfully with business costs fields');
  } catch (error) {
    console.error('Error updating quotes table:', error);
    throw error;
  }
}