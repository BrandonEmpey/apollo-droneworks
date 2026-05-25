import type { Express } from "express";
import { db } from "./db";
import { serviceDeliverables } from "@shared/schema";
import { eq, asc } from "drizzle-orm";

const isAuthenticated = (req: any, res: any, next: any) => {
  if (req.isAuthenticated()) return next();
  res.status(401).json({ message: "Unauthorized" });
};

const isAdmin = (req: any, res: any, next: any) => {
  if (req.isAuthenticated() && req.user.isAdmin) return next();
  res.status(403).json({ message: "Forbidden" });
};

export function registerServiceDeliverableRoutes(app: Express) {
  // GET /api/service-deliverables — all, or filtered by ?serviceId=X
  app.get("/api/service-deliverables", isAuthenticated, async (req, res) => {
    try {
      const serviceId = req.query.serviceId ? parseInt(req.query.serviceId as string) : null;
      const rows = await db
        .select()
        .from(serviceDeliverables)
        .where(serviceId ? eq(serviceDeliverables.serviceId, serviceId) : undefined)
        .orderBy(asc(serviceDeliverables.serviceId), asc(serviceDeliverables.displayOrder));
      res.json(rows);
    } catch (err) {
      console.error("Error fetching service deliverables:", err);
      res.status(500).json({ message: "Failed to fetch service deliverables" });
    }
  });

  // POST /api/admin/service-deliverables
  app.post("/api/admin/service-deliverables", isAdmin, async (req, res) => {
    try {
      const { serviceId, name, description, defaultDaysToComplete, displayOrder, isRequired, defaultExternalUrlLabel } = req.body;

      if (!serviceId || !name) {
        return res.status(400).json({ message: "serviceId and name are required" });
      }

      const [created] = await db
        .insert(serviceDeliverables)
        .values({
          serviceId: Number(serviceId),
          name: String(name),
          description: description ?? null,
          defaultDaysToComplete: defaultDaysToComplete ? Number(defaultDaysToComplete) : 7,
          displayOrder: displayOrder ? Number(displayOrder) : 0,
          isRequired: isRequired ?? true,
          defaultExternalUrlLabel: defaultExternalUrlLabel ?? null,
        })
        .returning();

      res.status(201).json(created);
    } catch (err) {
      console.error("Error creating service deliverable:", err);
      res.status(500).json({ message: "Failed to create service deliverable" });
    }
  });

  // PUT /api/admin/service-deliverables/:id
  app.put("/api/admin/service-deliverables/:id", isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (!Number.isFinite(id)) return res.status(400).json({ message: "Invalid id" });

      const { name, description, defaultDaysToComplete, displayOrder, isRequired, defaultExternalUrlLabel } = req.body;

      const [updated] = await db
        .update(serviceDeliverables)
        .set({
          ...(name !== undefined && { name: String(name) }),
          ...(description !== undefined && { description }),
          ...(defaultDaysToComplete !== undefined && { defaultDaysToComplete: Number(defaultDaysToComplete) }),
          ...(displayOrder !== undefined && { displayOrder: Number(displayOrder) }),
          ...(isRequired !== undefined && { isRequired }),
          ...(defaultExternalUrlLabel !== undefined && { defaultExternalUrlLabel }),
          updatedAt: new Date(),
        })
        .where(eq(serviceDeliverables.id, id))
        .returning();

      if (!updated) return res.status(404).json({ message: "Deliverable not found" });
      res.json(updated);
    } catch (err) {
      console.error("Error updating service deliverable:", err);
      res.status(500).json({ message: "Failed to update service deliverable" });
    }
  });

  // DELETE /api/admin/service-deliverables/:id
  app.delete("/api/admin/service-deliverables/:id", isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (!Number.isFinite(id)) return res.status(400).json({ message: "Invalid id" });

      await db.delete(serviceDeliverables).where(eq(serviceDeliverables.id, id));
      res.status(204).end();
    } catch (err) {
      console.error("Error deleting service deliverable:", err);
      res.status(500).json({ message: "Failed to delete service deliverable" });
    }
  });
}
