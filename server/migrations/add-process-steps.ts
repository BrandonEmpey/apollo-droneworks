import { pool } from "../db";

/**
 * This script adds a process_steps JSON column to the services table
 * to make service process sections editable.
 */
async function main() {
  try {
    console.log("Starting to add process_steps field to services table...");
    
    // Add the process_steps column with IF NOT EXISTS to avoid errors if it already exists
    await pool.query(`
      ALTER TABLE services 
      ADD COLUMN IF NOT EXISTS process_steps JSONB DEFAULT '[]'::jsonb
    `);
    
    // Initialize with default process steps for existing services that don't have them yet
    const defaultSteps = JSON.stringify([
      {"title": "Consultation & Booking", "description": "We'll discuss your specific needs and schedule a date for the shoot."},
      {"title": "On-site Shooting", "description": "Our professional pilot will capture the footage following our detailed shot list."},
      {"title": "Post-Production", "description": "We'll edit and enhance the content to ensure the highest quality deliverables."},
      {"title": "Delivery", "description": "Final content will be available in your client portal within 2-5 business days."}
    ]);
    
    await pool.query(`
      UPDATE services
      SET process_steps = $1::jsonb
      WHERE process_steps IS NULL OR process_steps = '[]'::jsonb
    `, [defaultSteps]);
    
    console.log("Process steps field added to services table successfully");
    return true;
  } catch (error) {
    console.error("Error adding process steps field:", error);
    return false;
  }
}

// Export the main function
export { main };