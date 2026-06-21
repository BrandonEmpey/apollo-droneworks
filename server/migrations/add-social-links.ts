import { db } from "../db";
import { sql } from "drizzle-orm";

export async function addSocialLinks() {
  const cols = ["facebook_url", "instagram_url", "twitter_url", "youtube_url"];
  for (const col of cols) {
    const [{ exists }] = await db.execute<{ exists: boolean }>(sql`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'business_config' AND column_name = ${col}
      ) AS exists
    `);
    if (!exists) {
      await db.execute(sql`ALTER TABLE business_config ADD COLUMN ${sql.raw(col)} TEXT`);
      console.log(`[migration] Added business_config.${col}`);
    }
  }
}
