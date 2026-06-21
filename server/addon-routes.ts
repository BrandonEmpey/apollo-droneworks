import type { Express } from "express";
import { db } from "./db";
import { addons, serviceAddons } from "../shared/addons-schema";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "./auth";

export function registerAddonRoutes(app: Express) {
  // Get all addons (public access for quote builder)
  app.get("/api/addons", async (req, res) => {
    try {
      const allAddons = await db.select().from(addons).orderBy(addons.displayOrder, addons.name);
      res.json(allAddons);
    } catch (error) {
      console.error("Error fetching addons:", error);
      res.status(500).json({ message: "Failed to fetch addons" });
    }
  });

  // Get addon by ID
  app.get("/api/addons/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const [addon] = await db.select().from(addons).where(eq(addons.id, id));
      
      if (!addon) {
        return res.status(404).json({ message: "Addon not found" });
      }
      
      res.json(addon);
    } catch (error) {
      console.error("Error fetching addon:", error);
      res.status(500).json({ message: "Failed to fetch addon" });
    }
  });

  // Create new addon
  app.post("/api/addons", requireAuth, async (req, res) => {
    try {
      const { name, description, tooltipDescription, price, pricingType, percentage, isActive, displayOrder } = req.body;
      
      const [newAddon] = await db.insert(addons).values({
        name,
        description,
        tooltipDescription,
        price,
        pricingType: pricingType || "fixed",
        percentage: percentage || 0,
        isActive,
        displayOrder,
      }).returning();
      
      res.status(201).json(newAddon);
    } catch (error) {
      console.error("Error creating addon:", error);
      res.status(500).json({ message: "Failed to create addon" });
    }
  });

  // Update addon
  app.put("/api/addons/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { name, description, tooltipDescription, price, pricingType, percentage, isActive, displayOrder } = req.body;
      
      const [updatedAddon] = await db
        .update(addons)
        .set({
          name,
          description,
          tooltipDescription,
          price,
          pricingType: pricingType || "fixed",
          percentage: percentage || 0,
          isActive,
          displayOrder,
          updatedAt: new Date(),
        })
        .where(eq(addons.id, id))
        .returning();
      
      if (!updatedAddon) {
        return res.status(404).json({ message: "Addon not found" });
      }
      
      res.json(updatedAddon);
    } catch (error) {
      console.error("Error updating addon:", error);
      res.status(500).json({ message: "Failed to update addon" });
    }
  });

  // Delete addon
  app.delete("/api/addons/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      // First delete all service-addon relationships
      await db.delete(serviceAddons).where(eq(serviceAddons.addonId, id));
      
      // Then delete the addon
      const [deletedAddon] = await db
        .delete(addons)
        .where(eq(addons.id, id))
        .returning();
      
      if (!deletedAddon) {
        return res.status(404).json({ message: "Addon not found" });
      }
      
      res.json({ message: "Addon deleted successfully" });
    } catch (error) {
      console.error("Error deleting addon:", error);
      res.status(500).json({ message: "Failed to delete addon" });
    }
  });

  // Get addons for a specific service
  // Public-facing add-on list: only returns is_enabled=true links.
  // Admin toggle at /api/service-addons (PUT) controls visibility.
  // Pass ?all=1 (admin only) to include disabled add-ons for the admin panel.
  app.get("/api/services/:serviceId/addons", async (req, res) => {
    try {
      const serviceId = parseInt(req.params.serviceId);
      const showAll = req.query.all === "1" && (req as any).user?.isAdmin;

      const serviceAddonsData = await db
        .select({
          addon: addons,
          serviceAddon: serviceAddons,
        })
        .from(serviceAddons)
        .innerJoin(addons, eq(serviceAddons.addonId, addons.id))
        .where(
          showAll
            ? eq(serviceAddons.serviceId, serviceId)
            : and(eq(serviceAddons.serviceId, serviceId), eq(serviceAddons.isEnabled, true))
        );

      res.json(serviceAddonsData);
    } catch (error) {
      console.error("Error fetching service addons:", error);
      res.status(500).json({ message: "Failed to fetch service addons" });
    }
  });

  // Update service-addon relationships
  app.put("/api/services/:serviceId/addons", requireAuth, async (req, res) => {
    try {
      const serviceId = parseInt(req.params.serviceId);
      const { enabledAddons } = req.body; // Array of {addonId, isEnabled, customPrice?}
      
      console.log("Updating service addons for service:", serviceId);
      console.log("Enabled addons:", enabledAddons);
      
      // Delete existing relationships for this service
      await db.delete(serviceAddons).where(eq(serviceAddons.serviceId, serviceId));
      
      // Insert new relationships for enabled addons
      if (enabledAddons && enabledAddons.length > 0) {
        const relationships = enabledAddons
          .filter((addon: any) => addon.isEnabled)
          .map((addon: any) => ({
            serviceId,
            addonId: addon.addonId,
            isEnabled: true,
            customPrice: addon.customPrice !== undefined && addon.customPrice !== null ? addon.customPrice : null,
          }));
        
        console.log("Inserting relationships:", relationships);
        
        if (relationships.length > 0) {
          await db.insert(serviceAddons).values(relationships);
        }
      }
      
      res.json({ message: "Service addons updated successfully" });
    } catch (error) {
      console.error("Error updating service addons:", error);
      res.status(500).json({ message: "Failed to update service addons" });
    }
  });
}