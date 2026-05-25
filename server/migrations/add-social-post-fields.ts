import { pool } from "../db";

export async function addSocialPostFields() {
  const client = await pool.connect();
  try {
    await client.query(`
      ALTER TABLE social_posts
        ADD COLUMN IF NOT EXISTS blog_post_id integer,
        ADD COLUMN IF NOT EXISTS platform text;
    `);
  } finally {
    client.release();
  }
}
