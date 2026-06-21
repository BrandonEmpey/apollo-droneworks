import { db } from "../db";

export async function addSocialLinks() {
  const colsNeeded = [
    "facebook_url", "instagram_url", "twitter_url", "youtube_url",
    "tiktok_url", "linkedin_url", "website_url", "phone", "email",
    "address", "city", "state", "zip",
    "business_name", "business_description", "logo_url", "hero_image_url",
  ];

  const result = await db.execute(
    `SELECT column_name FROM information_schema.columns WHERE table_name = 'business_config'`
  );
  const existing = new Set((result.rows as any[]).map((r: any) => r.column_name));

  let added = 0;
  for (const col of colsNeeded) {
    if (!existing.has(col)) {
      await db.execute(`ALTER TABLE business_config ADD COLUMN IF NOT EXISTS ${col} TEXT`);
      console.log(`[add-social-links] Added business_config.${col}`);
      added++;
    }
  }
  if (added === 0) console.log("[add-social-links] All columns present — skipping.");
}
