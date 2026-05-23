import { db } from "../server/db";
import { notifications } from "../shared/schema";
import { sql } from "drizzle-orm";

async function addTestNotifications() {
  console.log("Adding test notifications...");

  // Clear existing test notifications for our test users
  console.log("Deleting existing test notifications...");
  await db.delete(notifications).where(sql`${notifications.userId} = 1`);
  await db.delete(notifications).where(sql`${notifications.userId} = 2`);
  
  // Create some test notifications for user ID 1 (admin)
  const testNotifications = [
    {
      userId: 1,
      title: "Test notification 1",
      content: "This is a test notification with high priority",
      message: "Please review this important information",
      type: "warning",
      isRead: false,
      entityId: 1,
      entityType: "project",
      sourceId: 2,
      sourceType: "system",
      linkUrl: "/admin"
    },
    {
      userId: 1,
      title: "Test notification 2",
      content: "Your booking has been confirmed",
      message: "Service: Real Estate Photography",
      type: "success",
      isRead: false,
      entityId: 3,
      entityType: "booking",
      sourceId: 1,
      sourceType: "booking",
      linkUrl: "/dashboard"
    },
    {
      userId: 1,
      title: "Test notification 3",
      content: "New client message received",
      message: "From: Brandon Empey - regarding Drone footage",
      type: "info",
      isRead: true,
      entityId: 4,
      entityType: "message",
      sourceId: 4,
      sourceType: "client",
      linkUrl: "/admin"
    },
    {
      userId: 1,
      title: "Test notification 4",
      content: "System maintenance scheduled",
      message: "The system will be down for maintenance on Sunday at 2am",
      type: "system",
      isRead: false,
      linkUrl: "/admin"
    },
    {
      userId: 1,
      title: "Test notification 5",
      content: "Payment failed",
      message: "Customer payment for booking #1234 has failed",
      type: "error",
      isRead: false,
      entityId: 1234,
      entityType: "payment",
      sourceId: 5,
      sourceType: "payment",
      linkUrl: "/finance"
    }
  ];

  // Insert the test notifications
  for (const notification of testNotifications) {
    await db.insert(notifications).values(notification);
  }

  console.log(`Added ${testNotifications.length} test notifications`);

  // Also add a few notifications for user ID 2 (test client user)
  const clientNotifications = [
    {
      userId: 2,
      title: "Welcome to Apollo DroneWorks",
      content: "Thank you for creating an account",
      message: "We're excited to have you as a client",
      type: "info",
      isRead: false,
      linkUrl: "/dashboard"
    },
    {
      userId: 2,
      title: "Your project has been updated",
      content: "New drone footage has been uploaded",
      message: "Check out the latest aerial footage of your property",
      type: "success",
      isRead: false,
      entityId: 2,
      entityType: "project",
      sourceId: 1,
      sourceType: "admin",
      linkUrl: "/dashboard"
    }
  ];

  // Insert the client notifications
  for (const notification of clientNotifications) {
    await db.insert(notifications).values(notification);
  }

  console.log(`Added ${clientNotifications.length} client notifications`);
  
  // Fetch and display all notifications to verify
  const allNotifications = await db.select().from(notifications);
  console.log(`Total notifications in database: ${allNotifications.length}`);
}

// Run the function
addTestNotifications()
  .then(() => {
    console.log("Test notifications added successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Error adding test notifications:", error);
    process.exit(1);
  });