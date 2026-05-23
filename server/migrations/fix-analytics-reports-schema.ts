import { db } from '../db';
import { sql } from 'drizzle-orm';

/**
 * Idempotent migration that reconciles the analytics_reports table with the
 * current Drizzle schema (shared/schema.ts).
 *
 * Background: the table was originally created with fewer columns
 * (id, user_id, report_type NOT NULL, data NOT NULL, created_at, updated_at)
 * and later the schema was updated to include configuration, is_default,
 * schedule, last_generated_at, last_generated_data while also renaming
 * concepts. The CREATE TABLE IF NOT EXISTS in migrate-financial-analytics.ts
 * skips when the table already exists, so existing deployments end up missing
 * the new columns and still have the legacy NOT NULL constraints.
 *
 * This migration:
 *   1. Adds each missing column using ADD COLUMN IF NOT EXISTS (always safe).
 *   2. Drops the orphaned legacy columns report_type and data — only when those
 *      columns actually exist, so the migration is safe on fresh DBs too.
 */
export async function fixAnalyticsReportsSchema(): Promise<void> {
  // 1. Add missing columns (IF NOT EXISTS makes each statement a no-op when
  //    the column is already present, e.g. on fresh installs).
  await db.execute(sql`
    ALTER TABLE analytics_reports
      ADD COLUMN IF NOT EXISTS configuration       JSONB NOT NULL DEFAULT '{}'::jsonb,
      ADD COLUMN IF NOT EXISTS is_default          BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS schedule            JSONB,
      ADD COLUMN IF NOT EXISTS last_generated_at   TIMESTAMP,
      ADD COLUMN IF NOT EXISTS last_generated_data JSONB
  `);

  // 2. Drop the orphaned legacy columns report_type and data.
  //    We guard each statement with an existence check so the migration is
  //    safe on fresh databases where these columns were never created.
  await db.execute(sql`
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'analytics_reports'
          AND column_name = 'report_type'
      ) THEN
        ALTER TABLE analytics_reports DROP COLUMN report_type;
      END IF;

      IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'analytics_reports'
          AND column_name = 'data'
      ) THEN
        ALTER TABLE analytics_reports DROP COLUMN data;
      END IF;
    END
    $$
  `);
}
