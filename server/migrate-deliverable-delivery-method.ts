import { db } from "./db";
import { sql } from "drizzle-orm";

/**
 * Adds the per-deliverable `delivery_method` column to project_deliverables
 * (Task #145) and backfills existing rows from already-attached data:
 *
 *   - external_url present  -> "link"
 *   - file_url with image extension  -> "image"
 *   - file_url with video extension  -> "video"
 *   - any other file_url             -> "document"
 *   - nothing attached               -> NULL ("Not selected", admin must pick)
 *
 * The schema column is plain TEXT (no enum) so adding new methods to
 * `shared/delivery-methods.ts` later does not require a follow-up migration.
 *
 * Idempotent — safe to run on every boot.
 */
export async function migrateDeliverableDeliveryMethod() {
  console.log("Starting project_deliverables.delivery_method migration...");

  await db.execute(sql`
    ALTER TABLE project_deliverables
      ADD COLUMN IF NOT EXISTS delivery_method TEXT;
  `);

  await db.execute(sql`
    UPDATE project_deliverables
       SET delivery_method = 'link'
     WHERE delivery_method IS NULL
       AND external_url IS NOT NULL
       AND external_url <> '';
  `);

  await db.execute(sql`
    UPDATE project_deliverables
       SET delivery_method = 'image'
     WHERE delivery_method IS NULL
       AND file_url IS NOT NULL
       AND file_url <> ''
       AND lower(regexp_replace(split_part(split_part(file_url, '?', 1), '#', 1), '.*\\.', ''))
           IN ('jpg','jpeg','png','gif','webp','heic','heif','tif','tiff','bmp','svg');
  `);

  await db.execute(sql`
    UPDATE project_deliverables
       SET delivery_method = 'video'
     WHERE delivery_method IS NULL
       AND file_url IS NOT NULL
       AND file_url <> ''
       AND lower(regexp_replace(split_part(split_part(file_url, '?', 1), '#', 1), '.*\\.', ''))
           IN ('mp4','mov','m4v','avi','mkv','webm','wmv','flv');
  `);

  await db.execute(sql`
    UPDATE project_deliverables
       SET delivery_method = 'document'
     WHERE delivery_method IS NULL
       AND file_url IS NOT NULL
       AND file_url <> '';
  `);

  console.log("project_deliverables.delivery_method migration complete.");
}
