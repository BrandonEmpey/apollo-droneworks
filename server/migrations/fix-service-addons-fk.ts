/**
 * Fixes the FK constraint on service_addons.addon_id which incorrectly
 * references services.id instead of addons.id.
 *
 * This happened because the table was created with the wrong FK target.
 * Idempotent: only runs if the bad constraint exists.
 */

import { db } from "../db";
import { sql } from "drizzle-orm";

export async function fixServiceAddonsFk() {
  // Check if the bad constraint exists
  const check = await db.execute(sql`
    SELECT constraint_name FROM information_schema.table_constraints
    WHERE table_name = 'service_addons'
    AND constraint_name = 'service_addons_addon_id_services_id_fk'
    AND constraint_type = 'FOREIGN KEY'
  `);

  if (check.rows.length === 0) {
    // Also check for any addon_id FK that points to services
    const check2 = await db.execute(sql`
      SELECT kcu.constraint_name
      FROM information_schema.key_column_usage kcu
      JOIN information_schema.referential_constraints rc ON kcu.constraint_name = rc.constraint_name
      JOIN information_schema.constraint_column_usage ccu ON rc.unique_constraint_name = ccu.constraint_name
      WHERE kcu.table_name = 'service_addons'
      AND kcu.column_name = 'addon_id'
      AND ccu.table_name = 'services'
    `);
    if (check2.rows.length === 0) {
      console.log("[fix-service-addons-fk] FK looks correct — skipping.");
      return;
    }
    const badName = (check2.rows[0] as { constraint_name: string }).constraint_name;
    console.log(`[fix-service-addons-fk] Found bad FK: ${badName}`);
    await db.execute(sql`ALTER TABLE service_addons DROP CONSTRAINT IF EXISTS ${sql.raw(badName)}`);
    await db.execute(sql`ALTER TABLE service_addons ADD CONSTRAINT service_addons_addon_id_addons_id_fk FOREIGN KEY (addon_id) REFERENCES addons(id) ON DELETE CASCADE`);
    console.log("[fix-service-addons-fk] FK repaired.");
    return;
  }

  console.log("[fix-service-addons-fk] Dropping bad FK pointing to services.id...");
  await db.execute(sql`ALTER TABLE service_addons DROP CONSTRAINT service_addons_addon_id_services_id_fk`);
  await db.execute(sql`ALTER TABLE service_addons ADD CONSTRAINT service_addons_addon_id_addons_id_fk FOREIGN KEY (addon_id) REFERENCES addons(id) ON DELETE CASCADE`);
  console.log("[fix-service-addons-fk] FK repaired: addon_id now correctly references addons.id.");
}
