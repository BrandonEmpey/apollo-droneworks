import { pool } from "../db";

/**
 * Adds the featured_badge boolean column to the services table.
 * When enabled, a "Serving Southern Utah" badge is displayed on the service card.
 */
async function main() {
  try {
    console.log("Starting to add featured_badge field to services table...");
    await pool.query(`
      ALTER TABLE services
      ADD COLUMN IF NOT EXISTS featured_badge BOOLEAN NOT NULL DEFAULT false
    `);
    console.log("featured_badge field added to services table successfully");
    return true;
  } catch (error) {
    console.error("Error adding featured_badge field:", error);
    return false;
  }
}

export { main };
