import { db } from "./db";
import { sql } from "drizzle-orm";

/**
 * Adds keywords field to all media-related tables for SEO purposes
 */
export async function migrateKeywords() {
  console.log("Starting keywords migration...");

  try {
    // Add keywords column to services table if it doesn't exist
    await db.execute(sql`
      DO $$ 
      BEGIN 
        BEGIN
          ALTER TABLE services ADD COLUMN keywords JSONB DEFAULT '[]'::jsonb;
          RAISE NOTICE 'Added keywords column to services table';
        EXCEPTION
          WHEN duplicate_column THEN 
            RAISE NOTICE 'keywords column already exists in services table';
        END;
      END $$;
    `);

    // Add keywords column to before_after_images table if it doesn't exist
    await db.execute(sql`
      DO $$ 
      BEGIN 
        BEGIN
          ALTER TABLE before_after_images ADD COLUMN keywords JSONB DEFAULT '[]'::jsonb;
          RAISE NOTICE 'Added keywords column to before_after_images table';
        EXCEPTION
          WHEN duplicate_column THEN 
            RAISE NOTICE 'keywords column already exists in before_after_images table';
        END;
      END $$;
    `);

    // Add keywords column to blog_posts table if it doesn't exist
    await db.execute(sql`
      DO $$ 
      BEGIN 
        BEGIN
          ALTER TABLE blog_posts ADD COLUMN keywords JSONB DEFAULT '[]'::jsonb;
          RAISE NOTICE 'Added keywords column to blog_posts table';
        EXCEPTION
          WHEN duplicate_column THEN 
            RAISE NOTICE 'keywords column already exists in blog_posts table';
        END;
      END $$;
    `);

    // Add keywords column to social_posts table if it doesn't exist
    await db.execute(sql`
      DO $$ 
      BEGIN 
        BEGIN
          ALTER TABLE social_posts ADD COLUMN keywords JSONB DEFAULT '[]'::jsonb;
          RAISE NOTICE 'Added keywords column to social_posts table';
        EXCEPTION
          WHEN duplicate_column THEN 
            RAISE NOTICE 'keywords column already exists in social_posts table';
        END;
      END $$;
    `);

    // Check if models_3d table exists first before trying to add a column to it
    try {
      const tableExists = await db.execute(sql`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'models_3d'
        );
      `);
      
      // If the table exists, add the keywords column
      if (tableExists.rows[0].exists) {
        await db.execute(sql`
          DO $$ 
          BEGIN 
            BEGIN
              ALTER TABLE models_3d ADD COLUMN keywords JSONB DEFAULT '[]'::jsonb;
              RAISE NOTICE 'Added keywords column to models_3d table';
            EXCEPTION
              WHEN duplicate_column THEN 
                RAISE NOTICE 'keywords column already exists in models_3d table';
            END;
          END $$;
        `);
      } else {
        console.log("models_3d table does not exist, skipping keywords addition");
      }
    } catch (error) {
      console.log("Error checking models_3d table existence, skipping:", error);
    }

    console.log("Keywords migration completed successfully!");
    return true;
  } catch (error) {
    console.error("Error during keywords migration:", error);
    throw error;
  }
}