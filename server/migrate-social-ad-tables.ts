import { db } from "./db";
import { adCampaigns, adContents, platformPreviews, adTemplates, campaignAnalytics, publishingSchedules } from "@shared/schema";
import { sql } from "drizzle-orm";

export async function createSocialAdTables() {
  console.log("Creating social media ad campaign tables...");
  
  try {
    // Create ad_campaigns table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "ad_campaigns" (
        "id" SERIAL PRIMARY KEY,
        "user_id" INTEGER NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "name" TEXT NOT NULL,
        "platform" TEXT NOT NULL,
        "status" TEXT NOT NULL DEFAULT 'draft',
        "start_date" DATE,
        "end_date" DATE,
        "budget" NUMERIC,
        "target_audience" JSONB,
        "objectives" TEXT,
        "platform_ad_id" TEXT,
        "performance" JSONB,
        "created_at" TIMESTAMP DEFAULT NOW() NOT NULL,
        "updated_at" TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `);
    console.log("Ad campaigns table created successfully");

    // Create ad_contents table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "ad_contents" (
        "id" SERIAL PRIMARY KEY,
        "campaign_id" INTEGER NOT NULL REFERENCES "ad_campaigns"("id") ON DELETE CASCADE,
        "ad_type" TEXT NOT NULL DEFAULT 'image',
        "headline" TEXT NOT NULL,
        "primary_text" TEXT NOT NULL,
        "description" TEXT,
        "call_to_action" TEXT NOT NULL DEFAULT 'LEARN_MORE',
        "image_url" TEXT,
        "keywords" JSONB DEFAULT '[]',
        "hashtags" JSONB DEFAULT '[]',
        "performance" JSONB,
        "ai_prompt" TEXT,
        "ai_generated_content" JSONB,
        "is_template" BOOLEAN DEFAULT FALSE,
        "template_name" TEXT,
        "template_category" TEXT,
        "created_at" TIMESTAMP DEFAULT NOW() NOT NULL,
        "updated_at" TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `);
    console.log("Ad contents table created successfully");

    // Create platform_previews table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "platform_previews" (
        "id" SERIAL PRIMARY KEY,
        "ad_content_id" INTEGER NOT NULL REFERENCES "ad_contents"("id") ON DELETE CASCADE,
        "platform" TEXT NOT NULL,
        "preview_image_url" TEXT,
        "preview_html" TEXT,
        "dimensions" JSONB,
        "created_at" TIMESTAMP DEFAULT NOW() NOT NULL,
        "updated_at" TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `);
    console.log("Platform previews table created successfully");

    // Create ad_templates table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "ad_templates" (
        "id" SERIAL PRIMARY KEY,
        "user_id" INTEGER NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "name" TEXT NOT NULL,
        "category" TEXT NOT NULL DEFAULT 'general',
        "structure" JSONB NOT NULL,
        "sample_preview" TEXT,
        "created_at" TIMESTAMP DEFAULT NOW() NOT NULL,
        "updated_at" TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `);
    console.log("Ad templates table created successfully");

    // Create campaign_analytics table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "campaign_analytics" (
        "id" SERIAL PRIMARY KEY,
        "campaign_id" INTEGER NOT NULL REFERENCES "ad_campaigns"("id") ON DELETE CASCADE,
        "date" DATE NOT NULL,
        "platform" TEXT NOT NULL,
        "impressions" INTEGER DEFAULT 0,
        "clicks" INTEGER DEFAULT 0,
        "click_through_rate" REAL,
        "engagement" INTEGER DEFAULT 0,
        "engagement_rate" REAL,
        "shares" INTEGER DEFAULT 0,
        "likes" INTEGER DEFAULT 0,
        "comments" INTEGER DEFAULT 0,
        "saves" INTEGER DEFAULT 0,
        "reach" INTEGER DEFAULT 0,
        "spend" NUMERIC DEFAULT 0,
        "cost_per_click" NUMERIC,
        "cost_per_impression" NUMERIC,
        "conversions" INTEGER DEFAULT 0,
        "conversion_rate" REAL,
        "cost_per_conversion" NUMERIC,
        "roi" REAL,
        "created_at" TIMESTAMP DEFAULT NOW() NOT NULL,
        "updated_at" TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `);
    console.log("Campaign analytics table created successfully");

    // Create publishing_schedules table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "publishing_schedules" (
        "id" SERIAL PRIMARY KEY,
        "user_id" INTEGER NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "name" TEXT NOT NULL,
        "content_ids" JSONB DEFAULT '[]',
        "platforms" JSONB DEFAULT '[]',
        "scheduled_date" DATE NOT NULL,
        "scheduled_time" TIME NOT NULL,
        "timezone" TEXT DEFAULT 'UTC',
        "status" TEXT NOT NULL DEFAULT 'scheduled',
        "publish_results" JSONB,
        "notify_email" BOOLEAN DEFAULT FALSE,
        "created_at" TIMESTAMP DEFAULT NOW() NOT NULL,
        "updated_at" TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `);
    console.log("Publishing schedules table created successfully");

    console.log("Social media ad campaign tables created successfully");
    return true;
  } catch (error) {
    console.error("Error creating social media ad campaign tables:", error);
    throw error;
  }
}