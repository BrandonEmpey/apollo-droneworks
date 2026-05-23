import { pgTable, serial, text, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { services } from "./schema";

// Standalone add-ons table
export const addons = pgTable("addons", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  tooltipDescription: text("tooltip_description").notNull(),
  price: integer("price").notNull().default(0), // Price in cents
  pricingType: text("pricing_type").notNull().default("fixed"), // "fixed" or "percentage"
  percentage: integer("percentage").default(0), // Percentage value (e.g., 50 for 50%)
  isActive: boolean("is_active").default(true).notNull(),
  displayOrder: integer("display_order").default(999),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Junction table for service-addon relationships
export const serviceAddons = pgTable("service_addons", {
  id: serial("id").primaryKey(),
  serviceId: integer("service_id").notNull().references(() => services.id, { onDelete: 'cascade' }),
  addonId: integer("addon_id").notNull().references(() => addons.id, { onDelete: 'cascade' }),
  isEnabled: boolean("is_enabled").default(true).notNull(),
  customPrice: integer("custom_price"), // Optional custom price override for this service-addon combination
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Relations
export const addonsRelations = relations(addons, ({ many }) => ({
  serviceAddons: many(serviceAddons)
}));

export const serviceAddonsRelations = relations(serviceAddons, ({ one }) => ({
  service: one(services, {
    fields: [serviceAddons.serviceId],
    references: [services.id]
  }),
  addon: one(addons, {
    fields: [serviceAddons.addonId],
    references: [addons.id]
  })
}));

// Zod schemas
export const insertAddonSchema = createInsertSchema(addons).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertServiceAddonSchema = createInsertSchema(serviceAddons).omit({
  id: true,
  createdAt: true,
});

export type Addon = typeof addons.$inferSelect;
export type InsertAddon = typeof addons.$inferInsert;
export type ServiceAddon = typeof serviceAddons.$inferSelect;
export type InsertServiceAddon = typeof serviceAddons.$inferInsert;