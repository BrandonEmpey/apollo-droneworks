import type { Express } from "express";
import { db } from "./db";
import { customers, clientProjects, income, services, bookings } from "@shared/schema";
import { eq, gte, and, sql } from "drizzle-orm";

export function registerAdminStatsRoutes(app: Express) {
  app.get("/api/admin/stats", async (req, res) => {
    if (!req.isAuthenticated() || !(req.user as any)?.isAdmin) {
      return res.status(403).json({ message: "Forbidden" });
    }
    try {
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthStartStr = monthStart.toISOString().split("T")[0];

      const [
        clientCountResult,
        activeProjectsResult,
        monthlyIncomeResult,
        activeServicesResult,
        upcomingBookingsResult,
      ] = await Promise.all([
        db.select({ count: sql<number>`count(*)::int` }).from(customers),
        db.select({ count: sql<number>`count(*)::int` }).from(clientProjects)
          .where(eq(clientProjects.status, "active")),
        db.select({ total: sql<string>`coalesce(sum(amount::numeric),0)::text` }).from(income)
          .where(gte(income.date, monthStartStr)),
        db.select({ count: sql<number>`count(*)::int` }).from(services),
        db.select({ count: sql<number>`count(*)::int` }).from(bookings)
          .where(
            and(
              eq(bookings.status, "confirmed"),
              gte(bookings.scheduledDate, now)
            )
          ),
      ]);

      res.json({
        totalClients: clientCountResult[0]?.count ?? 0,
        activeProjects: activeProjectsResult[0]?.count ?? 0,
        monthlyRevenue: parseFloat(monthlyIncomeResult[0]?.total ?? "0"),
        activeServices: activeServicesResult[0]?.count ?? 0,
        upcomingBookings: upcomingBookingsResult[0]?.count ?? 0,
      });
    } catch (err) {
      console.error("Admin stats error:", err);
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });
}
