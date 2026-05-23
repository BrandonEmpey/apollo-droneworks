import { db } from '../db';
import { sql } from 'drizzle-orm';

/**
 * Idempotent one-time migration that:
 *   1. Sets the correct category (and matching title) on the three public
 *      industry tiles whose original seed value was "services" (not a real
 *      service category).
 *   2. Normalises any service records that were previously stored with the
 *      legacy "Real Estate & Aerial Services" category string to the canonical
 *      "Real Estate & Marketing" name that matches the /services page headings.
 *
 * Canonical service categories:
 *   "Real Estate & Marketing"   ← three real-estate services
 *   "Property Inspections"      ← inspection services
 *   "Mapping & Modeling"        ← mapping/3D/timelapse services
 *
 * All UPDATE statements are guarded by WHERE clauses so they are safe to
 * re-run on any environment (no-ops when already correct).
 */
export async function fixIndustryTileCategories(): Promise<void> {
  // ── 1. Industry tile categories ──────────────────────────────────────────
  await db.execute(sql`
    UPDATE industry_tiles
    SET title    = 'Real Estate & Marketing',
        category = 'Real Estate & Marketing'
    WHERE slug = 'aerial-imagery'
      AND (category IS DISTINCT FROM 'Real Estate & Marketing'
           OR title IS DISTINCT FROM 'Real Estate & Marketing');
  `);

  await db.execute(sql`
    UPDATE industry_tiles
    SET title    = 'Property Inspections',
        category = 'Property Inspections'
    WHERE slug = 'inspections'
      AND (category IS DISTINCT FROM 'Property Inspections'
           OR title IS DISTINCT FROM 'Property Inspections');
  `);

  await db.execute(sql`
    UPDATE industry_tiles
    SET title    = 'Mapping & Modeling',
        category = 'Mapping & Modeling'
    WHERE slug = 'construction-mapping'
      AND (category IS DISTINCT FROM 'Mapping & Modeling'
           OR title IS DISTINCT FROM 'Mapping & Modeling');
  `);

  // ── 2. Service category normalisation ────────────────────────────────────
  // A previous code change stored these services with "Real Estate & Aerial
  // Services" which did not match the /services page heading.  Rename them to
  // the canonical value so they appear under the correct section.
  await db.execute(sql`
    UPDATE services
    SET category = 'Real Estate & Marketing'
    WHERE category = 'Real Estate & Aerial Services';
  `);
}
