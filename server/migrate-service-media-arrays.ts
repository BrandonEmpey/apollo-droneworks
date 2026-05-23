import { db } from "./db";

/**
 * This script adds the images and videos arrays to the services table
 * for supporting multiple media items in service carousels
 */
async function main() {
  try {
    console.log("Adding images and videos arrays to services table...");
    
    // Add images column
    await db.execute(`
      ALTER TABLE services 
      ADD COLUMN IF NOT EXISTS images JSONB DEFAULT '[]'::jsonb
    `);
    
    // Add videos column
    await db.execute(`
      ALTER TABLE services 
      ADD COLUMN IF NOT EXISTS videos JSONB DEFAULT '[]'::jsonb
    `);

    // Migrate existing imageUrl and videoUrl data to arrays
    console.log("Migrating existing image and video URLs to arrays...");
    
    await db.execute(`
      UPDATE services 
      SET images = CASE 
        WHEN image_url IS NOT NULL AND image_url != '' 
        THEN jsonb_build_array(image_url)
        ELSE '[]'::jsonb
      END
      WHERE images = '[]'::jsonb OR images IS NULL
    `);

    await db.execute(`
      UPDATE services 
      SET videos = CASE 
        WHEN video_url IS NOT NULL AND video_url != '' 
        THEN jsonb_build_array(video_url)
        ELSE '[]'::jsonb
      END
      WHERE videos = '[]'::jsonb OR videos IS NULL
    `);

    console.log("Service media arrays migration completed successfully!");
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
}

main();