import {
  pgTable,
  serial,
  varchar,
  text,
  decimal,
  integer,
  boolean,
  timestamp,
  jsonb,
  date
} from "drizzle-orm/pg-core";

// AI Pricing Suggestions
export const aiPricingSuggestions = pgTable("ai_pricing_suggestions", {
  id: serial("id").primaryKey(),
  serviceName: varchar("service_name", { length: 255 }).notNull(),
  currentPrice: varchar("current_price", { length: 50 }).notNull(),
  suggestedPrice: varchar("suggested_price", { length: 50 }).notNull(),
  confidence: varchar("confidence", { length: 50 }).notNull(), // high, medium, low
  reasoning: text("reasoning"),
  marketFactors: jsonb("market_factors"), // { competition, demand, seasonality, location }
  isApplied: boolean("is_applied").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// Subscription Plans
export const subscriptionPlans = pgTable("subscription_plans", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  billingCycle: varchar("billing_cycle", { length: 50 }).notNull(), // monthly, yearly
  features: jsonb("features"), // array of feature strings
  isActive: boolean("is_active").default(true),
  displayOrder: integer("display_order").default(0),
  createdAt: timestamp("created_at").defaultNow()
});

// Expedited Service Slots
export const expeditedSlots = pgTable("expedited_slots", {
  id: serial("id").primaryKey(),
  weekStarting: varchar("week_starting", { length: 50 }).notNull(),
  weekEnding: varchar("week_ending", { length: 50 }).notNull(),
  available: boolean("available").default(true),
  reason: text("reason"),
  createdAt: timestamp("created_at").defaultNow()
});

// Rush Order Pricing
export const rushOrderPricing = pgTable("rush_order_pricing", {
  id: serial("id").primaryKey(),
  serviceId: integer("service_id").notNull(),
  rushMultiplier: decimal("rush_multiplier", { precision: 5, scale: 2 }).notNull(), // 1.5x, 2.0x etc
  minimumNoticeHours: integer("minimum_notice_hours").notNull(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow()
});

// Geographic Pricing Zones
export const pricingZones = pgTable("pricing_zones", {
  id: serial("id").primaryKey(),
  zoneName: varchar("zone_name", { length: 255 }).notNull(),
  description: text("description"),
  priceMultiplier: decimal("price_multiplier", { precision: 5, scale: 2 }).notNull(),
  zipCodes: jsonb("zip_codes"), // array of zip codes
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow()
});

// Bulk Discount Rules
export const bulkDiscounts = pgTable("bulk_discounts", {
  id: serial("id").primaryKey(),
  serviceId: integer("service_id").notNull(),
  minQuantity: integer("min_quantity").notNull(),
  discountPercentage: decimal("discount_percentage", { precision: 5, scale: 2 }).notNull(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow()
});

// Type exports
export type AIPricingSuggestion = typeof aiPricingSuggestions.$inferSelect;
export type InsertAIPricingSuggestion = typeof aiPricingSuggestions.$inferInsert;

export type SubscriptionPlan = typeof subscriptionPlans.$inferSelect;
export type InsertSubscriptionPlan = typeof subscriptionPlans.$inferInsert;

export type ExpeditedSlot = typeof expeditedSlots.$inferSelect;
export type InsertExpeditedSlot = typeof expeditedSlots.$inferInsert;

export type RushOrderPricing = typeof rushOrderPricing.$inferSelect;
export type InsertRushOrderPricing = typeof rushOrderPricing.$inferInsert;

export type PricingZone = typeof pricingZones.$inferSelect;
export type InsertPricingZone = typeof pricingZones.$inferInsert;

export type BulkDiscount = typeof bulkDiscounts.$inferSelect;
export type InsertBulkDiscount = typeof bulkDiscounts.$inferInsert;