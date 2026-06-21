import { pgTable, text, serial, integer, boolean, timestamp, json, numeric, decimal, jsonb, date, real, varchar, time, unique, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").notNull().unique(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  phone: text("phone"),
  isAdmin: boolean("is_admin").default(false).notNull(),
  isPartnerAccount: boolean("is_partner_account").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const services = pgTable("services", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug"), // URL-friendly slug for service pages
  description: text("description").notNull(),
  tooltipDescription: text("tooltip_description"), // Short description for tooltips
  disclaimer: text("disclaimer"), // Service-specific disclaimer shown on service page and customer receipts
  price: integer("price").notNull(),
  imageUrl: text("image_url").notNull(),
  videoUrl: text("video_url"), // Optional video for the service
  videoPlayback: text("video_playback").default("hover"), // "autoplay", "hover", "click"
  images: jsonb("images").$type<string[]>().default([]), // Array of image URLs for carousel
  videos: jsonb("videos").$type<string[]>().default([]), // Array of video URLs for carousel
  features: jsonb("features").$type<string[]>().default([]),
  keywords: jsonb("keywords").$type<string[]>().default([]),
  displayOrder: integer("display_order").default(999),
  classification: text("classification").default("Revenue Generation"), // "Revenue Generation" or "Overhead Reduction"
  category: text("category"), // "Real Estate & Marketing" | "Property Inspections" | "Mapping & Modeling"
  folderStructure: text("folder_structure").array().default([]), // Ordered list of delivery folder names
  aboutServiceContent: text("about_service_content"), // Add content for "About This Service" section
  whatsIncludedContent: jsonb("whats_included_content").$type<string[]>().default([]), // Add content for "What's Included" section
  possibilities: jsonb("possibilities").$type<Array<{title: string, description: string}>>().default([]), // Possibilities section with title:description format
  processSteps: jsonb("process_steps").$type<Array<{title: string, description: string}>>().default([]), // Process step details for service page
  // Subscription-related fields
  isSubscription: boolean("is_subscription").default(false),
  weeklySubscriptionEnabled: boolean("weekly_subscription_enabled").default(false),
  weeklyPrice: integer("weekly_price").default(0), // Price for weekly subscription
  weeklyPriceType: text("weekly_price_type").default("fixed"), // "fixed" or "percentage"
  weeklyPercentage: integer("weekly_percentage").default(0), // Percentage of base price
  biWeeklySubscriptionEnabled: boolean("bi_weekly_subscription_enabled").default(false),
  biWeeklyPrice: integer("bi_weekly_price").default(0), // Price for bi-weekly subscription
  biWeeklyPriceType: text("bi_weekly_price_type").default("fixed"), // "fixed" or "percentage"
  biWeeklyPercentage: integer("bi_weekly_percentage").default(0), // Percentage of base price
  monthlySubscriptionEnabled: boolean("monthly_subscription_enabled").default(false),
  monthlyPrice: integer("monthly_price").default(0), // Price for monthly subscription
  monthlyPriceType: text("monthly_price_type").default("fixed"), // "fixed" or "percentage"
  monthlyPercentage: integer("monthly_percentage").default(0), // Percentage of base price
  billingFrequency: text("billing_frequency").default("monthly"), // Comma-separated: "weekly", "monthly", "biweekly", etc.
  frequencyDetails: text("frequency_details"), // E.g., "1 update per week", "2 visits per month", etc.
  // Flexible pricing options
  pricingType: text("pricing_type").default("flat"), // "flat", "tiered", "per_unit", "range_based"
  unitType: text("unit_type").default("unit"), // "acre", "square_foot", "unit" - for per_unit pricing
  basePriceQuantity: integer("base_price_quantity").default(1), // Quantity included in base price
  additionalPricePerUnit: integer("additional_price_per_unit").default(0), // Price per additional unit
  pricingDescription: text("pricing_description"), // Human-readable pricing explanation
  priceRanges: jsonb("price_ranges").$type<Array<{
    minValue: number;
    maxValue?: number;
    minPrice: number;
    maxPrice?: number;
    label: string;
  }>>().default([]), // For range-based pricing
  // Tiered pricing system
  pricingTiers: jsonb("pricing_tiers").$type<Array<{
    name?: string;
    // ── Classifier fields used by complex services ────────────────────────────
    // For Foundation to Finish: which phase this tier represents
    phase?: number | string;
    // For Construction Monitoring/Timelapse: "progress" or "timelapse"
    style?: string;
    // For Construction Monitoring/Timelapse: "standard" or "premium"
    tier?: string;
    // For 3D Digital Twin: "indoor" | "indoor_large" | "outdoor_standard" | "outdoor_premium"
    scope?: string;
    // For Standard/Premium services: premium price alongside base price
    premiumPrice?: number;
    // For Cinematic Timelapse: recommended minimum visit count
    minRecommendedVisits?: number;
    // ── Legacy single-deliverable fields ─────────────────────────────────────
    minQuantity?: number;
    maxQuantity?: number;
    exactQuantity?: number;
    quantityType?: "range" | "exact";
    quantityUnit?: string;
    deliverables?: Array<{
      name?: string;
      quantityType: "range" | "exact";
      exactQuantity?: number;
      minQuantity?: number;
      maxQuantity?: number;
      quantityUnit?: string;
    }>;
    price: number;
    priceType: "fixed" | "range" | "quote";
    minPrice?: number;
    maxPrice?: number;
    description?: string;
    features?: string[];
    isPopular?: boolean;
    displayOrder?: number;
  }>>().default([]), // For tiered pricing
  // Bundle pricing system
  bundleDiscountPercentage: integer("bundle_discount_percentage").default(0), // Percentage discount when bundled with other services
  availableAddOns: jsonb("available_add_ons").$type<number[]>().default([]), // Array of service IDs that can be bundled with this service
  // Deprecated fields - will be replaced by serviceAddons table
  isAvailableAsAddon: boolean("is_available_as_addon").default(false), 
  addonPrice: integer("addon_price").default(0),
  // Service-specific bundle configurations for pricing relationships
  bundleConfigurations: jsonb("bundle_configurations").$type<Array<{
    serviceId: number;
    discountPercentage?: number;
    customPrice?: number;
  }>>().default([]), // Array of service-specific bundle pricing rules
  // Regional badge
  featuredBadge: boolean("featured_badge").notNull().default(false), // Show "Serving Southern Utah" badge on service card
  // Public visibility control
  hideFromServicesPage: boolean("hide_from_services_page").default(false), // Hide from public services page (for add-on only services)
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// New table for service add-ons
export const serviceAddons = pgTable("service_addons", {
  id: serial("id").primaryKey(),
  serviceId: integer("service_id").notNull().references(() => services.id, { onDelete: 'cascade' }),
  addonId: integer("addon_id").references(() => services.id, { onDelete: 'cascade' }), // Reference to the addon service
  isEnabled: boolean("is_enabled").notNull().default(false),
  customPrice: integer("custom_price"), // Custom price override
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// New table for individual service bundle percentages
export const serviceBundleDiscounts = pgTable("service_bundle_discounts", {
  id: serial("id").primaryKey(),
  primaryServiceId: integer("primary_service_id").notNull().references(() => services.id, { onDelete: 'cascade' }),
  secondaryServiceId: integer("secondary_service_id").notNull().references(() => services.id, { onDelete: 'cascade' }),
  discountPercentage: integer("discount_percentage").notNull().default(0), // Percentage discount for this specific bundle
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// New table for service subscription tiers
export const subscriptionTiers = pgTable("subscription_tiers", {
  id: serial("id").primaryKey(),
  serviceId: integer("service_id").notNull().references(() => services.id, { onDelete: 'cascade' }),
  name: text("name").notNull(), // e.g., "Basic", "Standard", "Premium"
  description: text("description"), // Detailed description of this tier
  price: integer("price").notNull().default(0), // Price in cents
  frequency: text("frequency").notNull().default("monthly"), // "weekly", "monthly", "quarterly", "annually"
  features: json("features").$type<string[]>().default([]), // Features specific to this tier
  isPopular: boolean("is_popular").default(false), // Highlight as a popular choice
  displayOrder: integer("display_order").default(100), // For ordering tiers on the page
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// NOTE: The legacy `pricing_tiers` table was removed. Service packages now live
// exclusively on the `services.pricing_tiers` JSONB column edited via the admin
// services editor. See `services.pricingTiers` above for the canonical shape.

export const subscriptionTiersRelations = relations(subscriptionTiers, ({ one }) => ({
  service: one(services, {
    fields: [subscriptionTiers.serviceId],
    references: [services.id]
  })
}));

export const insertSubscriptionTierSchema = createInsertSchema(subscriptionTiers).pick({
  serviceId: true,
  name: true,
  description: true,
  price: true,
  frequency: true,
  features: true,
  isPopular: true,
  displayOrder: true,
});

export const bookings = pgTable("bookings", {
  id: serial("id").primaryKey(),
  userId: integer("user_id"),
  serviceId: integer("service_id").references(() => services.id, { onDelete: "restrict" }),
  tierId: integer("tier_id"),
  customerName: text("customer_name"),
  customerEmail: text("customer_email"),
  customerPhone: text("customer_phone"),
  projectLocation: text("project_location"),
  scheduledDate: timestamp("scheduled_date"),
  estimatedDuration: text("estimated_duration"),
  priority: text("priority").default("normal"),
  status: text("status").notNull().default("pending"),
  totalAmount: numeric("total_amount"),
  depositAmount: numeric("deposit_amount"),
  paymentStatus: text("payment_status").default("unpaid"),
  specialRequirements: text("special_requirements"),
  equipmentRequests: text("equipment_requests"),
  weatherBackupDate: timestamp("weather_backup_date"),
  notes: text("notes"),
  pilotAssigned: text("pilot_assigned"),
  flightPlan: text("flight_plan"),
  safetyChecklist: text("safety_checklist"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
  cancelledAt: timestamp("cancelled_at"),
  projectId: integer("project_id"),
  projectName: text("project_name"),
  selectedServices: json("selected_services").$type<number[]>().default([]),
  date: timestamp("date"),
  creditAmount: integer("credit_amount").default(0),
  creditSourceBookingId: integer("credit_source_booking_id"),
});

export const galleries = pgTable("galleries", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  bookingId: integer("booking_id"),
  name: text("name").notNull(),
  type: text("type").notNull(),
  url: text("url").notNull(),
  isPublic: boolean("is_public").default(false).notNull(),
  category: text("category").default("uncategorized"),
  tags: json("tags").$type<string[]>().default([]),
  description: text("description"),
  publicDescription: text("public_description"),
  thumbnail: text("thumbnail"),
  keywords: json("keywords").$type<string[]>().default([]),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const beforeAfterImages = pgTable("before_after_images", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  beforeImageUrl: text("before_image_url").notNull(),
  afterImageUrl: text("after_image_url").notNull(),
  isPublic: boolean("is_public").default(true).notNull(),
  serviceId: integer("service_id"),
  keywords: json("keywords").$type<string[]>().default([]),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const blogPosts = pgTable("blog_posts", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  imageUrl: text("image_url").notNull(),
  category: text("category").notNull(),
  excerpt: text("excerpt").notNull(),
  keywords: json("keywords").$type<string[]>().default([]),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const testimonials = pgTable("testimonials", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  company: text("company"),
  content: text("content").notNull(),
  rating: integer("rating").notNull(),
  projectType: text("project_type"),
  imageUrl: text("image_url"),
  isApproved: boolean("is_approved").default(false).notNull(),
  isFeatured: boolean("is_featured").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const contactMessages = pgTable("contact_messages", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  message: text("message").notNull(),
  status: text("status").default("unread").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Business config for persistent business costs
export const businessConfig = pgTable("business_config", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().default("default"),
  depreciableAssets: numeric("depreciable_assets").default("10000"),
  targetMissionsPerWeek: numeric("target_missions_per_week").default("3"),
  targetReinvestmentYears: numeric("target_reinvestment_years").default("2"),
  yearlyAdvertisementCost: numeric("yearly_advertisement_cost").default("2000"),
  yearlyInsuranceCost: numeric("yearly_insurance_cost").default("1500"),
  yearlySoftwareSubscriptionsCost: numeric("yearly_software_subscriptions_cost").default("0"),
  taxPercentage: numeric("tax_percentage").default("8.25"),
  customCosts: json("custom_costs").$type<{name: string, yearlyCost: number}[]>().default([]),
  // Per-mission overhead costs
  equipmentDepreciation: numeric("equipment_depreciation"),
  batteryUsage: numeric("battery_usage"),
  insurance: numeric("insurance"),
  transportation: numeric("transportation"),
  // Auto mode settings for analytics-driven cost calculations
  useAutoEquipmentDepreciation: boolean("use_auto_equipment_depreciation").default(false),
  useAutoBatteryUsage: boolean("use_auto_battery_usage").default(false),
  useAutoInsurance: boolean("use_auto_insurance").default(false),
  useAutoTransportation: boolean("use_auto_transportation").default(false),
  useAutoTaxPercentage: boolean("use_auto_tax_percentage").default(false),
  // Auto-calculated values from analytics
  autoEquipmentDepreciation: numeric("auto_equipment_depreciation"),
  autoBatteryUsage: numeric("auto_battery_usage"),
  autoInsurance: numeric("auto_insurance"),
  autoTransportation: numeric("auto_transportation"),
  autoTaxPercentage: numeric("auto_tax_percentage"),
  // Admin-configurable discount percentages
  bundleDiscountPercentage: numeric("bundle_discount_percentage").default("25"), // 3D Digital Twin combo + Foundation to Finish
  partnerDiscountPercentage: numeric("partner_discount_percentage").default("10"), // Partner account checkout discount
  // Single global disclaimer shown on every shareable-link interstitial.
  // Not per-service and not per-customer — applies to all shareable links.
  shareableLinkDisclaimer: text("shareable_link_disclaimer"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Social media connections and auth tokens
export const socialMediaAccounts = pgTable("social_media_accounts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: 'cascade' }).notNull(),
  platform: text("platform").notNull(), // 'facebook', 'instagram', 'twitter'
  accountId: text("account_id").notNull(),
  accountName: text("account_name").notNull(),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  tokenExpiry: timestamp("token_expiry"),
  connected: boolean("connected").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Social media posts
export const socialPosts = pgTable("social_posts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: 'cascade' }).notNull(),
  content: text("content").notNull(),
  mediaUrl: text("media_url"),
  mediaType: text("media_type"), // 'image', 'video', null for text-only
  keywords: json("keywords").$type<string[]>().default([]),
  scheduledFor: timestamp("scheduled_for"),
  published: boolean("published").default(false).notNull(),
  publishedTo: jsonb("published_to").$type<string[]>().default([]),
  blogPostId: integer("blog_post_id"),
  platform: text("platform"), // 'instagram', 'facebook', 'twitter'
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const quotes = pgTable("quotes", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  clientName: text("client_name").notNull(),
  clientEmail: text("client_email").default(""),
  projectName: text("project_name").notNull(),
  projectDescription: text("project_description").default(""),
  dateCreated: timestamp("date_created").defaultNow().notNull(),
  expiryDate: timestamp("expiry_date").notNull(),
  status: text("status").default("draft").notNull(),
  notes: text("notes").default(""),
  
  // Complex JSON/JSONB fields
  businessInfo: json("business_info").$type<{
    name: string,
    address: string,
    state: string,
    zip: string,
    phone: string,
    website: string,
    quoteValidity: number
  }>(),
  timeEstimates: json("time_estimates").$type<{activity: string, hours: number, rate: number}[]>(),
  personnel: json("personnel").$type<{role: string, hourlyRate: number, quantity: number}[]>(),
  equipment: json("equipment").$type<{name: string, hourlyRate: number, included: boolean, quantity: number}[]>(),
  expenses: json("expenses").$type<{
    name: string, 
    cost: number, 
    expenseType: string, 
    mileage?: number, 
    costPerMile?: number, 
    travelSpeed?: number,
    quantity?: number,
    unitPrice?: number
  }[]>(),
  thirdPartyProducts: json("third_party_products").$type<{name: string, cost: number, expenseType: string}[]>(),
  
  // Delivery time
  deliveryTimeHours: numeric("delivery_time_hours").default("48"),
  
  // Business costs stored separately
  businessCosts: json("business_costs").$type<{
    depreciableAssets: number,
    targetMissionsPerWeek: number,
    targetReinvestmentYears: number,
    yearlyAdvertisementCost: number,
    yearlyInsuranceCost: number
  }>(),
  
  // Profitability metrics
  profitabilityMetrics: json("profitability_metrics").$type<{
    depreciableAssetsSplit: number,
    advertisementSplit: number,
    insuranceSplit: number
  }>(),
  
  // Final calculations
  totalAmount: numeric("total_amount").default("0"),
  
  // Legacy fields that exist in the database but have been migrated to JSONB
  depreciableAssets: numeric("depreciable_assets"),
  targetMissionsPerWeek: numeric("target_missions_per_week"),
  targetReinvestmentYears: numeric("target_reinvestment_years"),
  yearlyAdvertisementCost: numeric("yearly_advertisement_cost"),
  yearlyInsuranceCost: numeric("yearly_insurance_cost"),
  
  // String versions of metrics for display purposes
  depreciableAssetsSplit: text("depreciable_assets_split"),
  advertisementSplit: text("advertisement_split"),
  insuranceSplit: text("insurance_split"),
  netProfit: text("net_profit"),
  
  // Standard timestamps
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  email: true,
  firstName: true,
  lastName: true,
  phone: true,
  isAdmin: true,
});

export const insertServiceSchema = createInsertSchema(services).pick({
  name: true,
  description: true,
  tooltipDescription: true,
  disclaimer: true,
  price: true,
  imageUrl: true,
  videoUrl: true,
  videoPlayback: true,
  features: true,
  keywords: true,
  displayOrder: true,
  classification: true,
  aboutServiceContent: true,
  whatsIncludedContent: true,
  possibilities: true,
  processSteps: true,
  // Subscription-related fields
  isSubscription: true,
  weeklySubscriptionEnabled: true,
  weeklyPrice: true,
  weeklyPriceType: true,
  weeklyPercentage: true,
  biWeeklySubscriptionEnabled: true,
  biWeeklyPrice: true,
  biWeeklyPriceType: true,
  biWeeklyPercentage: true,
  monthlySubscriptionEnabled: true,
  monthlyPrice: true,
  monthlyPriceType: true,
  monthlyPercentage: true,
  billingFrequency: true,
  frequencyDetails: true,
  // Flexible pricing options
  pricingType: true,
  unitType: true,
  basePriceQuantity: true,
  additionalPricePerUnit: true,
  pricingDescription: true,
  priceRanges: true,
  // Bundle pricing fields
  bundleDiscountPercentage: true,
  bundleConfigurations: true,
  availableAddOns: true,
  // Pricing tiers
  pricingTiers: true,
  // Deprecated fields
  isAvailableAsAddon: true,
  addonPrice: true,
  // Regional badge
  featuredBadge: true,
  // Visibility control
  hideFromServicesPage: true,
  // Service category & folder structure
  category: true,
  folderStructure: true,
});

// Create a base schema then customize the date field to accept both Date and string
const baseBookingSchema = createInsertSchema(bookings).pick({
  userId: true,
  serviceId: true,
  tierId: true,
  customerName: true,
  customerEmail: true,
  customerPhone: true,
  projectLocation: true,
  scheduledDate: true,
  estimatedDuration: true,
  priority: true,
  status: true,
  totalAmount: true,
  depositAmount: true,
  paymentStatus: true,
  specialRequirements: true,
  equipmentRequests: true,
  weatherBackupDate: true,
  notes: true,
  pilotAssigned: true,
  flightPlan: true,
  safetyChecklist: true,
  projectId: true,
  projectName: true,
  selectedServices: true,
  date: true,
});

// Customize to accept string or Date for the date field
export const insertBookingSchema = baseBookingSchema.extend({
  scheduledDate: z.preprocess(
    (arg) => typeof arg === 'string' ? new Date(arg) : arg,
    z.date().optional()
  ),
  date: z.preprocess(
    (arg) => typeof arg === 'string' ? new Date(arg) : arg,
    z.date().optional()
  )
});

export const insertGallerySchema = createInsertSchema(galleries).pick({
  userId: true,
  bookingId: true,
  name: true,
  type: true,
  url: true,
  isPublic: true,
  category: true,
  tags: true,
  description: true,
  publicDescription: true,
  thumbnail: true,
  keywords: true,
});

export const insertBeforeAfterImageSchema = createInsertSchema(beforeAfterImages).pick({
  title: true,
  description: true,
  beforeImageUrl: true,
  afterImageUrl: true,
  isPublic: true,
  serviceId: true,
  keywords: true,
});

export const insertBlogPostSchema = createInsertSchema(blogPosts).pick({
  title: true,
  content: true,
  imageUrl: true,
  category: true,
  excerpt: true,
  keywords: true,
});

export const insertTestimonialSchema = createInsertSchema(testimonials).pick({
  name: true,
  company: true,
  content: true,
  rating: true,
  isApproved: true,
});

export const insertContactMessageSchema = createInsertSchema(contactMessages).pick({
  name: true,
  email: true,
  phone: true,
  message: true,
  status: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertService = z.infer<typeof insertServiceSchema>;
export type Service = typeof services.$inferSelect;

export type InsertBooking = z.infer<typeof insertBookingSchema>;
export type Booking = typeof bookings.$inferSelect;

export type InsertGallery = z.infer<typeof insertGallerySchema>;
export type Gallery = typeof galleries.$inferSelect;

export type InsertBeforeAfterImage = z.infer<typeof insertBeforeAfterImageSchema>;
export type BeforeAfterImage = typeof beforeAfterImages.$inferSelect;

export type InsertBlogPost = z.infer<typeof insertBlogPostSchema>;
export type BlogPost = typeof blogPosts.$inferSelect;

export type InsertTestimonial = z.infer<typeof insertTestimonialSchema>;
export type Testimonial = typeof testimonials.$inferSelect;

export type InsertContactMessage = z.infer<typeof insertContactMessageSchema>;
export type ContactMessage = typeof contactMessages.$inferSelect;

// Service Add-ons schema
export const insertServiceAddonSchema = createInsertSchema(serviceAddons).pick({
  serviceId: true,
  addonId: true,
  isEnabled: true,
  customPrice: true,
});

export type InsertServiceAddon = z.infer<typeof insertServiceAddonSchema>;
export type ServiceAddon = typeof serviceAddons.$inferSelect;

// Quotes schema
const baseQuoteSchema = createInsertSchema(quotes).pick({
  userId: true,
  clientName: true,
  clientEmail: true,
  projectName: true,
  projectDescription: true,
  expiryDate: true,
  status: true,
  totalAmount: true,
  notes: true,
  deliveryTimeHours: true,
  
  // Complex JSONB fields
  businessInfo: true,
  timeEstimates: true,
  personnel: true,
  equipment: true,
  expenses: true,
  thirdPartyProducts: true,
  businessCosts: true,
  profitabilityMetrics: true,
  
  // Legacy fields (can be removed in future migrations)
  depreciableAssets: true,
  targetMissionsPerWeek: true,
  targetReinvestmentYears: true,
  yearlyAdvertisementCost: true,
  yearlyInsuranceCost: true,
  
  // String representations of calculated fields
  depreciableAssetsSplit: true,
  advertisementSplit: true,
  insuranceSplit: true,
  netProfit: true,
});

// Customize to accept string or Date for the expiryDate field
export const insertQuoteSchema = baseQuoteSchema.extend({
  expiryDate: z.preprocess(
    // Convert string to Date
    (arg) => typeof arg === 'string' ? new Date(arg) : arg,
    z.date()
  ),
  // Add aliases for fields sent by frontend with underscores
  business_info: z.any().optional(),
  time_estimates: z.any().optional(),
  third_party_products: z.any().optional()
});

export type InsertQuote = z.infer<typeof insertQuoteSchema>;
export type Quote = typeof quotes.$inferSelect;

// Business config schema
export const insertBusinessConfigSchema = createInsertSchema(businessConfig).pick({
  name: true,
  depreciableAssets: true,
  targetMissionsPerWeek: true,
  targetReinvestmentYears: true,
  yearlyAdvertisementCost: true,
  yearlyInsuranceCost: true,
  yearlySoftwareSubscriptionsCost: true,
  taxPercentage: true,
  customCosts: true,
  equipmentDepreciation: true,
  batteryUsage: true,
  insurance: true,
  transportation: true,
  useAutoEquipmentDepreciation: true,
  useAutoBatteryUsage: true,
  useAutoInsurance: true,
  useAutoTransportation: true,
  useAutoTaxPercentage: true,
  autoEquipmentDepreciation: true,
  autoBatteryUsage: true,
  autoInsurance: true,
  autoTransportation: true,
  autoTaxPercentage: true,
  shareableLinkDisclaimer: true,
});

export type InsertBusinessConfig = z.infer<typeof insertBusinessConfigSchema>;
export type BusinessConfig = typeof businessConfig.$inferSelect;

// Social media schemas
export const insertSocialMediaAccountSchema = createInsertSchema(socialMediaAccounts).pick({
  userId: true,
  platform: true,
  accountId: true,
  accountName: true,
  accessToken: true,
  refreshToken: true,
  tokenExpiry: true,
  connected: true,
});

export const insertSocialPostSchema = createInsertSchema(socialPosts).pick({
  userId: true,
  content: true,
  mediaUrl: true,
  mediaType: true,
  keywords: true,
  scheduledFor: true,
  published: true,
  publishedTo: true,
  blogPostId: true,
  platform: true,
});

// Social media types
export type InsertSocialMediaAccount = z.infer<typeof insertSocialMediaAccountSchema>;
export type SocialMediaAccount = typeof socialMediaAccounts.$inferSelect;

export type InsertSocialPost = z.infer<typeof insertSocialPostSchema>;
export type SocialPost = typeof socialPosts.$inferSelect;

// Ad Campaigns for social media advertising
export const adCampaigns = pgTable("ad_campaigns", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: text("name").notNull(),
  platform: text("platform").notNull(), // 'facebook', 'instagram', 'x'
  status: text("status").notNull().default("draft"), // draft, active, completed, paused
  startDate: date("start_date"),
  endDate: date("end_date"),
  budget: numeric("budget"),
  targetAudience: jsonb("target_audience").$type<{
    ageRange: number[],
    locations: string[],
    interests: string[],
    demographics: Record<string, any>
  }>(),
  objectives: text("objectives"), // awareness, consideration, conversion
  platformAdId: text("platform_ad_id"), // ID returned from the platform API
  performance: jsonb("performance").$type<{
    impressions: number,
    clicks: number,
    conversions: number,
    costPerClick: number,
    reach: number,
    engagement: number
  }>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});

// Ad Content for campaigns
export const adContents = pgTable("ad_contents", {
  id: serial("id").primaryKey(),
  campaignId: integer("campaign_id").notNull().references(() => adCampaigns.id, { onDelete: 'cascade' }),
  adType: text("ad_type").notNull().default("image"), // image, carousel, video
  headline: text("headline").notNull(),
  primaryText: text("primary_text").notNull(),
  description: text("description"),
  callToAction: text("call_to_action").notNull().default("LEARN_MORE"),
  imageUrl: text("image_url"),
  keywords: jsonb("keywords").$type<string[]>().default([]),
  hashtags: jsonb("hashtags").$type<string[]>().default([]),
  performance: jsonb("performance").$type<{
    impressions: number,
    clicks: number,
    conversions: number,
    engagement: number
  }>(),
  aiPrompt: text("ai_prompt"), // store the prompt used to generate
  aiGeneratedContent: jsonb("ai_generated_content").$type<{
    originalPrompt: string,
    variations: { headline: string, primaryText: string, description?: string }[]
  }>(),
  isTemplate: boolean("is_template").default(false), // To mark as reusable template
  templateName: text("template_name"), // Name for the template 
  templateCategory: text("template_category"), // promotion, seasonal, portfolio, etc.
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});

// Social platform API connections
export const platformConnections = pgTable("platform_connections", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  platform: text("platform").notNull(), // facebook, instagram, x
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  accountId: text("account_id"),
  businessAccountId: text("business_account_id"), // For Facebook/Instagram business accounts
  isConnected: boolean("is_connected").notNull().default(false),
  lastSynced: timestamp("last_synced"),
  tokenExpiry: timestamp("token_expiry"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});

// Ad Campaign Insert Schema
const baseAdCampaignSchema = createInsertSchema(adCampaigns).pick({
  userId: true,
  name: true,
  platform: true,
  status: true,
  startDate: true,
  endDate: true,
  budget: true,
  targetAudience: true,
  objectives: true,
  platformAdId: true,
  performance: true
});

// Extend the schema to handle empty budget strings
export const insertAdCampaignSchema = baseAdCampaignSchema.extend({
  budget: z.preprocess(
    // Convert empty string to null or keep a valid number/null
    (arg) => arg === '' ? null : arg, 
    z.number().nullable().optional()
  )
});

// Ad Content Insert Schema
export const insertAdContentSchema = createInsertSchema(adContents).pick({
  campaignId: true,
  adType: true,
  headline: true,
  primaryText: true,
  description: true,
  callToAction: true,
  imageUrl: true,
  keywords: true,
  hashtags: true,
  performance: true,
  aiPrompt: true,
  aiGeneratedContent: true,
});

// Ad content templates for reusable content
export const adTemplates = pgTable("ad_templates", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: text("name").notNull(),
  category: text("category").notNull().default("general"), // promotion, seasonal, portfolio, etc.
  structure: jsonb("structure").$type<{
    headline: string,
    primaryText: string,
    description?: string,
    callToAction?: string,
    hashtags?: string[]
  }>().notNull(),
  samplePreview: text("sample_preview"), // Image URL for template preview
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});

// Platform-specific ad previews
export const platformPreviews = pgTable("platform_previews", {
  id: serial("id").primaryKey(),
  adContentId: integer("ad_content_id").notNull().references(() => adContents.id, { onDelete: 'cascade' }),
  platform: text("platform").notNull(), // facebook, instagram, twitter, linkedin, etc.
  previewImageUrl: text("preview_image_url"), // Generated image URL showing how ad would appear on the platform
  previewHtml: text("preview_html"), // HTML representation of ad preview
  dimensions: jsonb("dimensions").$type<{
    width: number,
    height: number,
    unit: string
  }>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});

// For now, we'll use manual join queries since relations aren't available in this Drizzle version

// Campaign analytics with more detailed metrics
export const campaignAnalytics = pgTable("campaign_analytics", {
  id: serial("id").primaryKey(),
  campaignId: integer("campaign_id").notNull().references(() => adCampaigns.id, { onDelete: 'cascade' }),
  date: date("date").notNull(),
  platform: text("platform").notNull(),
  impressions: integer("impressions").default(0),
  clicks: integer("clicks").default(0),
  clickThroughRate: real("click_through_rate"),
  engagement: integer("engagement").default(0),
  engagementRate: real("engagement_rate"),
  shares: integer("shares").default(0),
  likes: integer("likes").default(0),
  comments: integer("comments").default(0),
  saves: integer("saves").default(0),
  reach: integer("reach").default(0),
  spend: numeric("spend").default("0"),
  costPerClick: numeric("cost_per_click"),
  costPerImpression: numeric("cost_per_impression"),
  conversions: integer("conversions").default(0),
  conversionRate: real("conversion_rate"),
  costPerConversion: numeric("cost_per_conversion"),
  roi: real("roi"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});

// Publishing schedule for batch publishing
export const publishingSchedules = pgTable("publishing_schedules", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: text("name").notNull(),
  contentIds: jsonb("content_ids").$type<number[]>().default([]),
  platforms: jsonb("platforms").$type<string[]>().default([]),
  scheduledDate: date("scheduled_date").notNull(),
  scheduledTime: time("scheduled_time").notNull(),
  timezone: text("timezone").default("UTC"),
  status: text("status").notNull().default("scheduled"), // scheduled, published, failed
  publishResults: jsonb("publish_results").$type<{
    platformId: string,
    success: boolean,
    postId?: string,
    error?: string
  }[]>(),
  notifyEmail: boolean("notify_email").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});

// Insert schemas for new tables
export const insertAdTemplateSchema = createInsertSchema(adTemplates).pick({
  userId: true,
  name: true,
  category: true,
  structure: true,
  samplePreview: true
});

export const insertPlatformPreviewSchema = createInsertSchema(platformPreviews).pick({
  adContentId: true,
  platform: true,
  previewImageUrl: true,
  previewHtml: true,
  dimensions: true
});

export const insertCampaignAnalyticsSchema = createInsertSchema(campaignAnalytics).pick({
  campaignId: true,
  date: true,
  platform: true,
  impressions: true,
  clicks: true,
  clickThroughRate: true,
  engagement: true,
  engagementRate: true,
  shares: true,
  likes: true,
  comments: true,
  saves: true,
  reach: true,
  spend: true,
  costPerClick: true,
  costPerImpression: true,
  conversions: true,
  conversionRate: true,
  costPerConversion: true,
  roi: true
});

// Insert schema for service bundle discounts
export const insertServiceBundleDiscountSchema = createInsertSchema(serviceBundleDiscounts).pick({
  primaryServiceId: true,
  secondaryServiceId: true,
  discountPercentage: true
});

// Service Bundle Discount Types
export type InsertServiceBundleDiscount = z.infer<typeof insertServiceBundleDiscountSchema>;
export type ServiceBundleDiscount = typeof serviceBundleDiscounts.$inferSelect;

export const insertPublishingScheduleSchema = createInsertSchema(publishingSchedules).pick({
  userId: true,
  name: true,
  contentIds: true,
  platforms: true,
  scheduledDate: true,
  scheduledTime: true,
  timezone: true,
  status: true,
  publishResults: true,
  notifyEmail: true
});

// Platform Connection Insert Schema
export const insertPlatformConnectionSchema = createInsertSchema(platformConnections).pick({
  userId: true,
  platform: true,
  accessToken: true,
  refreshToken: true,
  accountId: true,
  businessAccountId: true,
  isConnected: true,
  lastSynced: true,
  tokenExpiry: true
});

// Ad Campaign Types
export type InsertAdCampaign = z.infer<typeof insertAdCampaignSchema>;
export type AdCampaign = typeof adCampaigns.$inferSelect;

// Ad Content Types
export type InsertAdContent = z.infer<typeof insertAdContentSchema>;
export type AdContent = typeof adContents.$inferSelect;

// Platform Connection Types  
export type InsertPlatformConnection = z.infer<typeof insertPlatformConnectionSchema>;
export type PlatformConnection = typeof platformConnections.$inferSelect;

// New types for ad templates, platform previews, campaign analytics, and publishing schedules
export type InsertAdTemplate = z.infer<typeof insertAdTemplateSchema>;
export type AdTemplate = typeof adTemplates.$inferSelect;

export type InsertPlatformPreview = z.infer<typeof insertPlatformPreviewSchema>;
export type PlatformPreview = typeof platformPreviews.$inferSelect;

export type InsertCampaignAnalytics = z.infer<typeof insertCampaignAnalyticsSchema>;
export type CampaignAnalytics = typeof campaignAnalytics.$inferSelect;

// 3D Models
export const models3d = pgTable("models_3d", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  fileName: text("file_name").notNull(),
  fileUrl: text("file_url").notNull(),
  thumbnailUrl: text("thumbnail_url"),
  userId: integer("user_id").references(() => users.id),
  clientId: integer("client_id").references(() => clientAnalytics.id),
  serviceId: integer("service_id").references(() => services.id),
  isPublic: boolean("is_public").default(false),
  uploadDate: timestamp("upload_date").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at"),
});

export const insertModel3dSchema = createInsertSchema(models3d).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true,
  uploadDate: true 
});

export type InsertModel3d = z.infer<typeof insertModel3dSchema>;
export type Model3d = typeof models3d.$inferSelect;

// Virtual Tours for 3DVista
export const virtualTours = pgTable("virtual_tours", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  projectId: integer("project_id").references(() => clientProjects.id),
  clientId: integer("client_id").references(() => clientAnalytics.id),
  userId: integer("user_id").references(() => users.id),
  tourPath: text("tour_path").notNull(), // Path to tour folder on server
  thumbnailUrl: text("thumbnail_url"),
  isPublic: boolean("is_public").default(false),
  hasVrMode: boolean("has_vr_mode").default(true),
  fileSizeMb: integer("file_size_mb"),
  status: text("status").default("active").notNull(), // active, archived, processing
  uploadedAt: timestamp("uploaded_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at"),
  // Tour metadata
  panoramaCount: integer("panorama_count").default(0),
  has2dMaps: boolean("has_2d_maps").default(false),
  has3dModels: boolean("has_3d_models").default(false),
  tourType: text("tour_type").default("construction"), // construction, real_estate, inspection
});

export const insertVirtualTourSchema = createInsertSchema(virtualTours).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true,
  uploadedAt: true 
});

export type InsertVirtualTour = z.infer<typeof insertVirtualTourSchema>;
export type VirtualTour = typeof virtualTours.$inferSelect;

export type InsertPublishingSchedule = z.infer<typeof insertPublishingScheduleSchema>;
export type PublishingSchedule = typeof publishingSchedules.$inferSelect;

// Financial Management System Tables

// Expense categories for organizing expenses
export const expenseCategories = pgTable("expense_categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  icon: text("icon"),
  color: text("color"),
  isDefault: boolean("is_default").default(false),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Expense records for all business expenses
export const expenses = pgTable("expenses", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  categoryId: integer("category_id").references(() => expenseCategories.id),
  amount: numeric("amount").notNull(),
  description: text("description"),
  vendor: text("vendor"),
  date: date("date").notNull(),
  receiptUrl: text("receipt_url"),
  receiptData: jsonb("receipt_data").$type<{
    extractedText?: string,
    extractedVendor?: string,
    extractedDate?: string,
    extractedAmount?: number
  }>(),
  paymentMethod: text("payment_method"),
  isDeductible: boolean("is_deductible").default(true),
  isRecurring: boolean("is_recurring").default(false),
  recurringPeriod: text("recurring_period"), // monthly, yearly, etc.
  notes: text("notes"),
  tags: jsonb("tags").$type<string[]>().default([]),
  projectId: integer("project_id"), // Links to a specific project/client
  status: text("status").default("active").notNull(), // active, archived, etc.
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Income records for business revenue
export const income = pgTable("income", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  amount: numeric("amount").notNull(),
  description: text("description"),
  client: text("client"),
  date: date("date").notNull(),
  invoiceId: text("invoice_id"),
  invoiceUrl: text("invoice_url"),
  paymentMethod: text("payment_method"),
  projectId: integer("project_id"),
  bookingId: integer("booking_id").references(() => bookings.id),
  quoteId: integer("quote_id").references(() => quotes.id),
  category: text("category").default("service"), // service, product, other
  taxWithheld: numeric("tax_withheld").default("0"),
  status: text("status").default("received").notNull(), // received, pending, etc.
  notes: text("notes"),
  tags: jsonb("tags").$type<string[]>().default([]),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Financial accounts for tracking balances
export const financialAccounts = pgTable("financial_accounts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: text("name").notNull(),
  type: text("type").notNull(), // checking, savings, credit, etc.
  institution: text("institution"),
  accountNumber: text("account_number"),
  routingNumber: text("routing_number"),
  balance: numeric("balance").default("0"),
  isActive: boolean("is_active").default(true),
  lastSyncedAt: timestamp("last_synced_at"),
  syncToken: text("sync_token"), // For third-party integrations
  credentials: jsonb("credentials").$type<{
    token?: string,
    tokenExpiry?: Date
  }>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Financial reports for saved report configurations
export const financialReports = pgTable("financial_reports", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: text("name").notNull(),
  type: text("type").notNull(), // profit-loss, expense-summary, tax-report, etc.
  configuration: jsonb("configuration").$type<{
    startDate?: Date,
    endDate?: Date,
    categories?: number[],
    groupBy?: string,
    showDetails?: boolean,
    showCharts?: boolean,
    format?: string
  }>(),
  lastGeneratedAt: timestamp("last_generated_at"),
  lastGeneratedUrl: text("last_generated_url"),
  scheduledGeneration: boolean("scheduled_generation").default(false),
  generationPeriod: text("generation_period"), // monthly, quarterly, yearly, etc.
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// File uploads for receipts, invoices, and reports
export const financialDocuments = pgTable("financial_documents", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  filename: text("filename").notNull(),
  originalFilename: text("original_filename"),
  fileUrl: text("file_url").notNull(),
  fileType: text("file_type").notNull(), // receipt, invoice, bank-statement, report
  fileSize: integer("file_size"),
  mimeType: text("mime_type"),
  metadata: jsonb("metadata").$type<{
    expenseId?: number,
    incomeId?: number,
    reportId?: number,
    extractedData?: Record<string, any>
  }>(),
  isProcessed: boolean("is_processed").default(false),
  processingErrors: text("processing_errors"),
  uploadedAt: timestamp("uploaded_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Budgets for expense planning
export const budgets = pgTable("budgets", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: text("name").notNull(),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  totalBudget: numeric("total_budget").notNull(),
  isActive: boolean("is_active").default(true),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Budget category allocations
export const budgetAllocations = pgTable("budget_allocations", {
  id: serial("id").primaryKey(), 
  budgetId: integer("budget_id").notNull().references(() => budgets.id, { onDelete: 'cascade' }),
  categoryId: integer("category_id").references(() => expenseCategories.id),
  amount: numeric("amount").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Data Analytics System Tables

// Project analytics for tracking project metrics
export const projectAnalytics = pgTable("project_analytics", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id"),
  quoteId: integer("quote_id").references(() => quotes.id),
  bookingId: integer("booking_id").references(() => bookings.id),
  serviceType: text("service_type").notNull(), // orthomosaic, photogrammetry, videography, etc.
  flightHours: real("flight_hours"),
  processingHours: real("processing_hours"),
  totalHours: real("total_hours"),
  revenue: numeric("revenue"),
  costs: numeric("costs"),
  profit: numeric("profit"),
  profitMargin: real("profit_margin"),
  clientId: integer("client_id").references(() => users.id),
  clientType: text("client_type"), // contractor, developer, real estate agent, etc.
  location: text("location"),
  completionDate: date("completion_date"),
  qualityScore: real("quality_score"),
  feedback: text("feedback"),
  tags: jsonb("tags").$type<string[]>().default([]),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Drone performance analytics
export const droneAnalytics = pgTable("drone_analytics", {
  id: serial("id").primaryKey(),
  droneId: serial("drone_id"),
  droneName: text("drone_name").notNull(),
  droneModel: text("drone_model").notNull(),
  serialNumber: text("serial_number"),
  flightHours: real("flight_hours").default(0),
  batteryCycles: integer("battery_cycles").default(0),
  batteryHealth: real("battery_health"), // Percentage
  lastMaintenance: date("last_maintenance"),
  nextMaintenanceDue: date("next_maintenance_due"),
  cameraShutterCount: integer("camera_shutter_count").default(0),
  motorWear: jsonb("motor_wear").$type<{
    frontLeft?: number,
    frontRight?: number,
    backLeft?: number,
    backRight?: number
  }>(),
  errorCodes: jsonb("error_codes").$type<{
    code: string,
    date: Date,
    description: string
  }[]>().default([]),
  lastFlight: timestamp("last_flight"),
  calibrationDate: date("calibration_date"),
  firmwareVersion: text("firmware_version"),
  status: text("status").default("active"), // active, maintenance, retired
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Flight logs for detailed flight data
export const flightLogs = pgTable("flight_logs", {
  id: serial("id").primaryKey(),
  droneId: integer("drone_id").references(() => droneAnalytics.id, { onDelete: 'cascade' }),
  projectId: integer("project_id"),
  pilotId: integer("pilot_id").references(() => users.id),
  flightDate: date("flight_date").notNull(),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time"),
  duration: real("duration"),
  distance: real("distance"),
  maxAltitude: real("max_altitude"),
  avgSpeed: real("avg_speed"),
  batteryUsed: real("battery_used"), // Percentage
  startBatteryLevel: real("start_battery_level"),
  endBatteryLevel: real("end_battery_level"),
  windSpeed: real("wind_speed"),
  temperature: real("temperature"),
  humidity: real("humidity"),
  location: text("location"),
  coordinates: jsonb("coordinates").$type<{
    latitude: number,
    longitude: number
  }>(),
  flightPath: jsonb("flight_path").$type<{
    points: Array<{latitude: number, longitude: number, altitude: number, timestamp: number}>
  }>(),
  purpose: text("purpose"), // mapping, video, inspection, etc.
  successful: boolean("successful").default(true),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Marketing analytics
export const marketingAnalytics = pgTable("marketing_analytics", {
  id: serial("id").primaryKey(),
  source: text("source").notNull(), // organic, google, facebook, referral, etc.
  medium: text("medium"), // cpc, email, social, etc.
  campaign: text("campaign"),
  keyword: text("keyword"),
  landingPage: text("landing_page"),
  visitors: integer("visitors").default(0),
  uniqueVisitors: integer("unique_visitors").default(0),
  pageViews: integer("page_views").default(0),
  bounceRate: real("bounce_rate"),
  timeOnSite: real("time_on_site"),
  conversionRate: real("conversion_rate"),
  leads: integer("leads").default(0),
  costPerLead: numeric("cost_per_lead"),
  sales: integer("sales").default(0),
  revenue: numeric("revenue").default("0"),
  cost: numeric("cost").default("0"),
  roi: real("roi"),
  date: date("date").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Client analytics
export const clientAnalytics = pgTable("client_analytics", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").references(() => users.id),
  clientType: text("client_type"), // contractor, developer, real estate agent, etc.
  acquisitionSource: text("acquisition_source"),
  acquisitionDate: date("acquisition_date"),
  projectCount: integer("project_count").default(0),
  totalSpend: numeric("total_spend").default("0"),
  averageProjectValue: numeric("average_project_value").default("0"),
  lastProjectDate: date("last_project_date"),
  engagementScore: real("engagement_score"),
  lifetimeValue: numeric("lifetime_value").default("0"),
  preferredServices: jsonb("preferred_services").$type<string[]>().default([]),
  contactFrequency: jsonb("contact_frequency").$type<{
    calls: number,
    emails: number,
    meetings: number,
    lastContact: Date
  }>(),
  satisfactionScore: real("satisfaction_score"),
  retentionRate: real("retention_rate"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Custom reports configurations
export const analyticsReports = pgTable("analytics_reports", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: text("name").notNull(), 
  description: text("description"),
  type: text("type").notNull(), // project, client, drone, marketing, custom
  configuration: jsonb("configuration").$type<{
    metrics: string[],
    filters: Record<string, any>,
    groupBy: string[],
    sortBy: string,
    startDate?: Date,
    endDate?: Date,
    chartType?: string,
    showTotals?: boolean
  }>().notNull(),
  isDefault: boolean("is_default").default(false),
  schedule: jsonb("schedule").$type<{
    frequency: string,
    day?: number,
    hour?: number,
    recipients?: string[]
  }>(),
  lastGeneratedAt: timestamp("last_generated_at"),
  lastGeneratedData: jsonb("last_generated_data"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Insert schemas for financial management
export const insertExpenseCategorySchema = createInsertSchema(expenseCategories).pick({
  name: true,
  description: true,
  icon: true,
  color: true,
  isDefault: true,
  isActive: true
});

export const insertExpenseSchema = createInsertSchema(expenses).pick({
  userId: true,
  categoryId: true,
  amount: true,
  description: true,
  vendor: true,
  date: true,
  receiptUrl: true,
  receiptData: true,
  paymentMethod: true,
  isDeductible: true,
  isRecurring: true,
  recurringPeriod: true,
  notes: true,
  tags: true,
  projectId: true,
  status: true
});

export const insertIncomeSchema = createInsertSchema(income).pick({
  userId: true,
  amount: true,
  description: true,
  client: true,
  date: true,
  invoiceId: true,
  invoiceUrl: true,
  paymentMethod: true,
  projectId: true,
  bookingId: true,
  quoteId: true,
  category: true,
  taxWithheld: true,
  status: true,
  notes: true,
  tags: true
});

export const insertFinancialAccountSchema = createInsertSchema(financialAccounts).pick({
  userId: true,
  name: true,
  type: true,
  institution: true,
  accountNumber: true,
  routingNumber: true,
  balance: true,
  isActive: true,
  lastSyncedAt: true,
  syncToken: true,
  credentials: true
});

export const insertFinancialReportSchema = createInsertSchema(financialReports).pick({
  userId: true,
  name: true,
  type: true,
  configuration: true,
  lastGeneratedAt: true,
  lastGeneratedUrl: true,
  scheduledGeneration: true,
  generationPeriod: true
});

export const insertFinancialDocumentSchema = createInsertSchema(financialDocuments).pick({
  userId: true,
  filename: true,
  originalFilename: true,
  fileUrl: true,
  fileType: true,
  fileSize: true,
  mimeType: true,
  metadata: true,
  isProcessed: true,
  processingErrors: true
});

export const insertBudgetSchema = createInsertSchema(budgets).pick({
  userId: true,
  name: true,
  startDate: true,
  endDate: true,
  totalBudget: true,
  isActive: true,
  description: true
});

export const insertBudgetAllocationSchema = createInsertSchema(budgetAllocations).pick({
  budgetId: true,
  categoryId: true,
  amount: true,
  notes: true
});

// Insert schemas for data analytics
export const insertProjectAnalyticsSchema = createInsertSchema(projectAnalytics).pick({
  projectId: true,
  quoteId: true,
  bookingId: true,
  serviceType: true,
  flightHours: true,
  processingHours: true,
  totalHours: true,
  revenue: true,
  costs: true,
  profit: true,
  profitMargin: true,
  clientId: true,
  clientType: true,
  location: true,
  completionDate: true,
  qualityScore: true,
  feedback: true,
  tags: true,
  notes: true
});

export const insertDroneAnalyticsSchema = createInsertSchema(droneAnalytics).pick({
  droneName: true,
  droneModel: true,
  serialNumber: true,
  flightHours: true,
  batteryCycles: true,
  batteryHealth: true,
  lastMaintenance: true,
  nextMaintenanceDue: true,
  cameraShutterCount: true,
  motorWear: true,
  errorCodes: true,
  lastFlight: true,
  calibrationDate: true,
  firmwareVersion: true,
  status: true,
  notes: true
});

export const insertFlightLogSchema = createInsertSchema(flightLogs).pick({
  droneId: true,
  projectId: true,
  pilotId: true,
  flightDate: true,
  startTime: true,
  endTime: true,
  duration: true,
  distance: true,
  maxAltitude: true,
  avgSpeed: true,
  batteryUsed: true,
  startBatteryLevel: true,
  endBatteryLevel: true,
  windSpeed: true,
  temperature: true,
  humidity: true,
  location: true,
  coordinates: true,
  flightPath: true,
  purpose: true,
  successful: true,
  notes: true
});

export const insertMarketingAnalyticsSchema = createInsertSchema(marketingAnalytics).pick({
  source: true,
  medium: true,
  campaign: true,
  keyword: true,
  landingPage: true,
  visitors: true,
  uniqueVisitors: true,
  pageViews: true,
  bounceRate: true,
  timeOnSite: true,
  conversionRate: true,
  leads: true,
  costPerLead: true,
  sales: true,
  revenue: true,
  cost: true,
  roi: true,
  date: true,
  notes: true
});

export const insertClientAnalyticsSchema = createInsertSchema(clientAnalytics).pick({
  clientId: true,
  clientType: true,
  acquisitionSource: true,
  acquisitionDate: true,
  projectCount: true,
  totalSpend: true,
  averageProjectValue: true,
  lastProjectDate: true,
  engagementScore: true,
  lifetimeValue: true,
  preferredServices: true,
  contactFrequency: true,
  satisfactionScore: true,
  retentionRate: true,
  notes: true
});

export const insertAnalyticsReportSchema = createInsertSchema(analyticsReports).pick({
  userId: true,
  name: true,
  description: true,
  type: true,
  configuration: true,
  isDefault: true,
  schedule: true,
  lastGeneratedAt: true,
  lastGeneratedData: true
});

// Types for financial management
export type InsertExpenseCategory = z.infer<typeof insertExpenseCategorySchema>;
export type ExpenseCategory = typeof expenseCategories.$inferSelect;

export type InsertExpense = z.infer<typeof insertExpenseSchema>;
export type Expense = typeof expenses.$inferSelect;

export type InsertIncome = z.infer<typeof insertIncomeSchema>;
export type Income = typeof income.$inferSelect;

export type InsertFinancialAccount = z.infer<typeof insertFinancialAccountSchema>;
export type FinancialAccount = typeof financialAccounts.$inferSelect;

export type InsertFinancialReport = z.infer<typeof insertFinancialReportSchema>;
export type FinancialReport = typeof financialReports.$inferSelect;

export type InsertFinancialDocument = z.infer<typeof insertFinancialDocumentSchema>;
export type FinancialDocument = typeof financialDocuments.$inferSelect;

export type InsertBudget = z.infer<typeof insertBudgetSchema>;
export type Budget = typeof budgets.$inferSelect;

export type InsertBudgetAllocation = z.infer<typeof insertBudgetAllocationSchema>;
export type BudgetAllocation = typeof budgetAllocations.$inferSelect;

// Types for data analytics
export type InsertProjectAnalytics = z.infer<typeof insertProjectAnalyticsSchema>;
export type ProjectAnalytics = typeof projectAnalytics.$inferSelect;

export type InsertDroneAnalytics = z.infer<typeof insertDroneAnalyticsSchema>;
export type DroneAnalytics = typeof droneAnalytics.$inferSelect;

export type InsertFlightLog = z.infer<typeof insertFlightLogSchema>;
export type FlightLog = typeof flightLogs.$inferSelect;

export type InsertMarketingAnalytics = z.infer<typeof insertMarketingAnalyticsSchema>;
export type MarketingAnalytics = typeof marketingAnalytics.$inferSelect;

export type InsertClientAnalytics = z.infer<typeof insertClientAnalyticsSchema>;
export type ClientAnalytics = typeof clientAnalytics.$inferSelect;

export type InsertAnalyticsReport = z.infer<typeof insertAnalyticsReportSchema>;
export type AnalyticsReport = typeof analyticsReports.$inferSelect;

// Payroll tracking system tables
export const departments = pgTable("departments", {
  id: serial("id").primaryKey(), 
  name: text("name").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const employees = pgTable("employees", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  position: text("position").notNull(),
  departmentId: integer("department_id").references(() => departments.id),
  hireDate: date("hire_date").notNull(),
  terminationDate: date("termination_date"),
  isActive: boolean("is_active").default(true).notNull(),
  payType: text("pay_type").notNull(), // "hourly", "salary"
  payRate: numeric("pay_rate", { precision: 10, scale: 2 }).notNull(), // hourly rate or annual salary
  taxWithholdingPercentage: numeric("tax_withholding_percentage", { precision: 5, scale: 2 }).default("20"),
  bankAccountName: text("bank_account_name"),
  bankAccountNumber: text("bank_account_number"),
  bankRoutingNumber: text("bank_routing_number"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const payrollPeriods = pgTable("payroll_periods", {
  id: serial("id").primaryKey(),
  periodStart: date("period_start").notNull(),
  periodEnd: date("period_end").notNull(),
  paymentDate: date("payment_date").notNull(),
  status: text("status").notNull().default("pending"), // pending, processing, completed
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const payrollEntries = pgTable("payroll_entries", {
  id: serial("id").primaryKey(),
  payrollPeriodId: integer("payroll_period_id").references(() => payrollPeriods.id, { onDelete: "cascade" }),
  employeeId: integer("employee_id").references(() => employees.id, { onDelete: "cascade" }),
  regularHours: numeric("regular_hours", { precision: 6, scale: 2 }).default("0"),
  overtimeHours: numeric("overtime_hours", { precision: 6, scale: 2 }).default("0"),
  bonusAmount: numeric("bonus_amount", { precision: 10, scale: 2 }).default("0"),
  commissionAmount: numeric("commission_amount", { precision: 10, scale: 2 }).default("0"),
  deductionAmount: numeric("deduction_amount", { precision: 10, scale: 2 }).default("0"),
  deductionReason: text("deduction_reason"),
  grossPay: numeric("gross_pay", { precision: 10, scale: 2 }).notNull(),
  taxAmount: numeric("tax_amount", { precision: 10, scale: 2 }).notNull(),
  netPay: numeric("net_pay", { precision: 10, scale: 2 }).notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const timeEntries = pgTable("time_entries", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").references(() => employees.id, { onDelete: "cascade" }),
  projectAnalyticsId: integer("project_analytics_id").references(() => projectAnalytics.id, { onDelete: "set null" }),
  entryDate: date("entry_date").notNull(),
  hoursWorked: numeric("hours_worked", { precision: 5, scale: 2 }).notNull(),
  description: text("description").notNull(),
  billable: boolean("billable").default(true).notNull(),
  approved: boolean("approved").default(false).notNull(),
  approvedBy: integer("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Payroll insert schemas
export const insertDepartmentSchema = createInsertSchema(departments).pick({
  name: true,
  description: true,
});

export const insertEmployeeSchema = createInsertSchema(employees).pick({
  userId: true,
  firstName: true,
  lastName: true,
  email: true,
  phone: true,
  position: true,
  departmentId: true,
  hireDate: true,
  terminationDate: true,
  isActive: true,
  payType: true,
  payRate: true,
  taxWithholdingPercentage: true,
  bankAccountName: true,
  bankAccountNumber: true,
  bankRoutingNumber: true,
  notes: true,
}).extend({
  hireDate: z.preprocess((arg) => typeof arg === 'string' ? new Date(arg) : arg, z.date()),
  terminationDate: z.preprocess((arg) => arg ? (typeof arg === 'string' ? new Date(arg) : arg) : undefined, z.date().optional()),
});

export const insertPayrollPeriodSchema = createInsertSchema(payrollPeriods).pick({
  periodStart: true,
  periodEnd: true,
  paymentDate: true,
  status: true,
  notes: true,
}).extend({
  periodStart: z.preprocess((arg) => typeof arg === 'string' ? new Date(arg) : arg, z.date()),
  periodEnd: z.preprocess((arg) => typeof arg === 'string' ? new Date(arg) : arg, z.date()),
  paymentDate: z.preprocess((arg) => typeof arg === 'string' ? new Date(arg) : arg, z.date()),
});

export const insertPayrollEntrySchema = createInsertSchema(payrollEntries).pick({
  payrollPeriodId: true,
  employeeId: true,
  regularHours: true,
  overtimeHours: true,
  bonusAmount: true,
  commissionAmount: true,
  deductionAmount: true,
  deductionReason: true,
  grossPay: true,
  taxAmount: true,
  netPay: true,
  notes: true,
});

export const insertTimeEntrySchema = createInsertSchema(timeEntries).pick({
  employeeId: true,
  projectAnalyticsId: true,
  entryDate: true,
  hoursWorked: true,
  description: true,
  billable: true,
  approved: true,
  approvedBy: true,
  approvedAt: true,
}).extend({
  entryDate: z.preprocess((arg) => typeof arg === 'string' ? new Date(arg) : arg, z.date()),
  approvedAt: z.preprocess((arg) => arg ? (typeof arg === 'string' ? new Date(arg) : arg) : undefined, z.date().optional()),
});

// Payroll type exports
export type InsertDepartment = z.infer<typeof insertDepartmentSchema>;
export type Department = typeof departments.$inferSelect;

export type InsertEmployee = z.infer<typeof insertEmployeeSchema>;
export type Employee = typeof employees.$inferSelect;

export type InsertPayrollPeriod = z.infer<typeof insertPayrollPeriodSchema>;
export type PayrollPeriod = typeof payrollPeriods.$inferSelect;

export type InsertPayrollEntry = z.infer<typeof insertPayrollEntrySchema>;
export type PayrollEntry = typeof payrollEntries.$inferSelect;

export type InsertTimeEntry = z.infer<typeof insertTimeEntrySchema>;
export type TimeEntry = typeof timeEntries.$inferSelect;

// CRM System tables
export const customers = pgTable("customers", {
  id: serial("id").primaryKey(),
  name: text("name"),
  email: text("email"),
  phone: text("phone"),
  address: text("address"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  username: text("username"),
  password: text("password"),
  logoUrl: text("logo_url"),
  userId: integer("user_id").references(() => users.id),
  firstName: text("first_name"),
  lastName: text("last_name"),
  company: text("company"),
  city: text("city"),
  state: text("state"),
  postalCode: text("postal_code"),
  country: text("country"),
  status: text("status").default("active"),
});

export const customerInteractions = pgTable("customer_interactions", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id").references(() => customers.id).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  interactionType: text("interaction_type").notNull(), // call, email, meeting, etc.
  subject: text("subject").notNull(),
  details: text("details"),
  outcome: text("outcome"),
  followUpNeeded: boolean("follow_up_needed").default(false),
  followUpDate: timestamp("follow_up_date"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const customerDeals = pgTable("customer_deals", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id").references(() => customers.id).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  name: text("name").notNull(),
  description: text("description"),
  amount: numeric("amount").notNull(),
  stage: text("stage").notNull(), // lead, qualified, proposal, negotiation, closed-won, closed-lost
  probability: integer("probability").default(0), // 0-100%
  expectedCloseDate: timestamp("expected_close_date"),
  actualCloseDate: timestamp("actual_close_date"),
  reason: text("reason"), // reason for winning/losing
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const customerTasks = pgTable("customer_tasks", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id").references(() => customers.id).notNull(),
  assignedTo: integer("assigned_to").references(() => users.id).notNull(),
  title: text("title").notNull(),
  description: text("description"),
  dueDate: timestamp("due_date"),
  priority: text("priority").default("medium"), // low, medium, high
  status: text("status").default("pending"), // pending, in-progress, completed
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// CRM relations for analytics integration
export const customerRelations = relations(customers, ({ one, many }) => ({
  user: one(users, {
    fields: [customers.userId],
    references: [users.id],
  }),
  interactions: many(customerInteractions),
  deals: many(customerDeals),
  tasks: many(customerTasks),
  analytics: one(clientAnalytics, {
    fields: [customers.id],
    references: [clientAnalytics.clientId],
  }),
}));

export const customerInteractionRelations = relations(customerInteractions, ({ one }) => ({
  customer: one(customers, {
    fields: [customerInteractions.customerId],
    references: [customers.id],
  }),
  user: one(users, {
    fields: [customerInteractions.userId],
    references: [users.id],
  }),
}));

export const customerDealRelations = relations(customerDeals, ({ one }) => ({
  customer: one(customers, {
    fields: [customerDeals.customerId],
    references: [customers.id],
  }),
  user: one(users, {
    fields: [customerDeals.userId],
    references: [users.id],
  }),
}));

export const customerTaskRelations = relations(customerTasks, ({ one }) => ({
  customer: one(customers, {
    fields: [customerTasks.customerId],
    references: [customers.id],
  }),
  assignedUser: one(users, {
    fields: [customerTasks.assignedTo],
    references: [users.id],
  }),
}));

// CRM insert schemas
export const insertCustomerSchema = createInsertSchema(customers).pick({
  name: true,
  email: true,
  phone: true,
  address: true,
  username: true,
  password: true,
  logoUrl: true,
  userId: true,
  firstName: true,
  lastName: true,
  company: true,
  city: true,
  state: true,
  postalCode: true,
  country: true,
  status: true,
});

export const insertCustomerInteractionSchema = createInsertSchema(customerInteractions).pick({
  customerId: true,
  userId: true,
  interactionType: true,
  subject: true,
  details: true,
  outcome: true,
  followUpNeeded: true,
  followUpDate: true,
});

export const insertCustomerDealSchema = createInsertSchema(customerDeals).pick({
  customerId: true,
  userId: true,
  name: true,
  description: true,
  amount: true,
  stage: true,
  probability: true,
  expectedCloseDate: true,
  actualCloseDate: true,
  reason: true,
});

export const insertCustomerTaskSchema = createInsertSchema(customerTasks).pick({
  customerId: true,
  assignedTo: true,
  title: true,
  description: true,
  dueDate: true,
  priority: true,
  status: true,
  completedAt: true,
});

// CRM types
export type InsertCustomer = z.infer<typeof insertCustomerSchema>;
export type Customer = typeof customers.$inferSelect;

export type InsertCustomerInteraction = z.infer<typeof insertCustomerInteractionSchema>;
export type CustomerInteraction = typeof customerInteractions.$inferSelect;

export type InsertCustomerDeal = z.infer<typeof insertCustomerDealSchema>;
export type CustomerDeal = typeof customerDeals.$inferSelect;

export type InsertCustomerTask = z.infer<typeof insertCustomerTaskSchema>;
export type CustomerTask = typeof customerTasks.$inferSelect;

// Client aliases for standardized terminology
export type InsertClient = InsertCustomer;
export type Client = Customer;

// Extended Client type with booking count
export interface ClientWithBookings extends Client {
  bookingCount: number;
}

export type InsertClientInteraction = InsertCustomerInteraction;
export type ClientInteraction = CustomerInteraction;

export type InsertClientDeal = InsertCustomerDeal;
export type ClientDeal = CustomerDeal;

export type InsertClientTask = InsertCustomerTask;
export type ClientTask = CustomerTask;

// About page content management
export const aboutPageContent = pgTable("about_page_content", {
  id: serial("id").primaryKey(),
  section: text("section").notNull(), // e.g., "mission", "values", "certifications"
  title: text("title").notNull(),
  content: text("content").notNull(),
  imageUrl: text("image_url"),
  displayOrder: integer("display_order").default(0).notNull(),
  isVisible: boolean("is_visible").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertAboutPageContentSchema = createInsertSchema(aboutPageContent).pick({
  section: true,
  title: true,
  content: true,
  imageUrl: true,
  displayOrder: true,
  isVisible: true,
});

export type InsertAboutPageContent = z.infer<typeof insertAboutPageContentSchema>;
export type AboutPageContent = typeof aboutPageContent.$inferSelect;


// Client projects for organizing deliverables
export const clientProjects = pgTable("client_projects", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  clientId: integer("client_id").notNull().references(() => customers.id, { onDelete: "cascade" }),
  serviceId: integer("service_id").references(() => services.id, { onDelete: "set null" }),
  selectedServices: json("selected_services").$type<number[]>().default([]),
  status: varchar("status", { length: 50 }).default("active"),
  droneType: varchar("drone_type", { length: 100 }),
  dueDate: timestamp("due_date", { withTimezone: true }),
  startDate: timestamp("start_date", { withTimezone: true }).defaultNow(),
  completedDate: timestamp("completed_date", { withTimezone: true }),
  address: text("address"),
  notes: text("notes"),
  displayOrder: integer("display_order").default(0),
  shareableLink: varchar("shareable_link", { length: 255 }),
  shareableLinkExpiry: timestamp("shareable_link_expiry", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const projectDeliverables = pgTable("project_deliverables", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => clientProjects.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  type: varchar("type", { length: 100 }).notNull().default("file"),
  status: varchar("status", { length: 50 }).notNull().default("pending"),
  dueDate: timestamp("due_date", { withTimezone: true }),
  fileUrl: text("file_url"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const projectFiles = pgTable("project_files", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => clientProjects.id, { onDelete: "cascade" }),
  fileName: varchar("file_name", { length: 255 }).notNull(),
  filePath: text("file_path").notNull(),
  fileType: varchar("file_type", { length: 50 }).notNull().default("other"),
  fileSize: integer("file_size"),
  uploadedAt: timestamp("uploaded_at", { withTimezone: true }).defaultNow(),
});

// Project milestones for tracking progress and deliverables
export const projectMilestones = pgTable("project_milestones", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => clientProjects.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  date: timestamp("date", { withTimezone: true }).notNull(),
  status: varchar("status", { length: 50 }).default("pending"),
  type: varchar("type", { length: 50 }).default("milestone"), // milestone, deliverable, etc
  fileIds: integer("file_ids").array(), // Associated file IDs
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// Project tasks for task management within projects
export const projectTasks = pgTable("project_tasks", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => clientProjects.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  dueDate: timestamp("due_date", { withTimezone: true }),
  priority: varchar("priority", { length: 20 }).default("medium"), // low, medium, high
  status: varchar("status", { length: 20 }).default("todo"), // todo, in-progress, completed, blocked
  apolloResponsibility: varchar("apollo_responsibility", { length: 255 }), // What Apollo DroneWorks needs to do
  assignedTo: varchar("assigned_to", { length: 100 }), // Keeping for backward compatibility
  completedAt: timestamp("completed_at", { withTimezone: true }),
  clientNotes: text("client_notes"), // Notes from client to Apollo
  adminNotes: text("admin_notes"), // Notes from Apollo to client
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// Task files table for attaching files to tasks
export const taskFiles = pgTable("task_files", {
  id: serial("id").primaryKey(),
  taskId: integer("task_id").notNull().references(() => projectTasks.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  url: text("url").notNull(),
  fileType: varchar("file_type", { length: 50 }).default("link"), // document, image, video, link
  uploadedAt: timestamp("uploaded_at", { withTimezone: true }).defaultNow(),
});

// Timelapse items table for storing chronological media for timelapse viewer
export const timelapseItems = pgTable("timelapse_items", {
  id: serial("id").primaryKey(),
  taskId: integer("task_id").notNull().references(() => projectTasks.id, { onDelete: "cascade" }),
  projectId: integer("project_id").notNull().references(() => clientProjects.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  url: text("url").notNull(),
  thumbnailUrl: text("thumbnail_url"),
  mediaType: varchar("media_type", { length: 50 }).notNull(), // image, video, orthomosaic
  sourceType: varchar("source_type", { length: 20 }).notNull(), // upload, url
  captureDate: timestamp("capture_date", { withTimezone: true }).notNull(),
  metadata: json("metadata").$type<Record<string, any>>().default({}),
  fileSize: integer("file_size"),
  uploadedAt: timestamp("uploaded_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// Task messages table for communication about tasks
export const taskMessages = pgTable("task_messages", {
  id: serial("id").primaryKey(),
  taskId: integer("task_id").notNull().references(() => projectTasks.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  recipientEmail: varchar("recipient_email", { length: 255 }).notNull(),
  subject: varchar("subject", { length: 255 }).notNull(),
  message: text("message").notNull(),
  includedFiles: json("included_files").$type<number[]>().default([]), // Array of task_files.id that were included
  sentAt: timestamp("sent_at", { withTimezone: true }).defaultNow(),
  status: varchar("status", { length: 50 }).default("sent"), // sent, delivered, failed
});

// Define relationships between customers and client projects
export const clientProjectsRelations = relations(clientProjects, ({ one, many }) => ({
  client: one(customers, {
    fields: [clientProjects.clientId],
    references: [customers.id]
  }),
  service: one(services, {
    fields: [clientProjects.serviceId],
    references: [services.id]
  }),
  milestones: many(projectMilestones),
  tasks: many(projectTasks)
}));

export const projectMilestonesRelations = relations(projectMilestones, ({ one }) => ({
  project: one(clientProjects, {
    fields: [projectMilestones.projectId],
    references: [clientProjects.id]
  })
}));

export const projectTasksRelations = relations(projectTasks, ({ one, many }) => ({
  project: one(clientProjects, {
    fields: [projectTasks.projectId],
    references: [clientProjects.id]
  }),
  files: many(taskFiles),
  messages: many(taskMessages),
  timelapseItems: many(timelapseItems)
}));

export const taskFilesRelations = relations(taskFiles, ({ one }) => ({
  task: one(projectTasks, {
    fields: [taskFiles.taskId],
    references: [projectTasks.id]
  })
}));

export const taskMessagesRelations = relations(taskMessages, ({ one }) => ({
  task: one(projectTasks, {
    fields: [taskMessages.taskId],
    references: [projectTasks.id]
  }),
  user: one(users, {
    fields: [taskMessages.userId],
    references: [users.id]
  })
}));

export const timelapseItemsRelations = relations(timelapseItems, ({ one }) => ({
  task: one(projectTasks, {
    fields: [timelapseItems.taskId],
    references: [projectTasks.id]
  }),
  project: one(clientProjects, {
    fields: [timelapseItems.projectId],
    references: [clientProjects.id]
  })
}));


// Add feedback fields to bookings schema
export const bookingFeedbackSchema = z.object({
  rating: z.number().min(1).max(5).optional(),
  feedback: z.string().optional(),
  submittedAt: z.string().optional(),
  feedbackSubmitted: z.boolean().optional(),
});

// Base client project schema from the table definition
const baseClientProjectSchema = createInsertSchema(clientProjects).pick({
  name: true,
  description: true,
  clientId: true,
  serviceId: true,
  selectedServices: true, // Include the selectedServices field
  status: true,
  startDate: true,
  completedDate: true,
  address: true,
  notes: true,
  displayOrder: true,
  shareableLink: true,
  shareableLinkExpiry: true,
});

// Add validation to explicitly make name required
export const insertClientProjectSchema = baseClientProjectSchema.extend({
  name: z.string().min(1, "Project name is required"),
  droneType: z.string().optional(),
  dueDate: z.preprocess(
    (arg) => typeof arg === "string" ? new Date(arg) : arg,
    z.date().optional()
  ),
});

export const insertProjectDeliverableSchema = createInsertSchema(projectDeliverables).pick({
  projectId: true,
  name: true,
  type: true,
  status: true,
  dueDate: true,
  fileUrl: true,
  notes: true,
}).extend({
  dueDate: z.preprocess(
    (arg) => typeof arg === "string" ? new Date(arg) : arg,
    z.date().optional()
  ),
});

export const insertProjectFileSchema = createInsertSchema(projectFiles).pick({
  projectId: true,
  fileName: true,
  filePath: true,
  fileType: true,
  fileSize: true,
});

export type ProjectDeliverable = typeof projectDeliverables.$inferSelect;
export type InsertProjectDeliverable = z.infer<typeof insertProjectDeliverableSchema>;
export type ProjectFile = typeof projectFiles.$inferSelect;
export type InsertProjectFile = z.infer<typeof insertProjectFileSchema>;

// Create a base schema for project milestones
const baseProjectMilestoneSchema = createInsertSchema(projectMilestones).pick({
  projectId: true,
  title: true,
  description: true,
  date: true,
  status: true,
  type: true,
  fileIds: true,
});

// Customize to accept string or Date for the date field
export const insertProjectMilestoneSchema = baseProjectMilestoneSchema.extend({
  date: z.preprocess(
    // Convert string to Date
    (arg) => typeof arg === 'string' ? new Date(arg) : arg,
    z.date()
  )
});

export type InsertClientProject = z.infer<typeof insertClientProjectSchema>;
export type ClientProject = typeof clientProjects.$inferSelect;
// Create a base schema for project tasks
const baseProjectTaskSchema = createInsertSchema(projectTasks).pick({
  projectId: true,
  title: true,
  description: true,
  dueDate: true,
  priority: true,
  status: true,
  apolloResponsibility: true,
  assignedTo: true, // Kept for backward compatibility
  clientNotes: true,
  adminNotes: true,
});

// Customize to accept string or Date for the due date field
export const insertProjectTaskSchema = baseProjectTaskSchema.extend({
  dueDate: z.preprocess(
    // Convert string to Date
    (arg) => typeof arg === 'string' ? new Date(arg) : arg,
    z.date()
  )
});

export type InsertProjectMilestone = z.infer<typeof insertProjectMilestoneSchema>;
export type ProjectMilestone = typeof projectMilestones.$inferSelect;
// Task file schema
export const insertTaskFileSchema = createInsertSchema(taskFiles).pick({
  taskId: true,
  name: true,
  url: true,
  fileType: true,
});

export type InsertProjectTask = z.infer<typeof insertProjectTaskSchema>;
export type ProjectTask = typeof projectTasks.$inferSelect;
export type InsertTaskFile = z.infer<typeof insertTaskFileSchema>;
export type TaskFile = typeof taskFiles.$inferSelect;

// Task message schema
export const insertTaskMessageSchema = createInsertSchema(taskMessages).pick({
  taskId: true,
  userId: true,
  recipientEmail: true,
  subject: true,
  message: true,
  includedFiles: true,
  status: true,
});

export type InsertTaskMessage = z.infer<typeof insertTaskMessageSchema>;
export type TaskMessage = typeof taskMessages.$inferSelect;
export type BookingFeedback = z.infer<typeof bookingFeedbackSchema>;

// Timelapse items schema
const baseTimelapseItemSchema = createInsertSchema(timelapseItems).pick({
  taskId: true,
  projectId: true,
  name: true,
  description: true,
  url: true,
  thumbnailUrl: true,
  mediaType: true,
  sourceType: true,
  captureDate: true,
  metadata: true,
  fileSize: true,
});

// Customize to accept string or Date for the date field
export const insertTimelapseItemSchema = baseTimelapseItemSchema.extend({
  captureDate: z.preprocess(
    // Convert string to Date
    (arg) => typeof arg === 'string' ? new Date(arg) : arg,
    z.date()
  )
});

export type InsertTimelapseItem = z.infer<typeof insertTimelapseItemSchema>;
export type TimelapseItem = typeof timelapseItems.$inferSelect;

// Generated Content Storage
export const generatedContent = pgTable("generated_content", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  type: text("type").notNull(), // 'social', 'portfolio', 'quote', 'catalog', 'email'
  format: text("format").notNull(), // 'web', 'pdf', 'image', 'email'
  description: text("description"),
  serviceIds: json("service_ids").$type<number[]>().default([]),
  content: jsonb("content"), // Store the generated content data
  branding: jsonb("branding"), // Store branding settings used
  includeContact: boolean("include_contact").default(false),
  includePricing: boolean("include_pricing").default(false),
  downloadUrl: text("download_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const generatedContentRelations = relations(generatedContent, ({ one }) => ({
  user: one(users, {
    fields: [generatedContent.userId],
    references: [users.id],
  }),
}));

export const insertGeneratedContentSchema = createInsertSchema(generatedContent).pick({
  title: true,
  type: true,
  format: true,
  description: true,
  serviceIds: true,
  content: true,
  branding: true,
  includeContact: true,
  includePricing: true,
  downloadUrl: true,
});

export type InsertGeneratedContent = z.infer<typeof insertGeneratedContentSchema>;
export type GeneratedContent = typeof generatedContent.$inferSelect;

export type InsertSubscriptionTier = z.infer<typeof insertSubscriptionTierSchema>;
export type SubscriptionTier = typeof subscriptionTiers.$inferSelect;

// Notifications table for the alert system
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  title: varchar("title", { length: 255 }).notNull(),
  content: text("content").notNull(), // Main notification content
  message: text("message"), // Additional message details
  type: varchar("type", { length: 50 }).notNull().default("system"), // system, info, success, warning, error
  isRead: boolean("is_read").default(false),
  entityId: integer("entity_id"), // Optional ID of related item (project, task, etc.)
  entityType: varchar("entity_type", { length: 50 }), // Optional type of related item (project, task, etc.)
  sourceId: integer("source_id"), // ID of the item that triggered the notification
  sourceType: varchar("source_type", { length: 50 }), // Type of the item that triggered the notification
  linkUrl: text("link_url"), // Optional URL to navigate to when clicked
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id]
  })
}));

export const insertNotificationSchema = createInsertSchema(notifications).pick({
  userId: true,
  title: true,
  content: true,
  message: true,
  type: true,
  isRead: true,
  entityId: true,
  entityType: true,
  sourceId: true,
  sourceType: true,
  linkUrl: true,
});

export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = typeof notifications.$inferSelect;

// Trust Administration System Tables

// Trust entities - main trust records
export const trustEntities = pgTable("trust_entities", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(), // living, testamentary, revocable, irrevocable, charitable, etc.
  establishmentDate: date("establishment_date").notNull(),
  jurisdiction: text("jurisdiction").notNull(), // State/country where trust is established
  taxId: text("tax_id"), // Federal Tax ID (EIN)
  status: text("status").default("active").notNull(), // active, terminated, pending, suspended
  purpose: text("purpose"), // Purpose/objective of the trust
  termConditions: text("termination_conditions"), // Conditions for trust termination
  governingLaw: text("governing_law"), // State/jurisdiction law governing the trust
  // Sync with business config
  businessConfigId: integer("business_config_id").references(() => businessConfig.id),
  // Document references
  trustAgreementUrl: text("trust_agreement_url"),
  amendmentsUrl: jsonb("amendments_url").$type<string[]>().default([]),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Trust beneficiaries - can link to existing customers or be independent
export const trustBeneficiaries = pgTable("trust_beneficiaries", {
  id: serial("id").primaryKey(),
  trustId: integer("trust_id").notNull().references(() => trustEntities.id, { onDelete: 'cascade' }),
  // Link to existing customer record for bidirectional sync
  customerId: integer("customer_id").references(() => customers.id),
  // Or independent beneficiary data
  firstName: text("first_name"),
  lastName: text("last_name"),
  email: text("email"),
  phone: text("phone"),
  address: text("address"),
  city: text("city"),
  state: text("state"),
  postalCode: text("postal_code"),
  country: text("country"),
  dateOfBirth: date("date_of_birth"),
  // Trust-specific beneficiary information
  beneficiaryType: text("beneficiary_type").notNull(), // primary, contingent, remainder, charitable
  relationshipToTrustor: text("relationship_to_trustor"),
  distributionRights: jsonb("distribution_rights").$type<{
    income?: boolean;
    principal?: boolean;
    percentage?: number;
    conditions?: string[];
  }>(),
  vestingSchedule: jsonb("vesting_schedule").$type<Array<{
    date: Date;
    percentage: number;
    condition?: string;
  }>>().default([]),
  isActive: boolean("is_active").default(true),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Trust trustees - can link to existing users or be independent
export const trustTrustees = pgTable("trust_trustees", {
  id: serial("id").primaryKey(),
  trustId: integer("trust_id").notNull().references(() => trustEntities.id, { onDelete: 'cascade' }),
  // Link to existing user record for bidirectional sync
  userId: integer("user_id").references(() => users.id),
  // Or independent trustee data
  firstName: text("first_name"),
  lastName: text("last_name"),
  email: text("email"),
  phone: text("phone"),
  address: text("address"),
  city: text("city"),
  state: text("state"),
  postalCode: text("postal_code"),
  country: text("country"),
  // Trust-specific trustee information
  trusteeType: text("trustee_type").notNull(), // individual, corporate, successor, co-trustee
  roleDescription: text("role_description"),
  appointmentDate: date("appointment_date").notNull(),
  terminationDate: date("termination_date"),
  powers: jsonb("powers").$type<string[]>().default([]), // List of specific powers granted
  compensation: jsonb("compensation").$type<{
    type: string; // fixed, percentage, hourly
    amount: number;
    schedule: string; // annual, quarterly, per_transaction
  }>(),
  bondRequired: boolean("bond_required").default(false),
  bondAmount: numeric("bond_amount"),
  isActive: boolean("is_active").default(true),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Trust assets - links to existing financial data for bidirectional sync
export const trustAssets = pgTable("trust_assets", {
  id: serial("id").primaryKey(),
  trustId: integer("trust_id").notNull().references(() => trustEntities.id, { onDelete: 'cascade' }),
  // Links to existing financial records for sync
  financialAccountId: integer("financial_account_id").references(() => financialAccounts.id),
  incomeRecordId: integer("income_record_id").references(() => income.id),
  expenseRecordId: integer("expense_record_id").references(() => expenses.id),
  // Asset-specific information
  assetType: text("asset_type").notNull(), // cash, securities, real_estate, business_interest, etc.
  assetName: text("asset_name").notNull(),
  description: text("description"),
  acquisitionDate: date("acquisition_date"),
  acquisitionValue: numeric("acquisition_value"),
  currentValue: numeric("current_value"),
  valuationDate: date("valuation_date"),
  valuationMethod: text("valuation_method"), // appraisal, market, book_value, etc.
  // Asset tracking
  assetIdentifier: text("asset_identifier"), // Account number, property address, ticker symbol, etc.
  location: text("location"), // Physical or institutional location
  custodian: text("custodian"), // Who holds/manages the asset
  // Income generation
  generatesincome: boolean("generates_income").default(false),
  incomeFrequency: text("income_frequency"), // monthly, quarterly, annually
  lastIncomeDate: date("last_income_date"),
  // Depreciation/appreciation tracking
  isDepreciable: boolean("is_depreciable").default(false),
  depreciationMethod: text("depreciation_method"),
  depreciationRate: numeric("depreciation_rate"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Trust asset history - tracks all changes to assets for audit trail
export const trustAssetHistory = pgTable("trust_asset_history", {
  id: serial("id").primaryKey(),
  trustId: integer("trust_id").notNull().references(() => trustEntities.id, { onDelete: 'cascade' }),
  assetId: integer("asset_id").references(() => trustAssets.id, { onDelete: 'set null' }), // null if asset was deleted
  actionType: text("action_type").notNull(), // added, removed, modified, revalued, transferred
  actionBy: integer("action_by").notNull().references(() => users.id), // user who made the change
  actionDate: timestamp("action_date").defaultNow().notNull(),
  // Previous values (for modifications)
  previousValues: text("previous_values"), // JSON of previous asset values
  newValues: text("new_values"), // JSON of new asset values
  // Change details
  changeReason: text("change_reason"), // why the change was made
  changeDescription: text("change_description"), // detailed description of change
  documentationUrl: text("documentation_url"), // supporting documentation
  // Asset snapshot at time of change
  assetType: text("asset_type"),
  assetName: text("asset_name"),
  assetValue: numeric("asset_value"),
  valuationDate: date("valuation_date"),
  // Approval workflow
  requiresApproval: boolean("requires_approval").default(false),
  approvedBy: integer("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  approvalNotes: text("approval_notes"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Trust distributions - tracks all distributions to beneficiaries
export const trustDistributions = pgTable("trust_distributions", {
  id: serial("id").primaryKey(),
  trustId: integer("trust_id").notNull().references(() => trustEntities.id, { onDelete: 'cascade' }),
  beneficiaryId: integer("beneficiary_id").notNull().references(() => trustBeneficiaries.id, { onDelete: 'cascade' }),
  // Links to expense record for financial sync
  expenseRecordId: integer("expense_record_id").references(() => expenses.id),
  distributionDate: date("distribution_date").notNull(),
  distributionType: text("distribution_type").notNull(), // income, principal, required, discretionary
  amount: numeric("amount").notNull(),
  description: text("description"),
  purpose: text("purpose"), // education, health, maintenance, support, etc.
  approvedBy: integer("approved_by").references(() => trustTrustees.id),
  paymentMethod: text("payment_method"), // check, wire, direct_deposit
  checkNumber: text("check_number"),
  // Tax reporting
  taxYear: integer("tax_year"),
  taxCategory: text("tax_category"), // income, capital_gains, return_of_capital
  taxWithheld: numeric("tax_withheld").default("0"),
  // Documentation
  distributionNoticeUrl: text("distribution_notice_url"),
  taxDocumentUrl: text("tax_document_url"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Trust documents - all legal and administrative documents
export const trustDocuments = pgTable("trust_documents", {
  id: serial("id").primaryKey(),
  trustId: integer("trust_id").notNull().references(() => trustEntities.id, { onDelete: 'cascade' }),
  // Links to existing financial documents for sync
  financialDocumentId: integer("financial_document_id").references(() => financialDocuments.id),
  documentType: text("document_type").notNull(), // trust_agreement, amendment, annual_report, tax_return, etc.
  title: text("title").notNull(),
  description: text("description"),
  documentUrl: text("document_url").notNull(),
  fileName: text("file_name"),
  fileSize: integer("file_size"),
  mimeType: text("mime_type"),
  // Document metadata
  documentDate: date("document_date"),
  filingDate: date("filing_date"),
  expirationDate: date("expiration_date"),
  documentStatus: text("document_status").default("active"), // active, superseded, expired
  version: text("version"),
  // Legal and compliance
  requiresFillig: boolean("requires_filing").default(false),
  filingJurisdiction: text("filing_jurisdiction"),
  filingReference: text("filing_reference"),
  // Access control
  confidentialityLevel: text("confidentiality_level").default("internal"), // public, internal, confidential, restricted
  accessibleTo: jsonb("accessible_to").$type<number[]>().default([]), // Array of user/trustee IDs
  // Document generation tracking
  generatedBy: integer("generated_by").references(() => users.id),
  generationSource: text("generation_source"), // manual, automated, template
  templateUsed: text("template_used"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Trust compliance and filing requirements
export const trustCompliance = pgTable("trust_compliance", {
  id: serial("id").primaryKey(),
  trustId: integer("trust_id").notNull().references(() => trustEntities.id, { onDelete: 'cascade' }),
  requirementType: text("requirement_type").notNull(), // tax_filing, regulatory_report, audit, etc.
  title: text("title").notNull(),
  description: text("description"),
  jurisdiction: text("jurisdiction").notNull(),
  filingAuthority: text("filing_authority"), // IRS, state_agency, court, etc.
  // Scheduling
  frequency: text("frequency").notNull(), // annual, quarterly, monthly, one_time
  dueDate: date("due_date").notNull(),
  reminderDate: date("reminder_date"),
  filingPeriodStart: date("filing_period_start"),
  filingPeriodEnd: date("filing_period_end"),
  // Status tracking
  status: text("status").default("pending"), // pending, in_progress, filed, overdue, waived
  filedDate: date("filed_date"),
  filedBy: integer("filed_by").references(() => users.id),
  confirmationNumber: text("confirmation_number"),
  // Associated documents
  documentId: integer("document_id").references(() => trustDocuments.id),
  // Penalties and fees
  lateFee: numeric("late_fee"),
  penalty: numeric("penalty"),
  filingFee: numeric("filing_fee"),
  // Next occurrence (for recurring requirements)
  nextDueDate: date("next_due_date"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Trust meetings and resolutions
export const trustMeetings = pgTable("trust_meetings", {
  id: serial("id").primaryKey(),
  trustId: integer("trust_id").notNull().references(() => trustEntities.id, { onDelete: 'cascade' }),
  meetingType: text("meeting_type").notNull(), // trustee, beneficiary, administrative, emergency
  title: text("title").notNull(),
  description: text("description"),
  meetingDate: timestamp("meeting_date").notNull(),
  location: text("location"), // Physical address or "Virtual"
  calledBy: integer("called_by").references(() => trustTrustees.id),
  // Attendees
  attendees: jsonb("attendees").$type<Array<{
    type: string; // trustee, beneficiary, advisor, other
    id?: number; // Reference to trustee/beneficiary ID
    name: string;
    present: boolean;
    role?: string;
  }>>().default([]),
  // Meeting agenda and minutes
  agenda: jsonb("agenda").$type<Array<{
    item: string;
    description?: string;
    presenter?: string;
    timeAllocated?: number;
  }>>().default([]),
  minutesUrl: text("minutes_url"),
  recordingUrl: text("recording_url"),
  // Resolutions and decisions
  resolutions: jsonb("resolutions").$type<Array<{
    title: string;
    description: string;
    voteResult: string; // passed, failed, tabled
    voteCounts?: {
      for: number;
      against: number;
      abstain: number;
    };
  }>>().default([]),
  nextMeetingDate: timestamp("next_meeting_date"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Insert schemas for trust administration
export const insertTrustEntitySchema = createInsertSchema(trustEntities).pick({
  name: true,
  type: true,
  establishmentDate: true,
  jurisdiction: true,
  taxId: true,
  status: true,
  purpose: true,
  termConditions: true,
  governingLaw: true,
  businessConfigId: true,
  trustAgreementUrl: true,
  amendmentsUrl: true,
  notes: true,
});

export const insertTrustBeneficiarySchema = createInsertSchema(trustBeneficiaries).pick({
  trustId: true,
  customerId: true,
  firstName: true,
  lastName: true,
  email: true,
  phone: true,
  address: true,
  city: true,
  state: true,
  postalCode: true,
  country: true,
  dateOfBirth: true,
  beneficiaryType: true,
  relationshipToTrustor: true,
  distributionRights: true,
  vestingSchedule: true,
  isActive: true,
  notes: true,
});

export const insertTrustTrusteeSchema = createInsertSchema(trustTrustees).pick({
  trustId: true,
  userId: true,
  firstName: true,
  lastName: true,
  email: true,
  phone: true,
  address: true,
  city: true,
  state: true,
  postalCode: true,
  country: true,
  trusteeType: true,
  roleDescription: true,
  appointmentDate: true,
  terminationDate: true,
  powers: true,
  compensation: true,
  bondRequired: true,
  bondAmount: true,
  isActive: true,
  notes: true,
});

export const insertTrustAssetSchema = createInsertSchema(trustAssets).pick({
  trustId: true,
  financialAccountId: true,
  incomeRecordId: true,
  expenseRecordId: true,
  assetType: true,
  assetName: true,
  description: true,
  acquisitionDate: true,
  acquisitionValue: true,
  currentValue: true,
  valuationDate: true,
  valuationMethod: true,
  assetIdentifier: true,
  location: true,
  custodian: true,
  generatesincome: true,
  incomeFrequency: true,
  lastIncomeDate: true,
  isDepreciable: true,
  depreciationMethod: true,
  depreciationRate: true,
  notes: true,
}).extend({
  acquisitionValue: z.preprocess(v => {
    if (v === '' || v === null || v === undefined) return null;
    const num = Number(v);
    return isNaN(num) ? null : num;
  }, z.number().nullable()),
  currentValue: z.preprocess(v => {
    if (v === '' || v === null || v === undefined) return null;
    const num = Number(v);
    return isNaN(num) ? null : num;
  }, z.number()),
  depreciationRate: z.preprocess(v => {
    if (v === '' || v === null || v === undefined) return null;
    const num = Number(v);
    return isNaN(num) ? null : num;
  }, z.number().nullable()),
  financialAccountId: z.preprocess(v => {
    if (v === '' || v === null || v === undefined) return null;
    const num = Number(v);
    return isNaN(num) ? null : num;
  }, z.number().nullable()),
  incomeRecordId: z.preprocess(v => {
    if (v === '' || v === null || v === undefined) return null;
    const num = Number(v);
    return isNaN(num) ? null : num;
  }, z.number().nullable()),
  expenseRecordId: z.preprocess(v => {
    if (v === '' || v === null || v === undefined) return null;
    const num = Number(v);
    return isNaN(num) ? null : num;
  }, z.number().nullable())
});

// Trust asset history schemas
export const insertTrustAssetHistorySchema = createInsertSchema(trustAssetHistory).pick({
  trustId: true,
  assetId: true,
  actionType: true,
  actionBy: true,
  previousValues: true,
  newValues: true,
  changeReason: true,
  changeDescription: true,
  documentationUrl: true,
  assetType: true,
  assetName: true,
  assetValue: true,
  valuationDate: true,
  requiresApproval: true,
  approvedBy: true,
  approvalNotes: true,
  notes: true,
});
export type InsertTrustAssetHistory = z.infer<typeof insertTrustAssetHistorySchema>;
export type TrustAssetHistory = typeof trustAssetHistory.$inferSelect;

export const insertTrustDistributionSchema = createInsertSchema(trustDistributions).pick({
  trustId: true,
  beneficiaryId: true,
  expenseRecordId: true,
  distributionDate: true,
  distributionType: true,
  amount: true,
  description: true,
  purpose: true,
  approvedBy: true,
  paymentMethod: true,
  checkNumber: true,
  taxYear: true,
  taxCategory: true,
  taxWithheld: true,
  distributionNoticeUrl: true,
  taxDocumentUrl: true,
  notes: true,
});

export const insertTrustDocumentSchema = createInsertSchema(trustDocuments).pick({
  trustId: true,
  financialDocumentId: true,
  documentType: true,
  title: true,
  description: true,
  documentUrl: true,
  fileName: true,
  fileSize: true,
  mimeType: true,
  documentDate: true,
  filingDate: true,
  expirationDate: true,
  documentStatus: true,
  version: true,
  requiresFillig: true,
  filingJurisdiction: true,
  filingReference: true,
  confidentialityLevel: true,
  accessibleTo: true,
  generatedBy: true,
  generationSource: true,
  templateUsed: true,
  notes: true,
});

export const insertTrustComplianceSchema = createInsertSchema(trustCompliance).pick({
  trustId: true,
  requirementType: true,
  title: true,
  description: true,
  jurisdiction: true,
  filingAuthority: true,
  frequency: true,
  dueDate: true,
  reminderDate: true,
  filingPeriodStart: true,
  filingPeriodEnd: true,
  status: true,
  filedDate: true,
  filedBy: true,
  confirmationNumber: true,
  documentId: true,
  lateFee: true,
  penalty: true,
  filingFee: true,
  nextDueDate: true,
  notes: true,
});

export const insertTrustMeetingSchema = createInsertSchema(trustMeetings).pick({
  trustId: true,
  meetingType: true,
  title: true,
  description: true,
  meetingDate: true,
  location: true,
  calledBy: true,
  attendees: true,
  agenda: true,
  minutesUrl: true,
  recordingUrl: true,
  resolutions: true,
  nextMeetingDate: true,
  notes: true,
});

// Trust administration types
export type InsertTrustEntity = z.infer<typeof insertTrustEntitySchema>;
export type TrustEntity = typeof trustEntities.$inferSelect;

export type InsertTrustBeneficiary = z.infer<typeof insertTrustBeneficiarySchema>;
export type TrustBeneficiary = typeof trustBeneficiaries.$inferSelect;

export type InsertTrustTrustee = z.infer<typeof insertTrustTrusteeSchema>;
export type TrustTrustee = typeof trustTrustees.$inferSelect;

export type InsertTrustAsset = z.infer<typeof insertTrustAssetSchema>;
export type TrustAsset = typeof trustAssets.$inferSelect;

export type InsertTrustDistribution = z.infer<typeof insertTrustDistributionSchema>;
export type TrustDistribution = typeof trustDistributions.$inferSelect;

export type InsertTrustDocument = z.infer<typeof insertTrustDocumentSchema>;
export type TrustDocument = typeof trustDocuments.$inferSelect;

export type InsertTrustCompliance = z.infer<typeof insertTrustComplianceSchema>;
export type TrustCompliance = typeof trustCompliance.$inferSelect;

export type InsertTrustMeeting = z.infer<typeof insertTrustMeetingSchema>;
export type TrustMeeting = typeof trustMeetings.$inferSelect;

// Industry Tiles (for homepage navigation)
export const industryTiles = pgTable("industry_tiles", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(), // URL-friendly identifier (e.g., "real-estate")
  title: text("title").notNull(), // Display title
  tagline: text("tagline"), // Punchy tagline (e.g., "Stunning Aerial Visuals That Sell Properties Faster")
  subtitle: text("subtitle").notNull(), // Short 2-3 sentence description
  category: text("category").notNull(), // Category label shown on card
  imageUrl: text("image_url").notNull(), // Hero image for the tile
  videoUrl: text("video_url"), // Optional video reel for hero section
  targetPath: text("target_path").notNull(), // URL path (e.g., "/industry/real-estate")
  examples: text("examples").array(), // Array of example use cases displayed on the tile
  exampleImages: text("example_images").array(), // Optional thumbnail images for each example
  displayOrder: integer("display_order").default(100),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Industry Tile to Service associations (many-to-many)
export const industryTileServices = pgTable("industry_tile_services", {
  id: serial("id").primaryKey(),
  tileId: integer("tile_id").notNull().references(() => industryTiles.id, { onDelete: 'cascade' }),
  serviceId: integer("service_id").notNull().references(() => services.id, { onDelete: 'cascade' }),
  displayOrder: integer("display_order").default(100), // Order of service within this tile's page
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const industryTilesRelations = relations(industryTiles, ({ many }) => ({
  tileServices: many(industryTileServices)
}));

export const industryTileServicesRelations = relations(industryTileServices, ({ one }) => ({
  tile: one(industryTiles, {
    fields: [industryTileServices.tileId],
    references: [industryTiles.id]
  }),
  service: one(services, {
    fields: [industryTileServices.serviceId],
    references: [services.id]
  })
}));

export const insertIndustryTileSchema = createInsertSchema(industryTiles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertIndustryTileServiceSchema = createInsertSchema(industryTileServices).omit({
  id: true,
  createdAt: true,
});

export type InsertIndustryTile = z.infer<typeof insertIndustryTileSchema>;
export type IndustryTile = typeof industryTiles.$inferSelect;

export type InsertIndustryTileService = z.infer<typeof insertIndustryTileServiceSchema>;
export type IndustryTileService = typeof industryTileServices.$inferSelect;

// Satisfaction Surveys
export const satisfactionSurveys = pgTable("satisfaction_surveys", {
  id: serial("id").primaryKey(),
  bookingId: integer("booking_id").references(() => bookings.id, { onDelete: 'cascade' }),
  customerId: integer("customer_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  overallRating: integer("overall_rating").notNull(), // 1-5 stars
  serviceQualityRating: integer("service_quality_rating"), // 1-5 stars
  communicationRating: integer("communication_rating"), // 1-5 stars
  timelinessRating: integer("timeliness_rating"), // 1-5 stars
  valueRating: integer("value_rating"), // 1-5 stars
  feedback: text("feedback"), // General feedback
  improvements: text("improvements"), // Areas for improvement
  wouldRecommend: boolean("would_recommend").default(false),
  contactPermission: boolean("contact_permission").default(false), // Permission to follow up
  isTestimonial: boolean("is_testimonial").default(false), // Customer wants to provide testimonial
  publicTestimonial: text("public_testimonial"), // Public testimonial text
  followUpSent: boolean("follow_up_sent").default(false),
  followUpSentAt: timestamp("follow_up_sent_at"),
  submittedAt: timestamp("submitted_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertSatisfactionSurveySchema = createInsertSchema(satisfactionSurveys).pick({
  bookingId: true,
  customerId: true,
  overallRating: true,
  serviceQualityRating: true,
  communicationRating: true,
  timelinessRating: true,
  valueRating: true,
  feedback: true,
  improvements: true,
  wouldRecommend: true,
  contactPermission: true,
  isTestimonial: true,
  publicTestimonial: true,
});

export type InsertSatisfactionSurvey = z.infer<typeof insertSatisfactionSurveySchema>;
export type SatisfactionSurvey = typeof satisfactionSurveys.$inferSelect;


// Email Campaigns for CRM
export const emailCampaigns = pgTable("email_campaigns", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  subject: text("subject").notNull(),
  content: text("content").notNull(),
  type: text("type").notNull().default("newsletter"), // newsletter, drip, follow-up, promotional
  status: text("status").notNull().default("draft"), // draft, scheduled, active, paused, completed
  targetAudience: text("target_audience"), // all, leads, customers, inactive
  scheduledAt: timestamp("scheduled_at"),
  sentAt: timestamp("sent_at"),
  recipientCount: integer("recipient_count").default(0),
  openCount: integer("open_count").default(0),
  clickCount: integer("click_count").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertEmailCampaignSchema = createInsertSchema(emailCampaigns).pick({
  name: true,
  subject: true,
  content: true,
  type: true,
  status: true,
  targetAudience: true,
  scheduledAt: true,
});

export type InsertEmailCampaign = z.infer<typeof insertEmailCampaignSchema>;
export type EmailCampaign = typeof emailCampaigns.$inferSelect;

// Lead Scoring for CRM
export const leadScores = pgTable("lead_scores", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id").notNull().references(() => customers.id, { onDelete: 'cascade' }),
  score: integer("score").notNull().default(0),
  grade: text("grade").default("C"), // A, B, C, D, F
  engagementScore: integer("engagement_score").default(0), // Website visits, email opens
  fitScore: integer("fit_score").default(0), // How well they match ideal customer profile
  behaviorScore: integer("behavior_score").default(0), // Actions taken (bookings, inquiries)
  lastActivityDate: timestamp("last_activity_date"),
  conversionProbability: integer("conversion_probability").default(0), // 0-100%
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const leadScoresRelations = relations(leadScores, ({ one }) => ({
  customer: one(customers, {
    fields: [leadScores.customerId],
    references: [customers.id],
  }),
}));

export const insertLeadScoreSchema = createInsertSchema(leadScores).pick({
  customerId: true,
  score: true,
  grade: true,
  engagementScore: true,
  fitScore: true,
  behaviorScore: true,
  lastActivityDate: true,
  conversionProbability: true,
  notes: true,
});

export type InsertLeadScore = z.infer<typeof insertLeadScoreSchema>;
export type LeadScore = typeof leadScores.$inferSelect;

// Hero Carousel Slides — admin-managed images/videos shown on the homepage hero.
// Stored in the database so defaults survive clearing localStorage or switching browsers.
export const heroSlides = pgTable("hero_slides", {
  id: serial("id").primaryKey(),
  type: text("type").notNull().default("image"), // "image" or "video"
  title: text("title").notNull(),
  url: text("url").notNull(),
  displayOrder: integer("display_order").default(100).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertHeroSlideSchema = createInsertSchema(heroSlides, {
  type: z.enum(["image", "video"]),
  title: z.string().min(1, "Title is required"),
  url: z.string().min(1, "URL is required"),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertHeroSlide = z.infer<typeof insertHeroSlideSchema>;
export type HeroSlide = typeof heroSlides.$inferSelect;

// Business Asset Registry — tracks owned assets with depreciation for job costing
export const businessAssets = pgTable("business_assets", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  type: varchar("type", { length: 50 }).notNull().default("other"), // drone | vehicle | equipment | software | other
  description: text("description"),
  serialNumber: varchar("serial_number", { length: 255 }),
  purchasePrice: numeric("purchase_price", { precision: 12, scale: 2 }).notNull(),
  purchaseDate: date("purchase_date").notNull(),
  salvageValue: numeric("salvage_value", { precision: 12, scale: 2 }).default("0"),
  usefulLifeYears: integer("useful_life_years").notNull().default(5),
  expectedReplacementDate: date("expected_replacement_date"),
  depreciationMethod: varchar("depreciation_method", { length: 30 }).notNull().default("straight-line"), // straight-line | macrs-5 | section-179
  // Vehicle-specific fields
  vehicleMileageMethod: varchar("vehicle_mileage_method", { length: 20 }), // actual | standard
  totalMilesAtPurchase: integer("total_miles_at_purchase"),
  currentMiles: integer("current_miles"),
  // Insurance cost allocated to this asset
  monthlyInsuranceCost: numeric("monthly_insurance_cost", { precision: 10, scale: 2 }).default("0"),
  isActive: boolean("is_active").default(true).notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertBusinessAssetSchema = createInsertSchema(businessAssets).pick({
  name: true,
  type: true,
  description: true,
  serialNumber: true,
  purchasePrice: true,
  purchaseDate: true,
  salvageValue: true,
  usefulLifeYears: true,
  expectedReplacementDate: true,
  depreciationMethod: true,
  vehicleMileageMethod: true,
  totalMilesAtPurchase: true,
  currentMiles: true,
  monthlyInsuranceCost: true,
  isActive: true,
  notes: true,
}).extend({
  purchasePrice: z.preprocess(v => v === '' ? null : Number(v), z.number().positive()),
  salvageValue: z.preprocess(v => v === '' || v === null || v === undefined ? 0 : Number(v), z.number().min(0)).optional(),
  monthlyInsuranceCost: z.preprocess(v => v === '' || v === null || v === undefined ? 0 : Number(v), z.number().min(0)).optional(),
});

export type InsertBusinessAsset = z.infer<typeof insertBusinessAssetSchema>;
export type BusinessAsset = typeof businessAssets.$inferSelect;

// Service-level deliverable templates — defines what deliverables a service
// produces by default. Used by DeliverablesManagement admin page.
export const serviceDeliverables = pgTable("service_deliverables", {
  id: serial("id").primaryKey(),
  serviceId: integer("service_id").notNull().references(() => services.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  defaultDaysToComplete: integer("default_days_to_complete").default(7),
  displayOrder: integer("display_order").default(0),
  isRequired: boolean("is_required").default(true),
  defaultExternalUrlLabel: varchar("default_external_url_label", { length: 255 }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const insertServiceDeliverableSchema = createInsertSchema(serviceDeliverables).pick({
  serviceId: true,
  name: true,
  description: true,
  defaultDaysToComplete: true,
  displayOrder: true,
  isRequired: true,
  defaultExternalUrlLabel: true,
});

export type InsertServiceDeliverable = z.infer<typeof insertServiceDeliverableSchema>;
export type ServiceDeliverable = typeof serviceDeliverables.$inferSelect;

// Client-facing deliverable files shared with customers (with expiry dates).
// Matches the client_files table created by server/migrations/add-client-files.ts.
export const clientFiles = pgTable("client_files", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull().references(() => customers.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  fileUrl: text("file_url").notNull(),
  fileType: varchar("file_type", { length: 50 }).notNull(),
  thumbnailUrl: text("thumbnail_url"),
  size: integer("size").notNull(),
  uploadedAt: timestamp("uploaded_at", { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  isPublic: boolean("is_public").notNull().default(false),
  bookingId: integer("booking_id").references(() => bookings.id, { onDelete: "set null" }),
  projectId: integer("project_id").references(() => clientProjects.id, { onDelete: "set null" }),
});

export type ClientFile = typeof clientFiles.$inferSelect;

// Express session store table (managed by connect-pg-simple, not by app code).
// Declared here so drizzle-kit treats it as part of the schema and never proposes
// to drop it during a `db:push`.
export const session = pgTable(
  "session",
  {
    sid: varchar("sid").primaryKey().notNull(),
    sess: json("sess").notNull(),
    expire: timestamp("expire", { precision: 6, mode: "date" }).notNull(),
  },
  (table) => ({
    expireIdx: index("IDX_session_expire").on(table.expire),
  }),
);

// Tracks which one-off SQL migration scripts under `server/migrations/` have run.
// Mirrored here so drizzle-kit recognises the live table and leaves it alone.
export const schemaMigrations = pgTable("schema_migrations", {
  key: text("key").primaryKey().notNull(),
  appliedAt: timestamp("applied_at").defaultNow().notNull(),
});

// Export operational efficiency and customer experience schemas
export * from "./operational-schema";
export * from "./pricing-schema";
export * from "./customer-experience-schema";

// Re-export the standalone add-ons table so drizzle-kit sees it as part of the
// active schema. `serviceAddons` is intentionally NOT re-exported here because
// it is already defined above in this file.
export { addons } from "./addons-schema";

// Service types removed - already declared above
