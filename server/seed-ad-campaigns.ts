import { db } from "./db";
import { adCampaigns, adContents, platformPreviews, adTemplates, users } from "@shared/schema";
import { eq } from "drizzle-orm";

// This function seeds the database with sample ad campaigns and content
export async function seedAdCampaigns() {
  console.log("Starting to seed ad campaigns data...");
  try {
    // Short-circuit if no admin user exists (e.g. fresh deploy) to avoid FK violations
    const [adminUser] = await db.select({ id: users.id }).from(users).where(eq(users.isAdmin, true));
    if (!adminUser) {
      console.log("No admin user found; skipping ad campaigns seed to avoid FK violations.");
      return { status: 'skipped_no_admin' as const };
    }

    // Check if ad campaigns data already exists
    const existingCampaigns = await db.select().from(adCampaigns);
    if (existingCampaigns.length > 0) {
      console.log("Ad campaigns already exist, skipping seeding");
      return;
    }

    // Create sample campaigns
    const campaigns = await db
      .insert(adCampaigns)
      .values([
        {
          userId: adminUser.id,
          name: "Summer Drone Services Promotion",
          platform: "Facebook",
          objectives: "Increase visibility of real estate aerial services",
          targetAudience: {
            ageRange: [25, 55],
            locations: ["California"],
            interests: ["Real Estate", "Photography", "Drones", "Home Buying"],
            demographics: { gender: "All" }
          },
          budget: "500",
          status: "active",
          startDate: new Date(),
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        },
        {
          userId: adminUser.id,
          name: "Construction Progress Monitoring",
          platform: "LinkedIn",
          objectives: "Target construction companies",
          targetAudience: {
            ageRange: [30, 65],
            locations: ["National"],
            interests: ["Construction", "Project Management", "Engineering", "Architecture"],
            demographics: { gender: "All" }
          },
          budget: "750",
          status: "active",
          startDate: new Date(),
          endDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days from now
        },
        {
          userId: adminUser.id,
          name: "Wedding Aerial Photography",
          platform: "Instagram",
          objectives: "Showcase wedding photography services",
          targetAudience: {
            ageRange: [22, 40],
            locations: ["Regional"],
            interests: ["Weddings", "Photography", "Engagement", "Venues"],
            demographics: { gender: "All" }
          },
          budget: "350",
          status: "draft",
          startDate: new Date(),
          endDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000), // 45 days from now
        }
      ])
      .returning();

    console.log(`Created ${campaigns.length} sample campaigns`);

    // Create sample ad content for each campaign
    for (const campaign of campaigns) {
      const contentItems = [
        {
          campaignId: campaign.id,
          headline: `${campaign.name} - Primary Ad`,
          primaryText: `Stunning aerial photography and videography services for ${campaign.platform} audiences.`,
          description: `Our professional drones capture breathtaking perspectives you can't get any other way.`,
          callToAction: "BOOK_NOW",
          imageUrl: "https://images.unsplash.com/photo-1527977966376-1c8408f9f108?q=80&w=1480&auto=format&fit=crop",
          hashtags: ["#DronePhotography", "#AerialViews", "#ApolloServices"],
          adType: "image",
          keywords: ["drone photography", "aerial view", "professional"],
          performance: {
            impressions: 1200,
            clicks: 45,
            conversions: 3,
            engagement: 72
          }
        },
        {
          campaignId: campaign.id,
          headline: `${campaign.name} - Secondary Ad`,
          primaryText: `Professional-grade aerial imagery that sets your property or project apart.`,
          description: `Apollo DroneWorks delivers unmatched quality and reliability.`,
          callToAction: "LEARN_MORE",
          imageUrl: "https://images.unsplash.com/photo-1506947411487-a56738267384?q=80&w=1287&auto=format&fit=crop",
          hashtags: ["#ApolloQuality", "#DroneServices", "#AerialExperts"],
          adType: "image",
          keywords: ["quality", "reliability", "professional"],
          performance: {
            impressions: 850,
            clicks: 32,
            conversions: 2,
            engagement: 48
          }
        },
      ];

      const adContentResults = await db
        .insert(adContents)
        .values(contentItems)
        .returning();

      console.log(`Created ${adContentResults.length} content items for campaign: ${campaign.name}`);

      // Create platform previews for the first content item in each campaign
      if (adContentResults.length > 0) {
        const firstContent = adContentResults[0];
        
        const previewPlatforms = [
          {
            adContentId: firstContent.id,
            platform: "Facebook",
            previewImageUrl: "https://images.unsplash.com/photo-1506947411487-a56738267384?q=80&w=1287&auto=format&fit=crop",
            previewHtml: `<div class="fb-preview">${firstContent.headline}</div>`,
            dimensions: {
              width: 1200,
              height: 628,
              unit: "px"
            }
          },
          {
            adContentId: firstContent.id,
            platform: "Instagram",
            previewImageUrl: "https://images.unsplash.com/photo-1473968512647-3e447244af8f?q=80&w=1470&auto=format&fit=crop",
            previewHtml: `<div class="ig-preview">${firstContent.headline}</div>`,
            dimensions: {
              width: 1080,
              height: 1080,
              unit: "px"
            }
          },
          {
            adContentId: firstContent.id,
            platform: "LinkedIn",
            previewImageUrl: "https://images.unsplash.com/photo-1579829366248-204fe8413f31?q=80&w=1470&auto=format&fit=crop",
            previewHtml: `<div class="li-preview">${firstContent.headline}</div>`,
            dimensions: {
              width: 1200,
              height: 627,
              unit: "px"
            }
          },
          {
            adContentId: firstContent.id,
            platform: "Twitter",
            previewImageUrl: "https://images.unsplash.com/photo-1600320402387-0b99d7a5a3ea?q=80&w=1287&auto=format&fit=crop",
            previewHtml: `<div class="tw-preview">${firstContent.headline}</div>`,
            dimensions: {
              width: 1600,
              height: 900,
              unit: "px"
            }
          }
        ];

        const previews = await db
          .insert(platformPreviews)
          .values(previewPlatforms)
          .returning();

        console.log(`Created ${previews.length} platform previews for content: ${firstContent.headline}`);
      }
    }

    // Create sample templates
    const templates = await db
      .insert(adTemplates)
      .values([
        {
          userId: adminUser.id,
          name: "Real Estate Showcase",
          category: "real_estate",
          structure: {
            headline: "Showcase Your Property From Above",
            primaryText: "Elevate your property listings with stunning aerial photography.",
            description: "Our drone services capture your property's true potential with breathtaking perspectives.",
            callToAction: "BOOK_NOW",
            hashtags: ["#RealEstate", "#DronePhotography", "#PropertyMarketing"]
          },
          samplePreview: "https://images.unsplash.com/photo-1470723710355-95304d8aece4"
        },
        {
          userId: adminUser.id,
          name: "Construction Progress",
          category: "construction",
          structure: {
            headline: "Monitor Your Project's Progress",
            primaryText: "Keep stakeholders informed with regular aerial progress monitoring.",
            description: "Track development, identify issues early, and maintain complete documentation of your project.",
            callToAction: "LEARN_MORE",
            hashtags: ["#Construction", "#ProjectMonitoring", "#Drones"]
          },
          samplePreview: "https://images.unsplash.com/photo-1541888946425-d81bb19240f5"
        },
        {
          userId: adminUser.id,
          name: "Event Highlight",
          category: "events",
          structure: {
            headline: "Capture Your Event From Every Angle",
            primaryText: "Make your special day memorable with spectacular aerial footage.",
            description: "Our professional drone operators create stunning visuals that bring your event to life.",
            callToAction: "CONTACT_US",
            hashtags: ["#EventPhotography", "#AerialCoverage", "#SpecialMoments"]
          },
          samplePreview: "https://images.unsplash.com/photo-1511578314322-379afb476865"
        }
      ])
      .returning();

    console.log(`Created ${templates.length} ad templates`);
    
    console.log("Ad campaigns seeding completed successfully");
    return { campaigns, templates };
  } catch (error) {
    console.error("Error seeding ad campaigns:", error);
    throw error;
  }
}