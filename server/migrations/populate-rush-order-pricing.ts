/**
 * Populates rush_order_pricing for all services if the table is empty.
 * Idempotent: no-op if any rows already exist.
 */

import { db } from "../db";
import { sql } from "drizzle-orm";

export async function populateRushOrderPricing() {
  const count = await db.execute(sql`SELECT COUNT(*) AS n FROM rush_order_pricing`);
  const n = Number((count.rows[0] as { n: string }).n);
  if (n > 0) {
    console.log(`[rush-pricing] ${n} rows already exist — skipping.`);
    return;
  }

  const svcs = await db.execute(sql`SELECT id FROM services`);
  let inserted = 0;
  for (const r of svcs.rows as { id: number }[]) {
    await db.execute(sql`
      INSERT INTO rush_order_pricing (service_id, rush_multiplier, minimum_notice_hours, is_active)
      VALUES (${r.id}, 1.25, 24, true)
    `);
    inserted++;
  }
  console.log(`[rush-pricing] Inserted rush order pricing for ${inserted} services.`);
}
