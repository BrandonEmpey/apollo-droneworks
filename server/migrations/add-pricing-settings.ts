/**
 * Adds admin-configurable discount percentage columns to business_config:
 *   bundle_discount_percentage  — default 25 (used by 3D Digital Twin combo and Foundation to Finish)
 *   partner_discount_percentage — default 10 (applied at checkout for partner accounts)
 * Also adds is_partner_account to users table.
 */

import { db } from "../db";
import { sql } from "drizzle-orm";

export async function addPricingSettings() {
  console.log("Adding pricing settings columns...");

  // business_config: bundle and partner discount percentages
  const bcCols = await db.execute(sql`
    SELECT column_name FROM information_schema.columns
    WHERE table_name = 'business_config'
    AND column_name IN ('bundle_discount_percentage', 'partner_discount_percentage')
  `);
  const bcExisting = (bcCols.rows as { column_name: string }[]).map(r => r.column_name);

  if (!bcExisting.includes('bundle_discount_percentage')) {
    await db.execute(sql`
      ALTER TABLE business_config
      ADD COLUMN bundle_discount_percentage NUMERIC DEFAULT 25
    `);
    // Apply default to existing row
    await db.execute(sql`
      UPDATE business_config SET bundle_discount_percentage = 25 WHERE bundle_discount_percentage IS NULL
    `);
    console.log("Added bundle_discount_percentage to business_config");
  }

  if (!bcExisting.includes('partner_discount_percentage')) {
    await db.execute(sql`
      ALTER TABLE business_config
      ADD COLUMN partner_discount_percentage NUMERIC DEFAULT 10
    `);
    await db.execute(sql`
      UPDATE business_config SET partner_discount_percentage = 10 WHERE partner_discount_percentage IS NULL
    `);
    console.log("Added partner_discount_percentage to business_config");
  }

  // users: is_partner_account flag
  const userCols = await db.execute(sql`
    SELECT column_name FROM information_schema.columns
    WHERE table_name = 'users'
    AND column_name = 'is_partner_account'
  `);
  if ((userCols.rows as unknown[]).length === 0) {
    await db.execute(sql`
      ALTER TABLE users ADD COLUMN is_partner_account BOOLEAN DEFAULT false NOT NULL
    `);
    console.log("Added is_partner_account to users");
  }

  console.log("Pricing settings migration complete.");
}
