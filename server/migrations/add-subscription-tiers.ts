import { db } from "../db";
import { services, subscriptionTiers } from "@shared/schema";
import { sql } from "drizzle-orm";

export async function migrateTiers() {
  console.log("Starting subscription tiers migration...");

  try {
    // Create the subscription_tiers table if it doesn't exist
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS subscription_tiers (
        id SERIAL PRIMARY KEY,
        service_id INTEGER NOT NULL REFERENCES services(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        description TEXT,
        price INTEGER NOT NULL DEFAULT 0,
        frequency TEXT NOT NULL DEFAULT 'monthly',
        features JSONB DEFAULT '[]',
        is_popular BOOLEAN DEFAULT false,
        display_order INTEGER DEFAULT 100,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );
    `);

    console.log("Subscription tiers table created successfully");

    // Create an index on service_id for performance
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_subscription_tiers_service_id ON subscription_tiers(service_id);
    `);

    console.log("Subscription tiers index created successfully");

    // Migrate existing subscription data from services to tiers
    // First, check for services with isSubscription set to true
    const subscriptionServices = await db
      .select({
        id: services.id,
        name: services.name,
        monthlyPrice: services.monthlyPrice,
        weeklyPrice: services.weeklyPrice,
        billingFrequency: services.billingFrequency,
        frequencyDetails: services.frequencyDetails
      })
      .from(services)
      .where(sql`${services.isSubscription} = true`);

    console.log(`Found ${subscriptionServices.length} services with subscription enabled`);

    // For each service with subscriptions, create tiers based on existing data
    for (const service of subscriptionServices) {
      // Check if a tier already exists for this service
      const existingTiers = await db
        .select({ id: subscriptionTiers.id })
        .from(subscriptionTiers)
        .where(sql`${subscriptionTiers.serviceId} = ${service.id}`);

      // Only create tiers if none exist yet
      if (existingTiers.length === 0) {
        if (service.monthlyPrice && service.monthlyPrice > 0) {
          await db.insert(subscriptionTiers).values({
            serviceId: service.id,
            name: "Monthly Plan",
            description: service.frequencyDetails || `Monthly subscription for ${service.name}`,
            price: service.monthlyPrice,
            frequency: "monthly",
            features: [],
            isPopular: service.billingFrequency === "monthly",
            displayOrder: 10
          });
          console.log(`Created monthly tier for service: ${service.name}`);
        }

        if (service.weeklyPrice && service.weeklyPrice > 0) {
          await db.insert(subscriptionTiers).values({
            serviceId: service.id,
            name: "Weekly Plan",
            description: service.frequencyDetails || `Weekly subscription for ${service.name}`,
            price: service.weeklyPrice,
            frequency: "weekly",
            features: [],
            isPopular: service.billingFrequency === "weekly",
            displayOrder: 20
          });
          console.log(`Created weekly tier for service: ${service.name}`);
        }
      } else {
        console.log(`Service ${service.name} already has ${existingTiers.length} subscription tiers, skipping migration`);
      }
    }

    console.log("Subscription tiers migration completed successfully");
    return true;
  } catch (error) {
    console.error("Error during subscription tiers migration:", error);
    throw error;
  }
}