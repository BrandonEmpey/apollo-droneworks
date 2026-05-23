import { pgTable, serial, text, varchar, timestamp, boolean, integer, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Operational Efficiency Feature 1: Automated Workflow Management
export const workflowTemplates = pgTable("workflow_templates", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  steps: jsonb("steps").$type<Array<{
    id: string;
    name: string;
    description: string;
    assignedRole: string;
    estimatedDuration: number;
    dependencies: string[];
    autoComplete: boolean;
  }>>().notNull(),
  serviceType: varchar("service_type", { length: 100 }),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const projectWorkflows = pgTable("project_workflows", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull(),
  templateId: integer("template_id").references(() => workflowTemplates.id),
  currentStep: integer("current_step").default(0),
  status: varchar("status", { length: 50 }).default("active"), // active, completed, paused, cancelled
  steps: jsonb("steps").$type<Array<{
    id: string;
    name: string;
    status: "pending" | "in_progress" | "completed" | "skipped";
    assignedTo: number;
    startedAt?: Date;
    completedAt?: Date;
    notes?: string;
  }>>().notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// Operational Efficiency Feature 2: Real-time Project Tracking
export const projectTracking = pgTable("project_tracking", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull(),
  phase: varchar("phase", { length: 100 }).notNull(), // planning, pre_flight, flight, processing, delivery, completed
  status: varchar("status", { length: 50 }).notNull(), // on_track, delayed, at_risk, completed
  progressPercentage: integer("progress_percentage").default(0),
  estimatedCompletion: timestamp("estimated_completion"),
  actualCompletion: timestamp("actual_completion"),
  milestones: jsonb("milestones").$type<Array<{
    id: string;
    name: string;
    dueDate: Date;
    completed: boolean;
    completedAt?: Date;
  }>>(),
  blockers: jsonb("blockers").$type<Array<{
    id: string;
    description: string;
    severity: "low" | "medium" | "high" | "critical";
    createdAt: Date;
    resolvedAt?: Date;
  }>>(),
  lastUpdate: timestamp("last_update").defaultNow(),
  createdAt: timestamp("created_at").defaultNow()
});

// Operational Efficiency Feature 3: Equipment Scheduling Optimization
export const equipmentSchedule = pgTable("equipment_schedule", {
  id: serial("id").primaryKey(),
  equipmentId: varchar("equipment_id", { length: 100 }).notNull(),
  equipmentName: varchar("equipment_name", { length: 255 }).notNull(),
  projectId: integer("project_id"),
  bookingId: integer("booking_id"),
  scheduledStart: timestamp("scheduled_start").notNull(),
  scheduledEnd: timestamp("scheduled_end").notNull(),
  actualStart: timestamp("actual_start"),
  actualEnd: timestamp("actual_end"),
  status: varchar("status", { length: 50 }).default("scheduled"), // scheduled, in_use, maintenance, available
  location: varchar("location", { length: 255 }),
  operator: varchar("operator", { length: 255 }),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const equipmentMaintenance = pgTable("equipment_maintenance", {
  id: serial("id").primaryKey(),
  equipmentId: varchar("equipment_id", { length: 100 }).notNull(),
  maintenanceType: varchar("maintenance_type", { length: 100 }).notNull(), // scheduled, repair, inspection, upgrade
  description: text("description").notNull(),
  scheduledDate: timestamp("scheduled_date").notNull(),
  completedDate: timestamp("completed_date"),
  cost: integer("cost"), // in cents
  technician: varchar("technician", { length: 255 }),
  status: varchar("status", { length: 50 }).default("scheduled"), // scheduled, in_progress, completed, cancelled
  priority: varchar("priority", { length: 20 }).default("medium"), // low, medium, high, urgent
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// Operational Efficiency Feature 4: Client Communication Automation
export const communicationTemplates = pgTable("communication_templates", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  type: varchar("type", { length: 50 }).notNull(), // email, sms, push_notification
  trigger: varchar("trigger", { length: 100 }).notNull(), // project_start, milestone_complete, delay_alert, completion
  subject: varchar("subject", { length: 255 }),
  content: text("content").notNull(),
  variables: jsonb("variables").$type<Array<{
    key: string;
    description: string;
    defaultValue?: string;
  }>>(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const communicationLog = pgTable("communication_log", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull(),
  projectId: integer("project_id"),
  templateId: integer("template_id").references(() => communicationTemplates.id),
  type: varchar("type", { length: 50 }).notNull(),
  recipient: varchar("recipient", { length: 255 }).notNull(),
  subject: varchar("subject", { length: 255 }),
  content: text("content").notNull(),
  status: varchar("status", { length: 50 }).default("sent"), // sent, delivered, failed, opened, clicked
  sentAt: timestamp("sent_at").defaultNow(),
  deliveredAt: timestamp("delivered_at"),
  openedAt: timestamp("opened_at"),
  metadata: jsonb("metadata")
});

// Operational Efficiency Feature 5: Performance Analytics Dashboard
export const performanceMetrics = pgTable("performance_metrics", {
  id: serial("id").primaryKey(),
  metricType: varchar("metric_type", { length: 100 }).notNull(), // project_completion, client_satisfaction, revenue_per_hour, equipment_utilization
  value: integer("value").notNull(),
  unit: varchar("unit", { length: 50 }), // percentage, dollars, hours, count
  period: varchar("period", { length: 50 }).notNull(), // daily, weekly, monthly, quarterly
  periodStart: timestamp("period_start").notNull(),
  periodEnd: timestamp("period_end").notNull(),
  projectId: integer("project_id"),
  serviceId: integer("service_id"),
  clientId: integer("client_id"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow()
});

export const operationalAlerts = pgTable("operational_alerts", {
  id: serial("id").primaryKey(),
  type: varchar("type", { length: 100 }).notNull(), // schedule_conflict, equipment_maintenance, project_delay, weather_alert
  severity: varchar("severity", { length: 20 }).notNull(), // info, warning, error, critical
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description").notNull(),
  entityType: varchar("entity_type", { length: 50 }), // project, equipment, booking, client
  entityId: integer("entity_id"),
  isAcknowledged: boolean("is_acknowledged").default(false),
  acknowledgedBy: integer("acknowledged_by"),
  acknowledgedAt: timestamp("acknowledged_at"),
  resolvedAt: timestamp("resolved_at"),
  autoResolve: boolean("auto_resolve").default(false),
  createdAt: timestamp("created_at").defaultNow()
});

// Insert and Select schemas
export const insertWorkflowTemplate = createInsertSchema(workflowTemplates).omit({ id: true, createdAt: true, updatedAt: true });
export const insertProjectWorkflow = createInsertSchema(projectWorkflows).omit({ id: true, createdAt: true, updatedAt: true });
export const insertProjectTracking = createInsertSchema(projectTracking).omit({ id: true, createdAt: true });
export const insertEquipmentSchedule = createInsertSchema(equipmentSchedule).omit({ id: true, createdAt: true, updatedAt: true });
export const insertEquipmentMaintenance = createInsertSchema(equipmentMaintenance).omit({ id: true, createdAt: true, updatedAt: true });
export const insertCommunicationTemplate = createInsertSchema(communicationTemplates).omit({ id: true, createdAt: true, updatedAt: true });
export const insertCommunicationLog = createInsertSchema(communicationLog).omit({ id: true, sentAt: true });
export const insertPerformanceMetric = createInsertSchema(performanceMetrics).omit({ id: true, createdAt: true });
export const insertOperationalAlert = createInsertSchema(operationalAlerts).omit({ id: true, createdAt: true });

// Types
export type WorkflowTemplate = typeof workflowTemplates.$inferSelect;
export type ProjectWorkflow = typeof projectWorkflows.$inferSelect;
export type ProjectTracking = typeof projectTracking.$inferSelect;
export type EquipmentSchedule = typeof equipmentSchedule.$inferSelect;
export type EquipmentMaintenance = typeof equipmentMaintenance.$inferSelect;
export type CommunicationTemplate = typeof communicationTemplates.$inferSelect;
export type CommunicationLog = typeof communicationLog.$inferSelect;
export type PerformanceMetric = typeof performanceMetrics.$inferSelect;
export type OperationalAlert = typeof operationalAlerts.$inferSelect;

export type InsertWorkflowTemplate = z.infer<typeof insertWorkflowTemplate>;
export type InsertProjectWorkflow = z.infer<typeof insertProjectWorkflow>;
export type InsertProjectTracking = z.infer<typeof insertProjectTracking>;
export type InsertEquipmentSchedule = z.infer<typeof insertEquipmentSchedule>;
export type InsertEquipmentMaintenance = z.infer<typeof insertEquipmentMaintenance>;
export type InsertCommunicationTemplate = z.infer<typeof insertCommunicationTemplate>;
export type InsertCommunicationLog = z.infer<typeof insertCommunicationLog>;
export type InsertPerformanceMetric = z.infer<typeof insertPerformanceMetric>;
export type InsertOperationalAlert = z.infer<typeof insertOperationalAlert>;