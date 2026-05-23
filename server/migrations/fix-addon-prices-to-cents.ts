import { db } from "../db";
import { sql } from "drizzle-orm";

/**
 * One-time migration to convert add-on prices from whole dollar amounts to cents.
 * Add-ons were initially seeded with prices stored as dollars (e.g., 75 for $75.00)
 * but the schema convention is cents (e.g., 7500 for $75.00).
 *
 * This migration is truly one-time: it records itself in schema_migrations so it
 * never runs again after the first successful application, regardless of price values.
 */
export async function fixAddonPricesToCents() {
  const MIGRATION_KEY = "fix-addon-prices-to-cents";

  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        key TEXT PRIMARY KEY,
        applied_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `);

    const already = await db.execute(sql`
      SELECT key FROM schema_migrations WHERE key = ${MIGRATION_KEY}
    `);

    if ((already.rowCount ?? 0) > 0) {
      console.log("Add-on price cents migration already applied, skipping");
      return;
    }

    console.log("Running add-on price cents migration...");

    const result = await db.execute(sql`
      UPDATE addons SET price = price * 100
    `);

    await db.execute(sql`
      INSERT INTO schema_migrations (key) VALUES (${MIGRATION_KEY})
    `);

    console.log(`Converted ${result.rowCount ?? 0} add-on price(s) from dollars to cents`);
  } catch (error) {
    console.error("Error in add-on price cents migration:", error);
    throw error;
  }
}
