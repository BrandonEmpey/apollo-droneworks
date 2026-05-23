import { pgTable, serial, text, varchar, timestamp, boolean, integer, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Customer Experience Feature 1: Self-Service Client Portal
export const clientPortalAccess = pgTable("client_portal_access", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull(),
  accessToken: varchar("access_token", { length: 255 }).notNull(),
  lastLogin: timestamp("last_login"),
  isActive: boolean("is_active").default(true),
  preferences: jsonb("preferences").$type<{
    notifications: {
      email: boolean;
      sms: boolean;
      push: boolean;
    };
    dashboard: {
      defaultView: string;
      autoRefresh: boolean;
    };
    privacy: {
      shareProgress: boolean;
      allowTestimonials: boolean;
    };
  }>(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const clientDashboardWidgets = pgTable("client_dashboard_widgets", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull(),
  widgetType: varchar("widget_type", { length: 100 }).notNull(), // project_status, recent_files, upcoming_deliveries, billing_summary
  position: integer("position").notNull(),
  isVisible: boolean("is_visible").default(true),
  configuration: jsonb("configuration"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// Customer Experience Feature 2: Real-time Project Updates
export const projectUpdates = pgTable("project_updates", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull(),
  clientId: integer("client_id").notNull(),
  updateType: varchar("update_type", { length: 50 }).notNull(), // progress, milestone, delay, completion, file_upload
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description").notNull(),
  visibility: varchar("visibility", { length: 20 }).default("client"), // client, internal, public
  attachments: jsonb("attachments").$type<Array<{
    filename: string;
    url: string;
    type: string;
    size: number;
  }>>(),
  readBy: jsonb("read_by").$type<Array<{
    userId: number;
    readAt: Date;
  }>>(),
  createdBy: integer("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow()
});

export const projectMilestones = pgTable("project_milestones", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  dueDate: timestamp("due_date").notNull(),
  completedDate: timestamp("completed_date"),
  status: varchar("status", { length: 50 }).default("pending"), // pending, in_progress, completed, overdue
  clientVisible: boolean("client_visible").default(true),
  completionNotes: text("completion_notes"),
  deliverables: jsonb("deliverables").$type<Array<{
    name: string;
    description: string;
    completed: boolean;
    fileUrl?: string;
  }>>(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// Customer Experience Feature 4: Mobile-Responsive Interface
export const mobileAppSessions = pgTable("mobile_app_sessions", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull(),
  deviceType: varchar("device_type", { length: 50 }).notNull(), // ios, android, mobile_web
  deviceId: varchar("device_id", { length: 255 }),
  sessionStart: timestamp("session_start").defaultNow(),
  sessionEnd: timestamp("session_end"),
  actions: jsonb("actions").$type<Array<{
    action: string;
    timestamp: Date;
    metadata?: any;
  }>>(),
  appVersion: varchar("app_version", { length: 50 }),
  osVersion: varchar("os_version", { length: 50 }),
  isActive: boolean("is_active").default(true)
});

export const responsiveSettings = pgTable("responsive_settings", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull(),
  deviceType: varchar("device_type", { length: 50 }).notNull(),
  layout: jsonb("layout").$type<{
    gridColumns: number;
    compactMode: boolean;
    fontSize: string;
    imageQuality: string;
  }>(),
  performance: jsonb("performance").$type<{
    lazyLoading: boolean;
    compressionLevel: number;
    cacheSettings: string;
  }>(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// Customer Experience Feature 5: Automated Notifications
export const notificationSubscriptions = pgTable("notification_subscriptions", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull(),
  subscriptionType: varchar("subscription_type", { length: 100 }).notNull(), // project_updates, milestone_completion, file_delivery, billing_alerts
  channel: varchar("channel", { length: 50 }).notNull(), // email, sms, push, in_app
  isEnabled: boolean("is_enabled").default(true),
  frequency: varchar("frequency", { length: 50 }).default("immediate"), // immediate, daily, weekly, milestone_only
  filterCriteria: jsonb("filter_criteria").$type<{
    projectTypes?: string[];
    priorities?: string[];
    updateTypes?: string[];
  }>(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const deliveredNotifications = pgTable("delivered_notifications", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull(),
  subscriptionId: integer("subscription_id").references(() => notificationSubscriptions.id),
  templateType: varchar("template_type", { length: 100 }).notNull(),
  channel: varchar("channel", { length: 50 }).notNull(),
  recipient: varchar("recipient", { length: 255 }).notNull(),
  subject: varchar("subject", { length: 255 }),
  content: text("content").notNull(),
  metadata: jsonb("metadata"),
  status: varchar("status", { length: 50 }).default("sent"), // sent, delivered, opened, clicked, failed
  sentAt: timestamp("sent_at").defaultNow(),
  deliveredAt: timestamp("delivered_at"),
  openedAt: timestamp("opened_at"),
  clickedAt: timestamp("clicked_at"),
  failureReason: text("failure_reason")
});

// Enhanced Client File Sharing
export const clientFileAccess = pgTable("client_file_access", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull(),
  projectId: integer("project_id").notNull(),
  fileUrl: varchar("file_url", { length: 500 }).notNull(),
  fileName: varchar("file_name", { length: 255 }).notNull(),
  fileType: varchar("file_type", { length: 100 }).notNull(),
  fileSize: integer("file_size").notNull(),
  accessLevel: varchar("access_level", { length: 50 }).default("view"), // view, download, edit
  downloadCount: integer("download_count").default(0),
  lastAccessed: timestamp("last_accessed"),
  expiresAt: timestamp("expires_at"),
  isActive: boolean("is_active").default(true),
  uploadedBy: integer("uploaded_by").notNull(),
  createdAt: timestamp("created_at").defaultNow()
});

export const fileDownloadLogs = pgTable("file_download_logs", {
  id: serial("id").primaryKey(),
  fileAccessId: integer("file_access_id").references(() => clientFileAccess.id),
  clientId: integer("client_id").notNull(),
  downloadedAt: timestamp("downloaded_at").defaultNow(),
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  downloadDuration: integer("download_duration"), // in seconds
  completed: boolean("completed").default(true)
});

// Client Feedback and Communication
export const clientFeedback = pgTable("client_feedback", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull(),
  projectId: integer("project_id"),
  feedbackType: varchar("feedback_type", { length: 50 }).notNull(), // service_quality, communication, timeline, suggestion, complaint
  rating: integer("rating"), // 1-5 scale
  subject: varchar("subject", { length: 255 }).notNull(),
  content: text("content").notNull(),
  attachments: jsonb("attachments").$type<Array<{
    filename: string;
    url: string;
    type: string;
  }>>(),
  status: varchar("status", { length: 50 }).default("pending"), // pending, acknowledged, resolved, escalated
  adminResponse: text("admin_response"),
  respondedBy: integer("responded_by"),
  respondedAt: timestamp("responded_at"),
  priority: varchar("priority", { length: 20 }).default("medium"), // low, medium, high, urgent
  tags: jsonb("tags").$type<string[]>(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const communicationThreads = pgTable("communication_threads", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull(),
  projectId: integer("project_id"),
  subject: varchar("subject", { length: 255 }).notNull(),
  status: varchar("status", { length: 50 }).default("active"), // active, closed, archived
  priority: varchar("priority", { length: 20 }).default("normal"), // low, normal, high, urgent
  lastMessageAt: timestamp("last_message_at").defaultNow(),
  createdBy: integer("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow()
});

export const communicationMessages = pgTable("communication_messages", {
  id: serial("id").primaryKey(),
  threadId: integer("thread_id").references(() => communicationThreads.id),
  senderId: integer("sender_id").notNull(),
  senderType: varchar("sender_type", { length: 20 }).notNull(), // client, admin, system
  content: text("content").notNull(),
  attachments: jsonb("attachments").$type<Array<{
    filename: string;
    url: string;
    type: string;
    size: number;
  }>>(),
  readBy: jsonb("read_by").$type<Array<{
    userId: number;
    readAt: Date;
  }>>(),
  messageType: varchar("message_type", { length: 50 }).default("text"), // text, file, system_notification, status_update
  createdAt: timestamp("created_at").defaultNow()
});

// Insert and Select schemas
export const insertClientPortalAccess = createInsertSchema(clientPortalAccess).omit({ id: true, createdAt: true, updatedAt: true });
export const insertClientDashboardWidget = createInsertSchema(clientDashboardWidgets).omit({ id: true, createdAt: true, updatedAt: true });
export const insertProjectUpdate = createInsertSchema(projectUpdates).omit({ id: true, createdAt: true });
export const insertProjectMilestone = createInsertSchema(projectMilestones).omit({ id: true, createdAt: true, updatedAt: true });
export const insertMobileAppSession = createInsertSchema(mobileAppSessions).omit({ id: true });
export const insertResponsiveSetting = createInsertSchema(responsiveSettings).omit({ id: true, updatedAt: true });
export const insertNotificationSubscription = createInsertSchema(notificationSubscriptions).omit({ id: true, createdAt: true, updatedAt: true });
export const insertDeliveredNotification = createInsertSchema(deliveredNotifications).omit({ id: true, sentAt: true });
export const insertClientFileAccess = createInsertSchema(clientFileAccess).omit({ id: true, createdAt: true });
export const insertFileDownloadLog = createInsertSchema(fileDownloadLogs).omit({ id: true, downloadedAt: true });
export const insertClientFeedback = createInsertSchema(clientFeedback).omit({ id: true, createdAt: true, updatedAt: true });
export const insertCommunicationThread = createInsertSchema(communicationThreads).omit({ id: true, createdAt: true });
export const insertCommunicationMessage = createInsertSchema(communicationMessages).omit({ id: true, createdAt: true });

// Types
export type ClientPortalAccess = typeof clientPortalAccess.$inferSelect;
export type ClientDashboardWidget = typeof clientDashboardWidgets.$inferSelect;
export type ProjectUpdate = typeof projectUpdates.$inferSelect;
export type ProjectMilestone = typeof projectMilestones.$inferSelect;
export type MobileAppSession = typeof mobileAppSessions.$inferSelect;
export type ResponsiveSetting = typeof responsiveSettings.$inferSelect;
export type NotificationSubscription = typeof notificationSubscriptions.$inferSelect;
export type DeliveredNotification = typeof deliveredNotifications.$inferSelect;
export type ClientFileAccess = typeof clientFileAccess.$inferSelect;
export type FileDownloadLog = typeof fileDownloadLogs.$inferSelect;
export type ClientFeedback = typeof clientFeedback.$inferSelect;
export type CommunicationThread = typeof communicationThreads.$inferSelect;
export type CommunicationMessage = typeof communicationMessages.$inferSelect;

export type InsertClientPortalAccess = z.infer<typeof insertClientPortalAccess>;
export type InsertClientDashboardWidget = z.infer<typeof insertClientDashboardWidget>;
export type InsertProjectUpdate = z.infer<typeof insertProjectUpdate>;
export type InsertProjectMilestone = z.infer<typeof insertProjectMilestone>;
export type InsertMobileAppSession = z.infer<typeof insertMobileAppSession>;
export type InsertResponsiveSetting = z.infer<typeof insertResponsiveSetting>;
export type InsertNotificationSubscription = z.infer<typeof insertNotificationSubscription>;
export type InsertDeliveredNotification = z.infer<typeof insertDeliveredNotification>;
export type InsertClientFileAccess = z.infer<typeof insertClientFileAccess>;
export type InsertFileDownloadLog = z.infer<typeof insertFileDownloadLog>;
export type InsertClientFeedback = z.infer<typeof insertClientFeedback>;
export type InsertCommunicationThread = z.infer<typeof insertCommunicationThread>;
export type InsertCommunicationMessage = z.infer<typeof insertCommunicationMessage>;