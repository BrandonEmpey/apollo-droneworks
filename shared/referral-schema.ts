import {
  pgTable,
  serial,
  varchar,
  text,
  timestamp,
  boolean,
  integer,
  numeric,
  jsonb
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Referral Programs table
export const referralPrograms = pgTable("referral_programs", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  referrerRewardType: varchar("referrer_reward_type", { length: 50 }).notNull(), // 'percentage', 'fixed_amount', 'service_credit'
  referrerRewardValue: numeric("referrer_reward_value", { precision: 10, scale: 2 }).notNull(),
  refereeRewardType: varchar("referee_reward_type", { length: 50 }).notNull(),
  refereeRewardValue: numeric("referee_reward_value", { precision: 10, scale: 2 }).notNull(),
  minimumOrderValue: numeric("minimum_order_value", { precision: 10, scale: 2 }),
  maxRewardsPerReferrer: integer("max_rewards_per_referrer"),
  isActive: boolean("is_active").default(true).notNull(),
  startDate: timestamp("start_date").defaultNow().notNull(),
  endDate: timestamp("end_date"),
  termsAndConditions: text("terms_and_conditions"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});

// Referral Codes table
export const referralCodes = pgTable("referral_codes", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 50 }).unique().notNull(),
  referrerId: integer("referrer_id").notNull(), // References customers table
  programId: integer("program_id").references(() => referralPrograms.id).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  usageCount: integer("usage_count").default(0).notNull(),
  maxUsage: integer("max_usage"),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});

// Referral Tracking table
export const referralTracking = pgTable("referral_tracking", {
  id: serial("id").primaryKey(),
  referralCodeId: integer("referral_code_id").references(() => referralCodes.id).notNull(),
  referrerId: integer("referrer_id").notNull(),
  refereeId: integer("referee_id").notNull(),
  orderId: integer("order_id"), // References bookings/orders table
  status: varchar("status", { length: 50 }).notNull(), // 'pending', 'completed', 'cancelled', 'paid'
  orderValue: numeric("order_value", { precision: 10, scale: 2 }),
  referrerRewardAmount: numeric("referrer_reward_amount", { precision: 10, scale: 2 }),
  refereeRewardAmount: numeric("referee_reward_amount", { precision: 10, scale: 2 }),
  rewardPaidAt: timestamp("reward_paid_at"),
  metadata: jsonb("metadata"), // Additional tracking data
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});

// Satisfaction Surveys table
export const satisfactionSurveys = pgTable("satisfaction_surveys", {
  id: serial("id").primaryKey(),
  bookingId: integer("booking_id").notNull(),
  customerId: integer("customer_id").notNull(),
  overallRating: integer("overall_rating").notNull(), // 1-5 stars
  serviceQualityRating: integer("service_quality_rating"),
  communicationRating: integer("communication_rating"),
  timelinessRating: integer("timeliness_rating"),
  valueRating: integer("value_rating"),
  feedback: text("feedback"),
  improvements: text("improvements"),
  wouldRecommend: boolean("would_recommend"),
  contactPermission: boolean("contact_permission").default(false),
  isTestimonial: boolean("is_testimonial").default(false),
  publicTestimonial: text("public_testimonial"),
  submittedAt: timestamp("submitted_at").defaultNow().notNull(),
  followUpSent: boolean("follow_up_sent").default(false),
  followUpSentAt: timestamp("follow_up_sent_at")
});

// Service Credits table for referral rewards
export const serviceCredits = pgTable("service_credits", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id").notNull(),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  source: varchar("source", { length: 100 }).notNull(), // 'referral', 'promotion', 'refund', etc.
  sourceId: integer("source_id"), // References the source record (referral_tracking.id, etc.)
  isUsed: boolean("is_used").default(false).notNull(),
  usedAt: timestamp("used_at"),
  usedForOrderId: integer("used_for_order_id"),
  expiresAt: timestamp("expires_at"),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull()
});

// Insert schemas
export const insertReferralProgramSchema = createInsertSchema(referralPrograms).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertReferralCodeSchema = createInsertSchema(referralCodes).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertReferralTrackingSchema = createInsertSchema(referralTracking).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertSatisfactionSurveySchema = createInsertSchema(satisfactionSurveys).omit({
  id: true,
  submittedAt: true
});

export const insertServiceCreditSchema = createInsertSchema(serviceCredits).omit({
  id: true,
  createdAt: true
});

// Types
export type ReferralProgram = typeof referralPrograms.$inferSelect;
export type InsertReferralProgram = z.infer<typeof insertReferralProgramSchema>;

export type ReferralCode = typeof referralCodes.$inferSelect;
export type InsertReferralCode = z.infer<typeof insertReferralCodeSchema>;

export type ReferralTracking = typeof referralTracking.$inferSelect;
export type InsertReferralTracking = z.infer<typeof insertReferralTrackingSchema>;

export type SatisfactionSurvey = typeof satisfactionSurveys.$inferSelect;
export type InsertSatisfactionSurvey = z.infer<typeof insertSatisfactionSurveySchema>;

export type ServiceCredit = typeof serviceCredits.$inferSelect;
export type InsertServiceCredit = z.infer<typeof insertServiceCreditSchema>;