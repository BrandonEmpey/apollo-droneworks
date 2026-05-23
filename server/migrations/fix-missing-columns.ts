import { sql } from "drizzle-orm";
import { db } from "../db";

export async function fixMissingColumns() {
  console.log("Fixing missing database columns...");
  
  try {
    // Add missing last_name column to customers table
    await db.execute(sql`
      DO $$ 
      BEGIN 
        BEGIN
          ALTER TABLE customers ADD COLUMN last_name VARCHAR(255);
          RAISE NOTICE 'Added last_name column to customers table';
        EXCEPTION
          WHEN duplicate_column THEN 
            RAISE NOTICE 'last_name column already exists in customers table';
        END;
      END $$;
    `);

    // Add missing type column to analytics_reports table
    await db.execute(sql`
      DO $$ 
      BEGIN 
        BEGIN
          ALTER TABLE analytics_reports ADD COLUMN type VARCHAR(50) DEFAULT 'general';
          RAISE NOTICE 'Added type column to analytics_reports table';
        EXCEPTION
          WHEN duplicate_column THEN 
            RAISE NOTICE 'type column already exists in analytics_reports table';
        END;
      END $$;
    `);

    // Create testimonials table if it doesn't exist
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS testimonials (
        id SERIAL PRIMARY KEY,
        client_name VARCHAR(255) NOT NULL,
        client_company VARCHAR(255),
        testimonial_text TEXT NOT NULL,
        rating INTEGER DEFAULT 5,
        project_type VARCHAR(100),
        image_url VARCHAR(500),
        is_featured BOOLEAN DEFAULT false,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
      )
    `);

    console.log("Database column fixes completed successfully");
    return true;
  } catch (error) {
    console.error("Error fixing database columns:", error);
    return false;
  }
}