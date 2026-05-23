import { sql } from "drizzle-orm";
import { db } from "../db";

export async function addSoftwareAndCustomCosts() {
  console.log("Adding software subscriptions and custom costs fields to business_config table...");
  
  try {
    // Check if the columns already exist to avoid errors
    const tableInfo = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'business_config'
      AND (column_name = 'yearly_software_subscriptions_cost' OR column_name = 'custom_costs')
    `);
    
    const columns = tableInfo.rows.map((row: any) => row.column_name);
    
    if (!columns.includes('yearly_software_subscriptions_cost')) {
      await db.execute(sql`
        ALTER TABLE business_config 
        ADD COLUMN yearly_software_subscriptions_cost NUMERIC DEFAULT '0'
      `);
      console.log("Added yearly_software_subscriptions_cost column");
    }
    
    if (!columns.includes('custom_costs')) {
      await db.execute(sql`
        ALTER TABLE business_config 
        ADD COLUMN custom_costs JSONB DEFAULT '[]'
      `);
      console.log("Added custom_costs column");
    }
    
    console.log("Successfully added new columns to business_config table");
    return true;
  } catch (error) {
    console.error("Error adding columns to business_config table:", error);
    return false;
  }
}