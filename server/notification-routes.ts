import { Express } from "express";
import { db } from "./db";
import { notifications } from "@shared/schema";
import { eq, desc, and } from "drizzle-orm";
import { requireAuth } from "./auth";

interface NotificationData {
  userId: number;
  type: string;
  title: string;
  message: string;
  metadata?: any;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
}

export function registerNotificationRoutes(app: Express) {
  
  // Get notifications for current user
  app.get("/api/notifications", requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const limit = parseInt(req.query.limit as string) || 50;
      const unreadOnly = req.query.unreadOnly === 'true';
      
      let query = db.select()
        .from(notifications)
        .where(eq(notifications.userId, userId))
        .orderBy(desc(notifications.createdAt))
        .limit(limit);
      
      if (unreadOnly) {
        query = query.where(
          and(
            eq(notifications.userId, userId),
            eq(notifications.isRead, false)
          )
        );
      }
      
      const results = await query;
      res.json(results);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      res.status(500).json({ message: "Failed to fetch notifications" });
    }
  });

  // Get unread notification count
  app.get("/api/notifications/unread-count", requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      
      const result = await db.select({ count: notifications.id })
        .from(notifications)
        .where(
          and(
            eq(notifications.userId, userId),
            eq(notifications.isRead, false)
          )
        );
      
      res.json({ count: result.length });
    } catch (error) {
      console.error("Error fetching notification count:", error);
      res.status(500).json({ message: "Failed to fetch notification count" });
    }
  });

  // Mark notification as read
  app.put("/api/notifications/:id/read", requireAuth, async (req: any, res) => {
    try {
      const notificationId = parseInt(req.params.id);
      const userId = req.user.id;
      
      await db.update(notifications)
        .set({ isRead: true, updatedAt: new Date() })
        .where(
          and(
            eq(notifications.id, notificationId),
            eq(notifications.userId, userId)
          )
        );
      
      res.json({ message: "Notification marked as read" });
    } catch (error) {
      console.error("Error marking notification as read:", error);
      res.status(500).json({ message: "Failed to mark notification as read" });
    }
  });

  // Mark all notifications as read
  app.put("/api/notifications/mark-all-read", requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      
      await db.update(notifications)
        .set({ isRead: true, updatedAt: new Date() })
        .where(eq(notifications.userId, userId));
      
      res.json({ message: "All notifications marked as read" });
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
      res.status(500).json({ message: "Failed to mark all notifications as read" });
    }
  });

  // Delete notification
  app.delete("/api/notifications/:id", requireAuth, async (req: any, res) => {
    try {
      const notificationId = parseInt(req.params.id);
      const userId = req.user.id;
      
      await db.delete(notifications)
        .where(
          and(
            eq(notifications.id, notificationId),
            eq(notifications.userId, userId)
          )
        );
      
      res.json({ message: "Notification deleted" });
    } catch (error) {
      console.error("Error deleting notification:", error);
      res.status(500).json({ message: "Failed to delete notification" });
    }
  });

  // Create notification (admin only)
  app.post("/api/notifications", requireAuth, async (req: any, res) => {
    try {
      if (!req.user.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const notification = await db.insert(notifications)
        .values(req.body)
        .returning();
      
      res.status(201).json(notification[0]);
    } catch (error) {
      console.error("Error creating notification:", error);
      res.status(500).json({ message: "Failed to create notification" });
    }
  });
}

// Utility function to create notifications
export async function createNotification(data: NotificationData) {
  try {
    await db.insert(notifications).values({
      userId: data.userId,
      type: data.type,
      title: data.title,
      message: data.message,
      metadata: data.metadata || null,
      priority: data.priority || 'medium',
      isRead: false
    });
  } catch (error) {
    console.error("Error creating notification:", error);
  }
}

// Automated notification triggers
export async function triggerPricingUpdateNotification(serviceId: number, oldPrice: string, newPrice: string) {
  try {
    // Notify all admin users about pricing changes
    const admins = await db.select()
      .from(require("@shared/schema").users)
      .where(eq(require("@shared/schema").users.isAdmin, true));
    
    for (const admin of admins) {
      await createNotification({
        userId: admin.id,
        type: 'pricing_update',
        title: 'Service Pricing Updated',
        message: `Service pricing changed from $${oldPrice} to $${newPrice}`,
        metadata: { serviceId, oldPrice, newPrice },
        priority: 'medium'
      });
    }
  } catch (error) {
    console.error("Error triggering pricing notification:", error);
  }
}

export async function triggerExpeditedBookingNotification(projectId: number, weekStartDate: string) {
  try {
    // Notify all admin users about expedited bookings
    const admins = await db.select()
      .from(require("@shared/schema").users)
      .where(eq(require("@shared/schema").users.isAdmin, true));
    
    for (const admin of admins) {
      await createNotification({
        userId: admin.id,
        type: 'expedited_booking',
        title: 'Expedited Service Booked',
        message: `Expedited service scheduled for week of ${new Date(weekStartDate).toLocaleDateString()}`,
        metadata: { projectId, weekStartDate },
        priority: 'high'
      });
    }
  } catch (error) {
    console.error("Error triggering expedited booking notification:", error);
  }
}