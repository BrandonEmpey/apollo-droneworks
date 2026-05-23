import { db } from "../db";
import { sql } from "drizzle-orm";

/**
 * Idempotent one-time migration. Copies rows from the legacy `pricing_tiers`
 * table into the JSONB `services.pricing_tiers` column (converting dollar
 * amounts to cents), flips `pricing_type` to `tiered` for affected services,
 * then drops the legacy table.
 *
 * Records itself in `schema_migrations` so it never runs twice.
 */
export async function migrateLegacyPricingTiersToJsonb(): Promise<void> {
  const MIGRATION_KEY = "migrate-legacy-pricing-tiers-to-jsonb";

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
    return;
  }

  const legacy = await db.execute(sql`
    SELECT to_regclass('public.pricing_tiers')::text AS reg
  `);
  const reg = legacy.rows?.[0]?.reg as string | null | undefined;

  if (reg) {
    await db.execute(sql`
      UPDATE services s
      SET pricing_tiers = sub.tiers,
          pricing_type = 'tiered',
          updated_at = now()
      FROM (
        SELECT service_id, jsonb_agg(
          jsonb_strip_nulls(jsonb_build_object(
            'name', name,
            'description', description,
            'minQuantity', min_quantity,
            'maxQuantity', max_quantity,
            'quantityType', 'range',
            'quantityUnit', quantity_unit,
            'price', (min_price * 100)::int,
            'priceType', COALESCE(price_type, 'fixed'),
            'minPrice', CASE WHEN price_type = 'range' THEN (min_price * 100)::int ELSE NULL END,
            'maxPrice', CASE WHEN max_price IS NOT NULL THEN (max_price * 100)::int ELSE NULL END,
            'features', features,
            'isPopular', is_popular,
            'displayOrder', display_order
          ))
          ORDER BY display_order, id
        ) AS tiers
        FROM pricing_tiers
        GROUP BY service_id
      ) sub
      WHERE s.id = sub.service_id
        AND (s.pricing_tiers IS NULL
             OR s.pricing_tiers::text = '[]'
             OR jsonb_array_length(s.pricing_tiers) = 0)
    `);

    await db.execute(sql`DROP TABLE IF EXISTS pricing_tiers CASCADE`);
  }

  await db.execute(sql`
    INSERT INTO schema_migrations (key) VALUES (${MIGRATION_KEY})
    ON CONFLICT (key) DO NOTHING
  `);
}
