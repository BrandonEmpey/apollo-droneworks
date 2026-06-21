import type { Express } from "express";
import { createServer, type Server } from "http";
import fs from "fs";
import path from "path";
import { z } from "zod";
import multer from "multer";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { registerAnalyticsRoutes, synchronizeFinancialWithAnalytics, syncIncomeToProjectAnalytics } from "./analytics-routes";
import { syncBookingIncome } from "./booking-finance-sync";

import { registerPayrollRoutes } from "./payroll/routes";
import { registerAdCampaignRoutes } from "./ai/ad-campaign-routes";
import { registerCRMRoutes } from "./crm-routes";
import { registerClientRoutes } from "./client-routes";
import { registerClientProjectRoutes } from "./client-project-routes";
import { registerProjectWorkflowRoutes } from "./project-workflow-routes";
import { registerAssetRoutes } from "./asset-routes";
import { registerAdminStatsRoutes } from "./admin-stats-routes";
import { registerNotificationRoutes } from "./notification-routes";
import { registerServiceDeliverableRoutes } from "./service-deliverable-routes";
import { registerFileManagementRoutes } from "./file-management-routes";
import { registerServiceAnalyticsRoutes } from "./service-analytics-routes";
import { registerAddonRoutes } from "./addon-routes";
import { registerUploadRoutes } from "./upload-routes";
import {
  validateAerialImageDataUrl,
  validateAerialImageReference,
  AERIAL_REJECTION_MESSAGE,
} from "./ai/image-validator";
import { registerOperationalRoutes } from "./operational-routes";
import { registerCustomerExperienceRoutes } from "./customer-experience-routes";
import { registerAIPricingRoutes } from "./ai-pricing-routes";
import { registerPricingRoutes } from "./pricing-routes";
import { registerTrustAdministrationRoutes } from "./trust-administration-routes";
import { registerSatisfactionRoutes } from "./satisfaction-routes";
import { AIRecommendationEngine } from "./ai/recommendation-engine";
import { populateAnalyticsData } from "./populate-analytics-data";
import { sendBookingConfirmationEmail, sendTestimonialRequestEmail } from "./email-service";
import { seedAdCampaigns } from "./seed-ad-campaigns";
import Stripe from "stripe";
import { WebSocketServer } from "ws";
import WebSocket from "ws";
import { db } from "./db";
import {
  users,
  insertServiceSchema,
  insertServiceAddonSchema,
  insertBookingSchema,
  insertGallerySchema,
  insertBeforeAfterImageSchema,
  insertBlogPostSchema,
  insertTestimonialSchema,
  insertContactMessageSchema,
  insertQuoteSchema,
  insertSocialMediaAccountSchema,
  insertSocialPostSchema,
  insertAboutPageContentSchema,
  insertSubscriptionTierSchema,
  quotes,
  services,
  serviceAddons,
  subscriptionTiers,
  // Financial management schemas
  insertExpenseCategorySchema,
  insertExpenseSchema,
  insertIncomeSchema,
  insertFinancialAccountSchema,
  insertFinancialReportSchema,
  insertFinancialDocumentSchema,
  insertBudgetSchema,
  insertBudgetAllocationSchema,
  // Data analytics schemas
  insertProjectAnalyticsSchema,
  insertDroneAnalyticsSchema,
  insertFlightLogSchema,
  insertMarketingAnalyticsSchema,
  insertClientAnalyticsSchema,
  insertAnalyticsReportSchema,
  insertGeneratedContentSchema,
  // Tables
  socialPosts,
  expenseCategories,
  expenses,
  income,
  financialAccounts,
  generatedContent,
  financialReports,
  financialDocuments,
  budgets,
  budgetAllocations,
  projectAnalytics,
  droneAnalytics,
  flightLogs,
  marketingAnalytics,
  clientAnalytics,
  analyticsReports,
  generatedContent
} from "@shared/schema";
import { and, eq, desc, asc, gte, lte, inArray, like, sql, isNull, between } from "drizzle-orm";

const stripeKey = process.env.STRIPE_SECRET_KEY || "sk_test_your_key_here";
const stripe = new Stripe(stripeKey, {
  apiVersion: "2023-10-16",
});

// Configure multer for file uploads
const multerStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'public', 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: multerStorage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit for videos
  },
  fileFilter: (req, file, cb) => {
    // Allow all file types for client project files
    cb(null, true);
  }
});

// Middleware to check if user is authenticated
const isAuthenticated = (req: any, res: any, next: any) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: "Unauthorized" });
};

// Middleware to check if user is admin
const isAdmin = (req: any, res: any, next: any) => {
  if (req.isAuthenticated() && req.user.isAdmin) {
    return next();
  }
  res.status(403).json({ message: "Forbidden" });
};

// Verify the current user owns the given client project (or is an admin)
async function userCanAccessProject(req: any, projectId: number): Promise<boolean> {
  if (!req.user) return false;
  if (req.user.isAdmin) return true;
  if (!Number.isFinite(projectId)) return false;
  try {
    const project = await storage.getClientProject(projectId);
    if (!project) return false;
    const isCustomer = !!(req.user.role === "client" || req.user.clientId);
    let customer = null;
    if (isCustomer) {
      customer = await storage.getCustomerById(req.user.id);
      if (!customer) {
        customer = await storage.getCustomerByUserId(req.user.id, false);
      }
    } else {
      customer = await storage.getCustomerByUserId(req.user.id, false);
    }
    if (!customer) return false;
    return project.clientId === customer.id;
  } catch (err) {
    console.error("[userCanAccessProject] error:", err);
    return false;
  }
}


export async function registerRoutes(app: Express): Promise<Server> {
  // Set up authentication routes (/api/register, /api/login, /api/logout, /api/user)
  setupAuth(app);
  
  // Register analytics routes
  registerAnalyticsRoutes(app);
  
  // Register payroll routes
  registerPayrollRoutes(app);
  
  // Register AI ad campaign routes
  registerAdCampaignRoutes(app);
  
  // Register CRM routes
  registerCRMRoutes(app);
  
  // Register client routes
  registerClientRoutes(app);
  
  // Register client project routes
  registerClientProjectRoutes(app);
  registerProjectWorkflowRoutes(app);
  registerAssetRoutes(app);
  registerAdminStatsRoutes(app);
  registerServiceDeliverableRoutes(app);
  registerFileManagementRoutes(app);

  // Register notification routes
  registerNotificationRoutes(app);
  registerServiceAnalyticsRoutes(app);
  registerAddonRoutes(app);
  
  // Register operational efficiency routes
  registerOperationalRoutes(app);
  
  // Register customer experience routes
  registerCustomerExperienceRoutes(app);
  
  // Register AI pricing routes
  try {
    const { registerAIPricingRoutes } = await import('./ai-pricing-routes');
    registerAIPricingRoutes(app);
    console.log("AI pricing routes registered successfully");
  } catch (error) {
    console.error("Error registering AI pricing routes:", error);
  }
  
  // Register trust administration routes
  try {
    registerTrustAdministrationRoutes(app);
    console.log("Trust administration routes registered successfully");
  } catch (error) {
    console.error("Error registering trust administration routes:", error);
  }

  // Register satisfaction survey routes
  try {
    registerSatisfactionRoutes(app);
    console.log("Satisfaction survey routes registered successfully");
  } catch (error) {
    console.error("Error registering satisfaction survey routes:", error);
  }

  // Register pricing routes (competitor analysis, etc.)
  try {
    registerPricingRoutes(app);
    console.log("Pricing routes registered successfully");
  } catch (error) {
    console.error("Error registering pricing routes:", error);
  }
  
  // Register referral and customer experience routes
  try {
    const { registerReferralRoutes } = await import('./referral-routes');
    registerReferralRoutes(app);
    console.log("Referral routes registered successfully");
  } catch (error) {
    console.error("Error registering referral routes:", error);
  }

  // Register operational efficiency routes
  try {
    registerOperationalRoutes(app);
    console.log("Operational efficiency routes registered successfully");
  } catch (error) {
    console.error("Error registering operational routes:", error);
  }

  // Register customer experience enhancement routes
  try {
    registerCustomerExperienceRoutes(app);
    console.log("Customer experience routes registered successfully");
  } catch (error) {
    console.error("Error registering customer experience routes:", error);
  }
  
  // About Page Content Management Routes
  app.get("/api/about-content", async (req, res) => {
    try {
      // Get all about page content, organized by section
      const { db } = await import("./db");
      const { aboutPageContent } = await import("@shared/schema");
      const { asc } = await import("drizzle-orm");
      
      const content = await db.select().from(aboutPageContent)
        .orderBy(aboutPageContent.section, aboutPageContent.displayOrder);
      
      // Group content by section for easier consumption on the client
      const groupedContent = content.reduce((acc, item) => {
        if (!acc[item.section]) {
          acc[item.section] = [];
        }
        acc[item.section].push(item);
        return acc;
      }, {} as Record<string, typeof content>);
      
      res.json(groupedContent);
    } catch (error: any) {
      console.error("Error fetching about page content:", error);
      res.status(500).json({ message: error.message });
    }
  });
  
  app.get("/api/about-content/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { db } = await import("./db");
      const { aboutPageContent } = await import("@shared/schema");
      const { eq } = await import("drizzle-orm");
      
      const [content] = await db.select().from(aboutPageContent)
        .where(eq(aboutPageContent.id, id));
      
      if (!content) {
        return res.status(404).json({ message: "Content not found" });
      }
      
      res.json(content);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  app.post("/api/about-content", isAdmin, async (req, res) => {
    try {
      const { db } = await import("./db");
      const { aboutPageContent } = await import("@shared/schema");
      
      const validatedData = insertAboutPageContentSchema.parse(req.body);
      if (validatedData.imageUrl) {
        const check = await validateAerialImageReference(validatedData.imageUrl);
        if (!check.compliant) {
          return res.status(400).json({
            error: AERIAL_REJECTION_MESSAGE,
            message: AERIAL_REJECTION_MESSAGE,
            reason: check.reason,
          });
        }
      }
      const [content] = await db.insert(aboutPageContent)
        .values({
          ...validatedData,
          updatedAt: new Date()
        })
        .returning();
      
      res.status(201).json(content);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });
  
  app.put("/api/about-content/:id", isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { db } = await import("./db");
      const { aboutPageContent } = await import("@shared/schema");
      const { eq } = await import("drizzle-orm");
      
      const validatedData = insertAboutPageContentSchema.partial().parse(req.body);
      if (validatedData.imageUrl) {
        const check = await validateAerialImageReference(validatedData.imageUrl);
        if (!check.compliant) {
          return res.status(400).json({
            error: AERIAL_REJECTION_MESSAGE,
            message: AERIAL_REJECTION_MESSAGE,
            reason: check.reason,
          });
        }
      }
      const [content] = await db.update(aboutPageContent)
        .set({
          ...validatedData,
          updatedAt: new Date()
        })
        .where(eq(aboutPageContent.id, id))
        .returning();
      
      if (!content) {
        return res.status(404).json({ message: "Content not found" });
      }
      
      res.json(content);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });
  
  app.delete("/api/about-content/:id", isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { db } = await import("./db");
      const { aboutPageContent } = await import("@shared/schema");
      const { eq } = await import("drizzle-orm");
      
      const [deletedContent] = await db.delete(aboutPageContent)
        .where(eq(aboutPageContent.id, id))
        .returning();
      
      if (!deletedContent) {
        return res.status(404).json({ message: "Content not found" });
      }
      
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  // Users route (admin only)
  app.get("/api/users", isAdmin, async (req, res) => {
    try {
      const users = await storage.getUsers();
      
      // Remove sensitive information
      const sanitizedUsers = users.map(user => ({
        id: user.id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        isAdmin: user.isAdmin,
        createdAt: user.createdAt
      }));
      
      res.json(sanitizedUsers);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // On-demand admin endpoint: replay seed routines that were skipped at startup
  // because no admin user existed yet (FK guard added in task #185).
  app.post("/api/admin/run-seeds", isAdmin, async (_req, res) => {
    try {
      await populateAnalyticsData();
      const adResult = await seedAdCampaigns();
      res.json({
        ok: true,
        message: "Seed routines completed.",
        adCampaigns: adResult?.status === "skipped_no_admin" ? "skipped" : "seeded",
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Service routes
  app.get("/api/services", async (req, res) => {
    try {
      const services = await storage.getServices();
      res.json(services);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Service bundle discounts route
  app.get("/api/service-bundle-discounts", async (req, res) => {
    try {
      const bundleDiscounts = await storage.getServiceBundleDiscounts();
      res.json(bundleDiscounts);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Add specific route for /api/services/all to avoid conflict with :id route
  app.get("/api/services/all", async (req, res) => {
    try {
      const services = await storage.getServices();
      res.json(services);
    } catch (error: any) {
      console.error("Error getting service all:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/services/:idOrSlug", async (req, res) => {
    try {
      const idOrSlug = req.params.idOrSlug;
      // Only treat the param as a numeric ID when the entire string is digits.
      // parseInt("3d-mapping") returns 3, which would incorrectly route a slug
      // like "3d-mapping" to an ID lookup and produce a false 404.
      const isNumericId = /^\d+$/.test(idOrSlug);

      let service;

      if (isNumericId) {
        const id = parseInt(idOrSlug, 10);
        console.log(`Getting service with ID: ${id}`);
        service = await storage.getService(id);
      } else {
        console.log(`Getting service with slug: ${idOrSlug}`);
        // Look up by slug
        const allServices = await storage.getServices();
        service = allServices.find(s => s.slug === idOrSlug);
      }
      
      console.log(`Service lookup result:`, service ? `Found service: ${service.name}` : "Service not found");
      
      if (!service) {
        return res.status(404).json({ message: "Service not found" });
      }
      
      // Pricing tiers are stored on the service row's JSONB column — no overlay needed.
      res.json(service);
    } catch (error: any) {
      console.error(`Error getting service ${req.params.idOrSlug}:`, error);
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/services", isAdmin, async (req, res) => {
    try {
      const validatedData = insertServiceSchema.parse(req.body);
      const refs = [validatedData.imageUrl, ...((validatedData.images as string[] | undefined) ?? [])].filter(Boolean) as string[];
      for (const ref of refs) {
        const check = await validateAerialImageReference(ref);
        if (!check.compliant) {
          return res.status(400).json({
            error: AERIAL_REJECTION_MESSAGE,
            message: AERIAL_REJECTION_MESSAGE,
            reason: check.reason,
          });
        }
      }
      const service = await storage.createService(validatedData);
      res.status(201).json(service);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.put("/api/services/:id", isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      console.log('Service update request body:', JSON.stringify(req.body, null, 2));
      console.log('Possibilities in request:', req.body.possibilities);
      const validatedData = insertServiceSchema.partial().parse(req.body);
      console.log('Validated data:', JSON.stringify(validatedData, null, 2));
      console.log('Possibilities in validated data:', validatedData.possibilities);
      const refs = [validatedData.imageUrl, ...((validatedData.images as string[] | undefined) ?? [])].filter(Boolean) as string[];
      for (const ref of refs) {
        const check = await validateAerialImageReference(ref);
        if (!check.compliant) {
          return res.status(400).json({
            error: AERIAL_REJECTION_MESSAGE,
            message: AERIAL_REJECTION_MESSAGE,
            reason: check.reason,
          });
        }
      }
      const service = await storage.updateService(id, validatedData);
      if (!service) {
        return res.status(404).json({ message: "Service not found" });
      }
      res.json(service);
    } catch (error: any) {
      console.error('Service update error:', error);
      res.status(400).json({ message: error.message });
    }
  });

  app.patch("/api/services/:id", isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertServiceSchema.partial().parse(req.body);
      const refs = [validatedData.imageUrl, ...((validatedData.images as string[] | undefined) ?? [])].filter(Boolean) as string[];
      for (const ref of refs) {
        const check = await validateAerialImageReference(ref);
        if (!check.compliant) {
          return res.status(400).json({
            error: AERIAL_REJECTION_MESSAGE,
            message: AERIAL_REJECTION_MESSAGE,
            reason: check.reason,
          });
        }
      }
      const service = await storage.updateService(id, validatedData);
      if (!service) {
        return res.status(404).json({ message: "Service not found" });
      }
      res.json(service);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/services/:id", isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteService(id);
      if (!success) {
        return res.status(404).json({ message: "Service not found" });
      }
      res.status(204).send();
    } catch (error: any) {
      if (error?.name === "ServiceHasBookingsError") {
        const count = error.bookingsCount;
        // Best-effort: include the service name so the toast tells the admin
        // exactly which service is blocked. The service still exists (delete
        // failed), so this lookup succeeds in normal cases.
        let label = "this service";
        try {
          const svc = await storage.getService(error.serviceId);
          if (svc?.name) label = `"${svc.name}"`;
        } catch {
          // ignore — fall back to generic label
        }
        return res.status(409).json({
          message: `Can't delete ${label} — it has ${count} booking${count === 1 ? "" : "s"}. Cancel or reassign the booking${count === 1 ? "" : "s"} first.`,
          bookingsCount: count,
        });
      }
      res.status(500).json({ message: error.message });
    }
  });

  // Subscription Tiers routes
  app.get("/api/subscription-tiers", async (req, res) => {
    try {
      const { db } = await import("./db");
      const tiers = await db.select().from(subscriptionTiers);
      res.json(tiers);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/services/:serviceId/tiers", async (req, res) => {
    try {
      const serviceId = parseInt(req.params.serviceId);
      const { db } = await import("./db");
      
      const tiers = await db.select()
        .from(subscriptionTiers)
        .where(eq(subscriptionTiers.serviceId, serviceId))
        .orderBy(desc(subscriptionTiers.price)); // Order by price in descending order (highest first)
      
      res.json(tiers);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/subscription-tiers/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { db } = await import("./db");
      
      const [tier] = await db.select()
        .from(subscriptionTiers)
        .where(eq(subscriptionTiers.id, id));
      
      if (!tier) {
        return res.status(404).json({ message: "Subscription tier not found" });
      }
      
      res.json(tier);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/subscription-tiers", isAdmin, async (req, res) => {
    try {
      const validatedData = insertSubscriptionTierSchema.parse(req.body);
      const { db } = await import("./db");
      
      const [tier] = await db.insert(subscriptionTiers)
        .values(validatedData)
        .returning();
      
      res.status(201).json(tier);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.put("/api/subscription-tiers/:id", isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertSubscriptionTierSchema.partial().parse(req.body);
      const { db } = await import("./db");
      
      const [updatedTier] = await db.update(subscriptionTiers)
        .set(validatedData)
        .where(eq(subscriptionTiers.id, id))
        .returning();
      
      if (!updatedTier) {
        return res.status(404).json({ message: "Subscription tier not found" });
      }
      
      res.json(updatedTier);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/subscription-tiers/:id", isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { db } = await import("./db");
      
      const [deletedTier] = await db.delete(subscriptionTiers)
        .where(eq(subscriptionTiers.id, id))
        .returning();
      
      if (!deletedTier) {
        return res.status(404).json({ message: "Subscription tier not found" });
      }
      
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Service Add-ons routes
  app.get("/api/service-addons", isAdmin, async (req, res) => {
    try {
      const { db } = await import("./db");
      const addons = await db.select({
        id: serviceAddons.id,
        serviceId: serviceAddons.serviceId,
        addonId: serviceAddons.addonId,
        isEnabled: serviceAddons.isEnabled,
        customPrice: serviceAddons.customPrice,
        createdAt: serviceAddons.createdAt
      })
      .from(serviceAddons);
      res.json(addons);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  // API route to get standalone add-ons
  app.get("/api/standalone-addons", async (req, res) => {
    try {
      const { db } = await import("./db");
      const addons = await db.select().from(serviceAddons);
      
      res.json(addons);
    } catch (error: any) {
      console.error("Error getting standalone addons:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // NOTE: /api/services/:serviceId/addons route is handled by addon-routes.ts

  app.post("/api/service-addons", isAdmin, async (req, res) => {
    try {
      const validatedData = insertServiceAddonSchema.parse(req.body);
      const { db } = await import("./db");
      
      const [addon] = await db.insert(serviceAddons)
        .values(validatedData)
        .returning();
      
      res.status(201).json(addon);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.put("/api/service-addons/:id", isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertServiceAddonSchema.partial().parse(req.body);
      const { db } = await import("./db");
      
      const [updatedAddon] = await db.update(serviceAddons)
        .set(validatedData)
        .where(eq(serviceAddons.id, id))
        .returning();
      
      if (!updatedAddon) {
        return res.status(404).json({ message: "Service add-on not found" });
      }
      
      res.json(updatedAddon);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });
  
  // Delete a service add-on
  app.delete("/api/service-addons/:id", isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { db } = await import("./db");
      
      // Check if the add-on exists
      const [addon] = await db.select()
        .from(serviceAddons)
        .where(eq(serviceAddons.id, id));
        
      if (!addon) {
        return res.status(404).json({ message: "Service add-on not found" });
      }
      
      // Delete the add-on
      await db.delete(serviceAddons)
        .where(eq(serviceAddons.id, id));
      
      res.json({ success: true, message: "Service add-on deleted successfully" });
    } catch (error: any) {
      console.error("Error deleting service add-on:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Booking routes
  
  // Get all services (for booking manager)
  app.get("/api/services/all", isAuthenticated, async (req, res) => {
    try {
      if (!req.user.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const services = await storage.getServices();
      res.json(services);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  // Get all users (for booking manager)
  app.get("/api/users", isAuthenticated, async (req, res) => {
    try {
      if (!req.user.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  app.get("/api/bookings", isAuthenticated, async (req, res) => {
    try {
      // If admin, return all bookings; otherwise, return user's bookings
      const bookings = req.user.isAdmin
        ? await storage.getBookings()
        : await storage.getUserBookings(req.user.id);
      res.json(bookings);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/bookings/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const booking = await storage.getBooking(id);
      
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }
      
      // Check if user is admin or the booking belongs to the user
      if (!req.user.isAdmin && booking.userId !== req.user.id) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      res.json(booking);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/bookings", isAuthenticated, async (req, res) => {
    try {
      // Force userId to be the authenticated user's ID unless admin
      let bookingData = { ...req.body };
      if (!req.user.isAdmin) {
        bookingData.userId = req.user.id;
      }
      
      // Extract projectName if present, but don't include in booking data
      const projectName = bookingData.projectName || `Project ${new Date().toLocaleDateString()}`;
      // Remove projectName from booking data as it's not part of the booking schema
      delete bookingData.projectName;
      
      console.log("Booking data being validated:", JSON.stringify(bookingData, null, 2));
      console.log("Current user ID:", req.user.id, "role:", req.user.role || "standard user");
      
      // Check if selectedServices is present and is an array
      if (!bookingData.selectedServices || !Array.isArray(bookingData.selectedServices)) {
        console.warn("selectedServices is missing or not an array, setting default");
        bookingData.selectedServices = bookingData.serviceId ? [bookingData.serviceId] : [];
      }
      console.log("Selected services before validation:", bookingData.selectedServices);
      
      const validatedData = insertBookingSchema.parse(bookingData);
      console.log("Validated data:", JSON.stringify(validatedData, null, 2));
      console.log("Selected services after validation:", validatedData.selectedServices);
      
      // Set the project name in the validated data
      validatedData.projectName = projectName;
      
      // Create the booking
      const booking = await storage.createBooking(validatedData);
      console.log("Created booking with project name:", projectName);
      
      // Create or attach to existing client project with the provided name
      try {
        // Use the userId from the validated booking data
        const userId = validatedData.userId;
        
        // First determine if the user is a regular user or a customer
        const isCustomer = !!(req.user.role === 'client' || req.user.clientId);
        console.log("User ID:", userId, "Is customer:", isCustomer);
        
        // Handle customer lookup differently based on whether the user is a customer
        let customer;
        
        if (isCustomer) {
          console.log("User is a client - using direct customer ID:", userId);
          // For client users, their ID is already a customer ID
          customer = await storage.getCustomerById(userId);
          if (!customer) {
            console.log("No customer found with direct ID, trying legacy lookup");
            customer = await storage.getCustomerByUserId(userId, true);
          }
        } else {
          // Regular user flow - use the getCustomerByUserId method
          console.log("Regular user - looking up associated customer for user ID:", userId);
          customer = await storage.getCustomerByUserId(userId, true); // create if not exists
        }
        
        // If still no customer, create one using basic user data
        if (!customer) {
          console.log("No customer found for user ID:", userId, "- creating customer record");
          
          // Get user data to create customer
          const userData = await storage.getUser(userId);
          if (!userData) {
            throw new Error("User not found with ID: " + userId);
          }
          
          // Create a new customer record
          customer = await storage.createCustomer({
            userId: isCustomer ? null : userData.id, // Only set userId for regular users
            firstName: userData.firstName || userData.username || '', 
            lastName: userData.lastName || '',
            email: userData.email || `user-${userData.id}@example.com`,
            phone: userData.phone || '',
            company: userData.company || '',
            address: bookingData.projectLocation || '',
            city: '',
            state: '',
            postalCode: '',
            country: '',
            source: 'website booking',
            username: userData.username,
            createdAt: new Date(),
            updatedAt: new Date()
          });
          
          console.log("Created new customer record for user ID:", userId, "customer ID:", customer.id);
        }
        
        // Check if a project with this name already exists for this client
        const existingProject = await storage.getClientProjectByNameAndClientId(projectName, customer.id);
        
        if (existingProject) {
          console.log("Project with name '", projectName, "' already exists (ID:", existingProject.id, "). Associating booking with existing project.");
          
          // Return booking with the existing project info
          res.status(201).json({
            ...booking,
            projectId: existingProject.id,
            projectName: existingProject.name,
            existingProject: true // Flag to indicate this was an existing project
          });
        } else {
          // No existing project, create a new one
          const projectData = {
            name: projectName,
            clientId: customer.id,
            serviceId: booking.serviceId,
            status: "active",
            address: booking.projectLocation || "",
            notes: booking.notes || "",
            startDate: new Date(),
            selectedServices: booking.selectedServices // Pass selected services to project
          };
          
          const project = await storage.createClientProject(projectData);
          console.log("Created new project with name:", projectName, "for booking ID:", booking.id);
          
          // Create a task for each service that was booked
          try {
            // Get the list of selected services
            const selectedServiceIds = booking.selectedServices || [];
            console.log(`Creating tasks for ${selectedServiceIds.length} selected services`);
            
            // If there are selected services, create a task for each one
            if (selectedServiceIds.length > 0) {
              const allServices = await storage.getServices();
              
              // Create tasks and deliverables for each service
              for (const serviceId of selectedServiceIds) {
                // Find the service details
                const service = allServices.find(s => s.id === serviceId);
                if (service) {
                  // Create a task for this service
                  const taskData = {
                    projectId: project.id,
                    title: `${service.name} Service`,
                    description: `Complete the ${service.name} service as requested in the booking.`,
                    dueDate: new Date(new Date().getTime() + 7 * 24 * 60 * 60 * 1000), // Due in 7 days
                    priority: "medium",
                    status: "todo",
                    apolloResponsibility: `Provide ${service.name} service as booked`,
                    assignedTo: null,
                    clientNotes: null,
                    adminNotes: null
                  };
                  
                  // Create the task
                  const task = await storage.createProjectTask(taskData);
                  console.log(`Created task '${task.title}' (ID: ${task.id}) for service ${service.name} (ID: ${service.id})`);
                  
                }
              }
            }
          } catch (taskError) {
            console.error("Error creating tasks for project:", taskError);
            // Continue with the response even if task creation fails
          }
          
          // Return booking with the project info
          res.status(201).json({
            ...booking,
            projectId: project.id,
            projectName: project.name,
            existingProject: false // Flag to indicate this is a new project
          });
        }
      } catch (projectError) {
        // If project creation fails, still return the booking
        console.error("Project creation error:", projectError);
        res.status(201).json(booking);
      }
    } catch (error: any) {
      console.error("Booking creation error:", error);
      if (error.errors) {
        console.error("Validation errors:", JSON.stringify(error.errors, null, 2));
      }
      res.status(400).json({ message: error.message });
    }
  });

  app.put("/api/bookings/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const booking = await storage.getBooking(id);
      
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }
      
      // Check if user is admin or the booking belongs to the user
      if (!req.user.isAdmin && booking.userId !== req.user.id) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const bookingData = { ...req.body };
      const validatedData = insertBookingSchema.partial().parse(bookingData);
      const prevStatus = booking.status;
      const updatedBooking = await storage.updateBooking(id, validatedData);

      // Only admin-initiated booking updates may produce financial side
      // effects. This prevents a non-admin booking owner from triggering
      // auto-income creation (or removal) by flipping their own booking's
      // status, which would let them write to the financial ledger
      // indirectly.
      if (updatedBooking && req.user.isAdmin) {
        try {
          await syncBookingIncome(prevStatus, updatedBooking);
          if (
            prevStatus !== updatedBooking.status &&
            (prevStatus === "completed" || updatedBooking.status === "completed")
          ) {
            await synchronizeFinancialWithAnalytics();

            // Send testimonial request email when project is marked completed
            if (updatedBooking.status === "completed") {
              try {
                const bookingUser = await storage.getUser(updatedBooking.userId!);
                const allSvcs = await storage.getServices();
                const svc = allSvcs.find(s => s.id === updatedBooking.serviceId);
                if (bookingUser?.email) {
                  await sendTestimonialRequestEmail({
                    toEmail: bookingUser.email,
                    toName: bookingUser.firstName || bookingUser.username,
                    serviceName: svc?.name || "drone service",
                  });
                }
              } catch (emailErr) {
                console.error("Testimonial email failed (non-fatal):", emailErr);
              }
            }
          }
        } catch (syncError) {
          console.error("Failed to sync booking income:", syncError);
        }
      }

      res.json(updatedBooking);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/bookings/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const booking = await storage.getBooking(id);
      
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }
      
      // Allow admin or the booking owner to delete bookings
      if (!req.user.isAdmin && booking.userId !== req.user.id) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const status = (booking.status ?? "").toLowerCase();
      if (status === "completed" || status === "cancelled") {
        return res.status(409).json({
          message: `Cannot cancel a booking that is already ${booking.status}.`,
        });
      }

      const success = await storage.deleteBooking(id);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Direct PDF download — same content as the emailed attachment, but
  // streamed back as a file so customers/admins can grab it without sending
  // an email.
  app.get("/api/receipts/:id/pdf", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (Number.isNaN(id)) {
        return res.status(400).json({ message: "Invalid booking id" });
      }

      const booking = await storage.getBooking(id);
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }
      if (!req.user.isAdmin && booking.userId !== req.user.id) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const allServices = await storage.getServices();
      const selectedServices = booking.selectedServices
        ? allServices.filter((s) => booking.selectedServices?.includes(s.id))
        : booking.serviceId
        ? allServices.filter((s) => s.id === booking.serviceId)
        : [];

      const lineItemSum = selectedServices.reduce((sum, s) => sum + s.price / 100, 0);
      const parsedTotal = booking.totalAmount != null ? parseFloat(booking.totalAmount) : NaN;
      const hasDiscount = Number.isFinite(parsedTotal) && Math.abs(parsedTotal - lineItemSum) >= 0.01;

      const receiptNumber = `APLDW-${String(booking.id).padStart(6, "0")}`;
      const bookingDate = booking.createdAt
        ? new Date(booking.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
        : "N/A";

      const disclaimerGroups = new Map<string, string[]>();
      for (const s of selectedServices) {
        const trimmed = s.disclaimer?.trim();
        if (!trimmed) continue;
        const list = disclaimerGroups.get(trimmed);
        if (list) {
          if (!list.includes(s.name)) list.push(s.name);
        } else {
          disclaimerGroups.set(trimmed, [s.name]);
        }
      }

      const paymentStatus =
        booking.paymentStatus === "completed" || booking.paymentStatus === "paid"
          ? "Paid"
          : booking.paymentStatus === "free"
          ? "Free"
          : "Pending";

      const customerName =
        booking.customerName ||
        (req.user.isAdmin ? "Valued Customer" : (req.user.username ?? "Valued Customer"));
      const customerEmail = booking.customerEmail || req.user.email || "";

      const { generateReceiptPdf } = await import("./pdf-receipt");
      const pdfBytes = await generateReceiptPdf({
        receiptNumber,
        bookingDate,
        customerName,
        email: customerEmail,
        paymentStatus,
        projectName: booking.projectName,
        lineItems: selectedServices.map((s) => ({ name: s.name, price: s.price / 100 })),
        subtotal: lineItemSum,
        discount: Number.isFinite(parsedTotal) ? lineItemSum - parsedTotal : 0,
        total: Number.isFinite(parsedTotal) ? parsedTotal : lineItemSum,
        hasDiscount,
        disclaimers: Array.from(disclaimerGroups.entries()).map(([text, names]) => ({ names, text })),
      });

      const buf = Buffer.from(pdfBytes);
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="${receiptNumber}.pdf"`);
      res.setHeader("Content-Length", String(buf.length));
      res.end(buf);
    } catch (error: any) {
      console.error("Receipt PDF download error:", error);
      res.status(500).json({ message: "Failed to generate receipt PDF." });
    }
  });

  // Email receipt endpoint
  app.post("/api/receipts/:id/email", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);

      const receiptEmailSchema = z.object({
        email: z.string().trim().email("A valid email address is required."),
        customerName: z.string().optional(),
      });
      const parsed = receiptEmailSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0]?.message ?? "A valid email address is required." });
      }
      const { email, customerName } = parsed.data;

      const booking = await storage.getBooking(id);
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }

      if (!req.user.isAdmin && booking.userId !== req.user.id) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const apiKey = process.env.SENDGRID_API_KEY;
      if (!apiKey) {
        return res.status(503).json({
          message: "Email service is not configured. Please add your SendGrid API key to enable this feature.",
        });
      }

      // Load services to build line items
      const allServices = await storage.getServices();
      const selectedServices = booking.selectedServices
        ? allServices.filter((s) => booking.selectedServices?.includes(s.id))
        : booking.serviceId
        ? allServices.filter((s) => s.id === booking.serviceId)
        : [];

      const escHtml = (str: string) =>
        str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

      const lineItemDollars = (cents: number) => (cents / 100).toFixed(2);
      const lineItemSum = selectedServices.reduce((sum, s) => sum + s.price / 100, 0);
      const parsedTotal = booking.totalAmount != null ? parseFloat(booking.totalAmount) : NaN;
      const displayTotal = Number.isFinite(parsedTotal) ? parsedTotal.toFixed(2) : lineItemSum.toFixed(2);
      const hasDiscount = Number.isFinite(parsedTotal) && Math.abs(parsedTotal - lineItemSum) >= 0.01;

      const receiptNumber = `APLDW-${String(booking.id).padStart(6, "0")}`;
      const bookingDate = booking.createdAt
        ? new Date(booking.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
        : "N/A";

      const serviceRows = selectedServices
        .map(
          (s) => `
          <tr>
            <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;">${escHtml(s.name)}</td>
            <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;text-align:right;">$${lineItemDollars(s.price)}</td>
          </tr>`
        )
        .join("");

      const discountRows = hasDiscount
        ? `
          <tr style="color:#555;">
            <td style="padding:8px 12px;border-top:1px solid #e5e7eb;">Subtotal</td>
            <td style="padding:8px 12px;text-align:right;">$${lineItemSum.toFixed(2)}</td>
          </tr>
          <tr style="color:#16a34a;">
            <td style="padding:8px 12px;">Discount</td>
            <td style="padding:8px 12px;text-align:right;">-$${(lineItemSum - parsedTotal).toFixed(2)}</td>
          </tr>`
        : "";

      // Dedupe disclaimers: services that share identical (trimmed) disclaimer
      // text are merged into a single block so the customer never sees the
      // exact same disclaimer more than once.
      const disclaimerGroups = new Map<string, string[]>();
      for (const s of selectedServices) {
        const trimmed = s.disclaimer?.trim();
        if (!trimmed) continue;
        const list = disclaimerGroups.get(trimmed);
        if (list) {
          if (!list.includes(s.name)) list.push(s.name);
        } else {
          disclaimerGroups.set(trimmed, [s.name]);
        }
      }
      const disclaimersBlock = disclaimerGroups.size > 0
        ? `
        <tr>
          <td style="padding:0 32px 24px;">
            <div style="font-size:11px;text-transform:uppercase;color:#6b7280;letter-spacing:0.05em;margin-bottom:10px;">Service Disclaimers</div>
            ${Array.from(disclaimerGroups.entries())
              .map(
                ([text, names]) => `
              <div style="border:1px solid #e5e7eb;border-left:3px solid #C7AE6A;border-radius:4px;padding:10px 12px;margin-bottom:8px;background:#faf8f2;">
                <div style="font-size:12px;font-weight:600;color:#333;margin-bottom:4px;">${escHtml(names.join(", "))}</div>
                <div style="font-size:12px;color:#555;line-height:1.5;white-space:pre-line;">${escHtml(text)}</div>
              </div>`
              )
              .join("")}
          </td>
        </tr>`
        : "";

      const paymentStatus =
        booking.paymentStatus === "completed" || booking.paymentStatus === "paid"
          ? "Paid"
          : booking.paymentStatus === "free"
          ? "Free"
          : "Pending";

      const htmlBody = `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><title>Apollo DroneWorks Receipt</title></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
        <!-- Header -->
        <tr>
          <td style="background:#132642;text-align:center;padding:32px 24px;border-bottom:3px solid #C7AE6A;">
            <div style="font-size:26px;font-weight:bold;color:#C7AE6A;margin-bottom:4px;">Apollo DroneWorks</div>
            <div style="font-size:13px;color:rgba(255,255,255,0.65);">Professional Drone Services</div>
            <div style="font-size:18px;color:#ffffff;margin-top:12px;font-weight:600;">Service Receipt</div>
          </td>
        </tr>
        <!-- Receipt info -->
        <tr>
          <td style="padding:28px 32px 0;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="vertical-align:top;padding-bottom:20px;">
                  <div style="font-size:11px;text-transform:uppercase;color:#6b7280;margin-bottom:4px;">Receipt Number</div>
                  <div style="font-size:14px;font-family:monospace;color:#111827;">${receiptNumber}</div>
                </td>
                <td style="vertical-align:top;padding-bottom:20px;text-align:right;">
                  <div style="font-size:11px;text-transform:uppercase;color:#6b7280;margin-bottom:4px;">Date</div>
                  <div style="font-size:14px;color:#111827;">${bookingDate}</div>
                </td>
              </tr>
              <tr>
                <td style="vertical-align:top;padding-bottom:20px;">
                  <div style="font-size:11px;text-transform:uppercase;color:#6b7280;margin-bottom:4px;">Customer</div>
                  <div style="font-size:14px;color:#111827;">${escHtml(customerName || "Valued Customer")}</div>
                  <div style="font-size:13px;color:#6b7280;">${escHtml(email)}</div>
                </td>
                <td style="vertical-align:top;padding-bottom:20px;text-align:right;">
                  <div style="font-size:11px;text-transform:uppercase;color:#6b7280;margin-bottom:4px;">Payment Status</div>
                  <span style="display:inline-block;padding:3px 12px;border-radius:20px;font-size:12px;font-weight:500;background:${paymentStatus === "Paid" ? "#d1fae5" : "#fef9c3"};color:${paymentStatus === "Paid" ? "#065f46" : "#92400e"};">${paymentStatus}</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        ${
          booking.projectName
            ? `<tr><td style="padding:0 32px 20px;">
                <div style="background:#f3f4f6;border-radius:6px;padding:14px 16px;">
                  <div style="font-size:11px;text-transform:uppercase;color:#6b7280;margin-bottom:4px;">Project Name</div>
                  <div style="font-size:14px;font-weight:600;color:#C7AE6A;">${escHtml(booking.projectName ?? "")}</div>
                </div>
              </td></tr>`
            : ""
        }
        <!-- Services table -->
        <tr>
          <td style="padding:0 32px 24px;">
            <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
              <thead>
                <tr style="border-bottom:2px solid #C7AE6A;">
                  <th style="padding:10px 12px;text-align:left;font-size:11px;text-transform:uppercase;color:#6b7280;font-weight:600;">Service</th>
                  <th style="padding:10px 12px;text-align:right;font-size:11px;text-transform:uppercase;color:#6b7280;font-weight:600;">Price</th>
                </tr>
              </thead>
              <tbody>
                ${serviceRows}
                ${discountRows}
                <tr style="background:#f9fafb;">
                  <td style="padding:12px;font-weight:700;font-size:15px;border-top:2px solid #C7AE6A;">Total${hasDiscount ? " Due" : ""}</td>
                  <td style="padding:12px;text-align:right;font-weight:700;font-size:18px;color:#C7AE6A;border-top:2px solid #C7AE6A;">$${displayTotal}</td>
                </tr>
              </tbody>
            </table>
          </td>
        </tr>
        ${disclaimersBlock}
        <!-- Footer -->
        <tr>
          <td style="text-align:center;padding:24px 32px;border-top:1px solid #e5e7eb;">
            <div style="font-size:14px;color:#6b7280;margin-bottom:6px;">Thank you for choosing Apollo DroneWorks!</div>
            <div style="font-size:12px;color:#9ca3af;">Questions? Contact us at support@apollodroneworks.com</div>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

      // Generate PDF attachment
      const { generateReceiptPdf } = await import("./pdf-receipt");
      const pdfBytes = await generateReceiptPdf({
        receiptNumber,
        bookingDate,
        customerName: customerName || "Valued Customer",
        email,
        paymentStatus,
        projectName: booking.projectName,
        lineItems: selectedServices.map((s) => ({ name: s.name, price: s.price / 100 })),
        subtotal: lineItemSum,
        discount: Number.isFinite(parsedTotal) ? lineItemSum - parsedTotal : 0,
        total: Number.isFinite(parsedTotal) ? parsedTotal : lineItemSum,
        hasDiscount,
        disclaimers: Array.from(disclaimerGroups.entries()).map(([text, names]) => ({ names, text })),
      });
      const pdfBase64 = Buffer.from(pdfBytes).toString("base64");

      // Send via SendGrid
      const sgMail = await import("@sendgrid/mail");
      sgMail.default.setApiKey(apiKey);
      await sgMail.default.send({
        to: email,
        from: {
          email: "noreply@apollodroneworks.com",
          name: "Apollo DroneWorks",
        },
        subject: `Your Apollo DroneWorks Receipt – ${receiptNumber}`,
        html: htmlBody,
        attachments: [
          {
            content: pdfBase64,
            filename: `${receiptNumber}.pdf`,
            type: "application/pdf",
            disposition: "attachment",
          },
        ],
      });

      res.json({ message: "Receipt emailed successfully." });
    } catch (error: any) {
      console.error("Email receipt error:", error?.response?.body ?? error);
      const sgErrors: string[] | undefined = error?.response?.body?.errors?.map((e: any) => e.message);
      const clientMessage = sgErrors?.length
        ? `Email delivery failed: ${sgErrors[0]}`
        : "Failed to send email. Please try again later.";
      res.status(500).json({ message: clientMessage });
    }
  });

  // Gallery routes
  app.get("/api/galleries", async (req, res) => {
    try {
      let galleries;
      console.log('Fetching galleries, authenticated:', req.isAuthenticated());
      if (req.isAuthenticated() && req.user.isAdmin) {
        console.log('Admin user, fetching all galleries');
        galleries = await storage.getGalleries();
      } else if (req.isAuthenticated()) {
        console.log('User galleries for user ID:', req.user.id);
        galleries = await storage.getUserGalleries(req.user.id);
      } else {
        console.log('Public user, fetching public galleries');
        galleries = await storage.getPublicGalleries();
      }
      
      // Log the structure of the first gallery item for debugging
      if (galleries && galleries.length > 0) {
        console.log('First gallery item sample structure:');
        console.log(JSON.stringify({
          id: galleries[0].id,
          name: galleries[0].name,
          type: galleries[0].type,
          url: galleries[0].url && galleries[0].url.substring(0, 100) + '...',
          thumbnail: galleries[0].thumbnail && galleries[0].thumbnail.substring(0, 100) + '...',
          userId: galleries[0].userId,
          category: galleries[0].category,
          isPublic: galleries[0].isPublic
        }));
      } else {
        console.log('No galleries found');
      }
      
      res.json(galleries);
    } catch (error: any) {
      console.error('Error fetching galleries:', error);
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/galleries/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const gallery = await storage.getGallery(id);
      
      if (!gallery) {
        return res.status(404).json({ message: "Gallery not found" });
      }
      
      // Check if gallery is public or user is authenticated and is admin or owner
      if (!gallery.isPublic && 
          (!req.isAuthenticated() || 
           (!req.user.isAdmin && gallery.userId !== req.user.id))) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      res.json(gallery);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/galleries", isAuthenticated, async (req, res) => {
    try {
      // Force userId to be the authenticated user's ID unless admin
      let galleryData = { ...req.body };
      if (!req.user.isAdmin) {
        galleryData.userId = req.user.id;
      }
      
      const validatedData = insertGallerySchema.parse(galleryData);
      if (validatedData.type === "image" || (typeof validatedData.url === "string" && validatedData.url.startsWith("data:image/"))) {
        const check = await validateAerialImageReference(validatedData.url);
        if (!check.compliant) {
          return res.status(400).json({
            error: AERIAL_REJECTION_MESSAGE,
            message: AERIAL_REJECTION_MESSAGE,
            reason: check.reason,
          });
        }
      }
      const gallery = await storage.createGallery(validatedData);
      res.status(201).json(gallery);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.put("/api/galleries/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const gallery = await storage.getGallery(id);
      
      if (!gallery) {
        return res.status(404).json({ message: "Gallery not found" });
      }
      
      // Check if user is admin or the gallery belongs to the user
      if (!req.user.isAdmin && gallery.userId !== req.user.id) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const validatedData = insertGallerySchema.partial().parse(req.body);
      if (typeof validatedData.url === "string" && validatedData.url.length > 0) {
        const looksLikeImage =
          validatedData.type === "image" ||
          gallery.type === "image" ||
          validatedData.url.startsWith("data:image/");
        if (looksLikeImage) {
          const check = await validateAerialImageReference(validatedData.url);
          if (!check.compliant) {
            return res.status(400).json({
              error: AERIAL_REJECTION_MESSAGE,
              message: AERIAL_REJECTION_MESSAGE,
              reason: check.reason,
            });
          }
        }
      }
      const updatedGallery = await storage.updateGallery(id, validatedData);
      res.json(updatedGallery);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/galleries/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const gallery = await storage.getGallery(id);
      
      if (!gallery) {
        return res.status(404).json({ message: "Gallery not found" });
      }
      
      // Check if user is admin or the gallery belongs to the user
      if (!req.user.isAdmin && gallery.userId !== req.user.id) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const success = await storage.deleteGallery(id);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Before/After Image routes
  app.get("/api/before-after", async (req, res) => {
    try {
      const images = req.isAuthenticated() && req.user.isAdmin
        ? await storage.getBeforeAfterImages()
        : await storage.getPublicBeforeAfterImages();
      res.json(images);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/before-after/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const image = await storage.getBeforeAfterImage(id);
      
      if (!image) {
        return res.status(404).json({ message: "Image not found" });
      }
      
      // Check if image is public or user is authenticated and is admin
      if (!image.isPublic && (!req.isAuthenticated() || !req.user.isAdmin)) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      res.json(image);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/before-after", isAdmin, async (req, res) => {
    try {
      const validatedData = insertBeforeAfterImageSchema.parse(req.body);
      const image = await storage.createBeforeAfterImage(validatedData);
      res.status(201).json(image);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.put("/api/before-after/:id", isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertBeforeAfterImageSchema.partial().parse(req.body);
      const image = await storage.updateBeforeAfterImage(id, validatedData);
      
      if (!image) {
        return res.status(404).json({ message: "Image not found" });
      }
      
      res.json(image);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/before-after/:id", isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteBeforeAfterImage(id);
      
      if (!success) {
        return res.status(404).json({ message: "Image not found" });
      }
      
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Blog Post routes
  app.get("/api/blog", async (req, res) => {
    try {
      const posts = await storage.getBlogPosts();
      res.json(posts);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/blog/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const post = await storage.getBlogPost(id);
      
      if (!post) {
        return res.status(404).json({ message: "Blog post not found" });
      }
      
      res.json(post);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/blog", isAdmin, async (req, res) => {
    try {
      const validatedData = insertBlogPostSchema.parse(req.body);
      if (validatedData.imageUrl) {
        const check = await validateAerialImageReference(validatedData.imageUrl);
        if (!check.compliant) {
          return res.status(400).json({
            error: AERIAL_REJECTION_MESSAGE,
            message: AERIAL_REJECTION_MESSAGE,
            reason: check.reason,
          });
        }
      }
      const post = await storage.createBlogPost(validatedData);
      res.status(201).json(post);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  let blogGenerationInFlight = false;
  let blogGenerationLastRun = 0;
  app.post("/api/blog/generate", isAdmin, async (_req, res) => {
    const COOLDOWN_MS = 60_000;
    const now = Date.now();
    if (blogGenerationInFlight) {
      return res.status(429).json({ message: "A blog post is already being generated. Please wait." });
    }
    if (now - blogGenerationLastRun < COOLDOWN_MS) {
      return res.status(429).json({
        message: "Please wait a minute before generating another post.",
      });
    }
    blogGenerationInFlight = true;
    try {
      const { generateBlogPost } = await import("./ai/blog-generator");
      const post = await generateBlogPost();
      blogGenerationLastRun = Date.now();
      res.status(201).json(post);
    } catch (error: any) {
      console.error("[/api/blog/generate] error:", error);
      res.status(500).json({ message: "Blog generation failed. See server logs for details." });
    } finally {
      blogGenerationInFlight = false;
    }
  });

  app.put("/api/blog/:id", isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertBlogPostSchema.partial().parse(req.body);
      if (validatedData.imageUrl) {
        const check = await validateAerialImageReference(validatedData.imageUrl);
        if (!check.compliant) {
          return res.status(400).json({
            error: AERIAL_REJECTION_MESSAGE,
            message: AERIAL_REJECTION_MESSAGE,
            reason: check.reason,
          });
        }
      }
      const post = await storage.updateBlogPost(id, validatedData);
      
      if (!post) {
        return res.status(404).json({ message: "Blog post not found" });
      }
      
      res.json(post);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/blog/:id", isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteBlogPost(id);
      
      if (!success) {
        return res.status(404).json({ message: "Blog post not found" });
      }
      
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Service carousel media routes
  app.post("/api/services/:id/images", isAdmin, async (req, res) => {
    try {
      const serviceId = parseInt(req.params.id);
      const { imageUrl } = req.body;

      if (!imageUrl) {
        return res.status(400).json({ error: "Image URL is required" });
      }

      const service = await storage.getService(serviceId);
      if (!service) {
        return res.status(404).json({ error: "Service not found" });
      }

      const check = await validateAerialImageReference(imageUrl);
      if (!check.compliant) {
        return res.status(400).json({
          error: AERIAL_REJECTION_MESSAGE,
          message: AERIAL_REJECTION_MESSAGE,
          reason: check.reason,
        });
      }

      const currentImages = service.images || [];
      const updatedImages = [...currentImages, imageUrl];

      await storage.updateService(serviceId, { images: updatedImages });
      res.json({ success: true, images: updatedImages });
    } catch (error: any) {
      console.error("Error adding image to service:", error);
      res.status(500).json({ error: "Failed to add image" });
    }
  });

  app.post("/api/services/:id/videos", isAdmin, async (req, res) => {
    try {
      const serviceId = parseInt(req.params.id);
      const { videoUrl } = req.body;

      if (!videoUrl) {
        return res.status(400).json({ error: "Video URL is required" });
      }

      const service = await storage.getService(serviceId);
      if (!service) {
        return res.status(404).json({ error: "Service not found" });
      }

      const currentVideos = service.videos || [];
      const updatedVideos = [...currentVideos, videoUrl];

      await storage.updateService(serviceId, { videos: updatedVideos });
      res.json({ success: true, videos: updatedVideos });
    } catch (error: any) {
      console.error("Error adding video to service:", error);
      res.status(500).json({ error: "Failed to add video" });
    }
  });

  app.delete("/api/services/:id/images", isAdmin, async (req, res) => {
    try {
      const serviceId = parseInt(req.params.id);
      const { imageUrl } = req.body;

      if (!imageUrl) {
        return res.status(400).json({ error: "Image URL is required" });
      }

      const service = await storage.getService(serviceId);
      if (!service) {
        return res.status(404).json({ error: "Service not found" });
      }

      const currentImages = service.images || [];
      const updatedImages = currentImages.filter(url => url !== imageUrl);

      await storage.updateService(serviceId, { images: updatedImages });
      res.json({ success: true, images: updatedImages });
    } catch (error: any) {
      console.error("Error removing image from service:", error);
      res.status(500).json({ error: "Failed to remove image" });
    }
  });

  app.delete("/api/services/:id/videos", isAdmin, async (req, res) => {
    try {
      const serviceId = parseInt(req.params.id);
      const { videoUrl } = req.body;

      if (!videoUrl) {
        return res.status(400).json({ error: "Video URL is required" });
      }

      const service = await storage.getService(serviceId);
      if (!service) {
        return res.status(404).json({ error: "Service not found" });
      }

      const currentVideos = service.videos || [];
      const updatedVideos = currentVideos.filter(url => url !== videoUrl);

      await storage.updateService(serviceId, { videos: updatedVideos });
      res.json({ success: true, videos: updatedVideos });
    } catch (error: any) {
      console.error("Error removing video from service:", error);
      res.status(500).json({ error: "Failed to remove video" });
    }
  });

  // Testimonial routes
  app.get("/api/testimonials", async (req, res) => {
    try {
      const testimonials = req.isAuthenticated() && req.user.isAdmin
        ? await storage.getTestimonials()
        : await storage.getApprovedTestimonials();
      res.json(testimonials);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/testimonials/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const testimonial = await storage.getTestimonial(id);
      
      if (!testimonial) {
        return res.status(404).json({ message: "Testimonial not found" });
      }
      
      // Check if testimonial is approved or user is authenticated and is admin
      if (!testimonial.isApproved && (!req.isAuthenticated() || !req.user.isAdmin)) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      res.json(testimonial);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/testimonials", async (req, res) => {
    try {
      // Default to not approved for new testimonials
      const testimonialData = {
        ...req.body,
        isApproved: req.isAuthenticated() && req.user.isAdmin ? req.body.isApproved : false
      };
      
      const validatedData = insertTestimonialSchema.parse(testimonialData);
      const testimonial = await storage.createTestimonial(validatedData);
      res.status(201).json(testimonial);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.put("/api/testimonials/:id", isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertTestimonialSchema.partial().parse(req.body);
      const testimonial = await storage.updateTestimonial(id, validatedData);
      
      if (!testimonial) {
        return res.status(404).json({ message: "Testimonial not found" });
      }
      
      res.json(testimonial);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/testimonials/:id", isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteTestimonial(id);
      
      if (!success) {
        return res.status(404).json({ message: "Testimonial not found" });
      }
      
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Notification routes
  app.get("/api/notifications", isAuthenticated, async (req, res) => {
    try {
      const notifications = await storage.getUserNotifications(req.user.id);
      res.json(notifications);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/notifications/unread-count", isAuthenticated, async (req, res) => {
    try {
      const count = await storage.getUserUnreadNotificationsCount(req.user.id);
      res.json({ count });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/notifications", isAuthenticated, async (req, res) => {
    try {
      const notificationData = {
        ...req.body,
        userId: req.body.userId || req.user.id
      };
      const notification = await storage.createNotification(notificationData);
      res.status(201).json(notification);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.put("/api/notifications/:id/read", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const notification = await storage.markNotificationAsRead(id);
      if (!notification) {
        return res.status(404).json({ message: "Notification not found" });
      }
      res.json(notification);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.put("/api/notifications/mark-all-read", isAuthenticated, async (req, res) => {
    try {
      await storage.markAllNotificationsAsRead(req.user.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/notifications/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteNotification(id);
      if (!success) {
        return res.status(404).json({ message: "Notification not found" });
      }
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // File Upload endpoint - generic authenticated uploads (e.g. client-portal
  // project files). Marketing image uploads should use /api/upload/image so
  // they go through the aerial-only validator; this endpoint stays generic
  // and accepts any file type the caller is allowed to upload.
  app.post("/api/upload", isAuthenticated, upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const fileUrl = `/uploads/${req.file.filename}`;
      res.json({ url: fileUrl });
    } catch (error: any) {
      console.error("File upload error:", error);
      res.status(500).json({ error: "Upload failed" });
    }
  });

  // Payment processing
  app.post("/api/create-payment-intent", isAuthenticated, async (req, res) => {
    try {
      const { amount, bookingId, projectName } = req.body;
      
      // Check if this is a free booking (amount = 0)
      if (bookingId && (!amount || amount <= 0)) {
        // For free services, mark as completed immediately and return success
        const booking = await storage.getBooking(parseInt(bookingId));
        if (booking) {
          await storage.updateBooking(parseInt(bookingId), {
            paymentStatus: 'free'
          });
          return res.json({ 
            free: true, 
            message: "Free service confirmed. No payment required." 
          });
        }
      }
      
      // TEMPORARY TEST MODE: Skip actual payment for testing
      const testMode = true; // Set to true to enable test mode, false for real payments
      
      if (testMode && bookingId) {
        console.log("TEST MODE ACTIVATED: Processing booking without actual payment");
        
        // Update the booking to mark it as paid in test mode
        const bookingId_num = parseInt(bookingId);
        const booking = await storage.getBooking(bookingId_num);
        
        console.log("Found booking for payment processing:", JSON.stringify(booking, null, 2));
        
        if (booking) {
          const updatedBooking = await storage.updateBooking(bookingId_num, {
            paymentStatus: 'completed',
            paymentIntentId: `test_mode_${Date.now()}`
          });
          
          console.log("Updated booking with payment status:", JSON.stringify(updatedBooking, null, 2));
          
          // Check if we need to create a client project for this booking
          try {
            // Only attempt to create project if it doesn't already exist
            if (booking.userId && !booking.projectId) {
              // Get customer ID from the user ID
              console.log("Looking for customer with userId:", booking.userId);
              const customer = await storage.getCustomerByUserId(booking.userId);
              console.log("Found customer:", customer ? JSON.stringify(customer, null, 2) : "No customer found");
              
              // If customer record exists, use it to create project
              // Otherwise create project directly with user information
              if (customer) {
                // Create client project linked to this booking with name from request or booking or default
                // projectName from req.body takes precedence over booking.projectName
                const projectName = req.body.projectName || booking.projectName || `Project ${new Date().toLocaleDateString()}`;
                
                // Use the primary service ID from booking
                // but also store all selected services in the project metadata
                const projectData = {
                  name: projectName,
                  clientId: customer.id,
                  serviceId: booking.serviceId, // Primary service ID
                  selectedServices: booking.selectedServices || [booking.serviceId], // All selected services or fallback to primary
                  status: "active",
                  address: booking.projectLocation || "",
                  notes: booking.notes || "",
                  startDate: new Date()
                };
                
                const project = await storage.createClientProject(projectData);
                console.log("TEST MODE: Created project with name:", projectName, "for booking ID:", booking.id);
                
                // Update booking with project reference
                const updatedBookingWithProject = await storage.updateBooking(bookingId_num, {
                  projectId: project.id
                });
                
                console.log("Updated booking with project ID:", JSON.stringify(updatedBookingWithProject, null, 2));
              } else {
                // If no customer record exists, create a project using the user info directly
                console.log("No customer record found, creating project with user info");
                
                // Get user details for the project
                const user = await storage.getUser(booking.userId);
                if (user) {
                  // Create client project with user information
                  const projectName = req.body.projectName || booking.projectName || `Project ${new Date().toLocaleDateString()}`;
                  
                  // First create a customer record for this user if needed
                  let customerId;
                  try {
                    const newCustomer = await storage.createCustomer({
                      userId: user.id,
                      firstName: user.firstName || user.username,
                      lastName: user.lastName || '',
                      email: user.email,
                      status: 'active'
                    });
                    customerId = newCustomer.id;
                    console.log("Created new customer record for user:", user.id);
                  } catch (error) {
                    console.error("Failed to create customer record:", error);
                    customerId = 1;
                  }
                  
                  const projectData = {
                    name: projectName,
                    clientId: customerId,
                    serviceId: booking.serviceId,
                    selectedServices: booking.selectedServices || [booking.serviceId],
                    status: "active",
                    address: booking.projectLocation || "",
                    notes: booking.notes || "",
                    startDate: new Date()
                  };
                  
                  try {
                    const project = await storage.createClientProject(projectData);
                    console.log("TEST MODE: Created project with name:", projectName, "for user ID:", user.id);
                    
                    const updatedBookingWithProject = await storage.updateBooking(bookingId_num, {
                      projectId: project.id
                    });
                    
                    console.log("Updated booking with project ID:", JSON.stringify(updatedBookingWithProject, null, 2));
                  } catch (projError) {
                    console.error("Failed to create project for user:", projError);
                  }
                } else {
                  console.error("User not found for ID:", booking.userId);
                }
              }
            }
          } catch (error) {
            console.error("TEST MODE: Failed to create project:", error);
          }
        }
        
        // Return a special response that will be handled by the frontend
        return res.json({ 
          testMode: true,
          free: true, // Reuse the free flow for simplicity
          message: "TEST MODE: Booking confirmed without payment" 
        });
      }
      
      // For paid services, validate amount
      if (!amount || amount <= 0) {
        return res.status(400).json({ message: "Invalid amount" });
      }
      
      // Create payment intent for paid services
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount), // amount should be in cents
        currency: "usd",
        metadata: {
          bookingId: bookingId ? bookingId.toString() : '',
          userId: req.user.id.toString()
        }
      });
      
      // If bookingId is provided, update the booking with the payment intent ID
      if (bookingId) {
        const booking = await storage.getBooking(parseInt(bookingId));
        if (booking) {
          await storage.updateBooking(parseInt(bookingId), {
            paymentIntentId: paymentIntent.id
          });
        }
      }
      
      res.json({ clientSecret: paymentIntent.client_secret });
    } catch (error: any) {
      console.error("Payment intent creation error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Payment confirmation webhook handler
  app.post("/api/payment-webhook", async (req, res) => {
    const payload = req.body;
    const sig = req.headers['stripe-signature'] as string;
    
    let event;
    
    try {
      // Verify webhook signature
      // In production, use a webhook secret from your Stripe dashboard
      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
      
      if (webhookSecret) {
        event = stripe.webhooks.constructEvent(payload, sig, webhookSecret);
      } else {
        // For development, parse the payload directly
        event = payload;
      }
      
      // Handle the event
      if (event.type === 'payment_intent.succeeded') {
        const paymentIntent = event.data.object;
        const bookingId = paymentIntent.metadata.bookingId;

        if (bookingId) {
          await storage.updateBooking(parseInt(bookingId), {
            paymentStatus: 'paid'
          });

          try {
            const booking = await storage.getBooking(parseInt(bookingId));
            if (booking && booking.customerEmail) {
              const service = booking.serviceId ? await storage.getService(booking.serviceId) : null;
              await sendBookingConfirmationEmail({
                toEmail: booking.customerEmail,
                toName: booking.customerName || "Valued Client",
                bookingId: booking.id,
                serviceName: service?.name || "Drone Service",
                scheduledDate: booking.scheduledDate
                  ? new Date(booking.scheduledDate).toLocaleDateString()
                  : "TBD",
                totalAmount: booking.totalAmount
                  ? parseFloat(booking.totalAmount).toFixed(2)
                  : "0.00",
              });
            }
          } catch (emailErr) {
            console.error("Booking confirmation email failed (non-fatal):", emailErr);
          }
        }

        console.log('Payment succeeded for booking:', bookingId);
      }
      
      res.json({ received: true });
    } catch (error: any) {
      console.error('Webhook error:', error.message);
      res.status(400).json({ message: error.message });
    }
  });

  // Contact Message routes
  app.get("/api/contact-messages", isAdmin, async (req, res) => {
    try {
      const messages = await storage.getContactMessages();
      res.json(messages);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/contact-messages/:id", isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const message = await storage.getContactMessage(id);
      
      if (!message) {
        return res.status(404).json({ message: "Contact message not found" });
      }
      
      res.json(message);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/contact", async (req, res) => {
    try {
      const validatedData = insertContactMessageSchema.parse(req.body);
      // Set default status to 'new' for all incoming messages
      const messageData = { ...validatedData, status: "new" };
      const message = await storage.createContactMessage(messageData);
      res.status(201).json(message);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.put("/api/contact-messages/:id", isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertContactMessageSchema.partial().parse(req.body);
      const message = await storage.updateContactMessage(id, validatedData);
      
      if (!message) {
        return res.status(404).json({ message: "Contact message not found" });
      }
      
      res.json(message);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/contact-messages/:id", isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteContactMessage(id);
      
      if (!success) {
        return res.status(404).json({ message: "Contact message not found" });
      }
      
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Business Config routes
  app.get("/api/business-config", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const config = await storage.getBusinessConfig();
      res.json(config || {});
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Read-only endpoint exposing the single global "shareable link" disclaimer
  // text. Used by the external-link interstitial; safe for any authenticated
  // user (including clients) since it only returns the disclaimer string.
  app.get("/api/global-disclaimer", isAuthenticated, async (_req, res) => {
    try {
      const config = await storage.getBusinessConfig();
      const disclaimer = config?.shareableLinkDisclaimer?.trim() ?? "";
      res.json({ disclaimer });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  app.post("/api/business-config", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const config = await storage.updateBusinessConfig(req.body);
      res.json(config);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Quote routes
  app.get("/api/quotes", isAuthenticated, async (req, res) => {
    try {
      // If admin, return all quotes; otherwise, return user's quotes
      const quotes = req.user.isAdmin
        ? await storage.getQuotes()
        : await storage.getQuotes(req.user.id);
      res.json(quotes);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/quotes/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const quote = await storage.getQuote(id);
      
      if (!quote) {
        return res.status(404).json({ message: "Quote not found" });
      }
      
      // Check if user is admin or the quote belongs to the user
      if (!req.user.isAdmin && quote.userId !== req.user.id) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      res.json(quote);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/quotes", isAuthenticated, async (req, res) => {
    try {
      // Force userId to be the authenticated user's ID unless admin
      let quoteData = { ...req.body };
      if (!req.user.isAdmin) {
        quoteData.userId = req.user.id;
      }
      
      // Convert fields with underscores to camelCase field names in the Drizzle schema
      if (quoteData.business_info) {
        quoteData.businessInfo = quoteData.business_info;
        delete quoteData.business_info;
      }
      
      if (quoteData.time_estimates) {
        quoteData.timeEstimates = quoteData.time_estimates;
        delete quoteData.time_estimates;
      }
      
      if (quoteData.third_party_products) {
        quoteData.thirdPartyProducts = quoteData.third_party_products;
        delete quoteData.third_party_products;
      }
      
      const validatedData = insertQuoteSchema.parse(quoteData);
      console.log("Creating quote with data:", JSON.stringify(validatedData, null, 2));
      const quote = await storage.createQuote(validatedData);
      res.status(201).json(quote);
    } catch (error: any) {
      console.error("Quote creation error:", error);
      if (error.errors) {
        console.error("Validation errors:", JSON.stringify(error.errors, null, 2));
      }
      res.status(400).json({ message: error.message });
    }
  });

  app.put("/api/quotes/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const quote = await storage.getQuote(id);
      
      if (!quote) {
        return res.status(404).json({ message: "Quote not found" });
      }
      
      // Check if user is admin or the quote belongs to the user
      if (!req.user.isAdmin && quote.userId !== req.user.id) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      let quoteData = { ...req.body };
      
      // Convert fields with underscores to camelCase field names in the Drizzle schema
      if (quoteData.business_info) {
        quoteData.businessInfo = quoteData.business_info;
        delete quoteData.business_info;
      }
      
      if (quoteData.time_estimates) {
        quoteData.timeEstimates = quoteData.time_estimates;
        delete quoteData.time_estimates;
      }
      
      if (quoteData.third_party_products) {
        quoteData.thirdPartyProducts = quoteData.third_party_products;
        delete quoteData.third_party_products;
      }
      
      const validatedData = insertQuoteSchema.partial().parse(quoteData);
      console.log("Updating quote with data:", JSON.stringify(validatedData, null, 2));
      const updatedQuote = await storage.updateQuote(id, validatedData);
      res.json(updatedQuote);
    } catch (error: any) {
      console.error("Quote update error:", error);
      if (error.errors) {
        console.error("Validation errors:", JSON.stringify(error.errors, null, 2));
      }
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/quotes/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const quote = await storage.getQuote(id);
      
      if (!quote) {
        return res.status(404).json({ message: "Quote not found" });
      }
      
      // Check if user is admin or the quote belongs to the user
      if (!req.user.isAdmin && quote.userId !== req.user.id) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const success = await storage.deleteQuote(id);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Social Media Account routes
  app.get("/api/social-accounts", isAuthenticated, async (req, res) => {
    try {
      const accounts = await storage.getSocialMediaAccounts(req.user.id);
      // Filter out sensitive token information
      const safeAccounts = accounts.map(account => ({
        ...account,
        accessToken: account.accessToken ? "••••••••" : null,
        refreshToken: account.refreshToken ? "••••••••" : null
      }));
      res.json(safeAccounts);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/social-accounts/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const account = await storage.getSocialMediaAccount(id);
      
      if (!account) {
        return res.status(404).json({ message: "Social media account not found" });
      }
      
      // Check if user is admin or the account belongs to the user
      if (!req.user.isAdmin && account.userId !== req.user.id) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      // Filter out sensitive token information
      const safeAccount = {
        ...account,
        accessToken: account.accessToken ? "••••••••" : null,
        refreshToken: account.refreshToken ? "••••••••" : null
      };
      
      res.json(safeAccount);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/social-accounts", isAuthenticated, async (req, res) => {
    try {
      // Force userId to be the authenticated user's ID
      let accountData = { ...req.body, userId: req.user.id };
      const validatedData = insertSocialMediaAccountSchema.parse(accountData);
      const account = await storage.createSocialMediaAccount(validatedData);
      
      // Filter out sensitive token information in response
      const safeAccount = {
        ...account,
        accessToken: account.accessToken ? "••••••••" : null,
        refreshToken: account.refreshToken ? "••••••••" : null
      };
      
      res.status(201).json(safeAccount);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.put("/api/social-accounts/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const account = await storage.getSocialMediaAccount(id);
      
      if (!account) {
        return res.status(404).json({ message: "Social media account not found" });
      }
      
      // Check if user is admin or the account belongs to the user
      if (!req.user.isAdmin && account.userId !== req.user.id) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const validatedData = insertSocialMediaAccountSchema.partial().parse(req.body);
      const updatedAccount = await storage.updateSocialMediaAccount(id, validatedData);
      
      // Filter out sensitive token information in response
      const safeAccount = {
        ...updatedAccount,
        accessToken: updatedAccount.accessToken ? "••••••••" : null,
        refreshToken: updatedAccount.refreshToken ? "••••••••" : null
      };
      
      res.json(safeAccount);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/social-accounts/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const account = await storage.getSocialMediaAccount(id);
      
      if (!account) {
        return res.status(404).json({ message: "Social media account not found" });
      }
      
      // Check if user is admin or the account belongs to the user
      if (!req.user.isAdmin && account.userId !== req.user.id) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const success = await storage.deleteSocialMediaAccount(id);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Social Post routes
  app.get("/api/social-posts", isAuthenticated, async (req, res) => {
    try {
      const posts = await storage.getSocialPosts(req.user.id);
      res.json(posts);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Fetch auto-generated social captions linked to a specific blog post
  app.get("/api/admin/social-captions/:blogPostId", async (req, res) => {
    if (!req.isAuthenticated() || !(req.user as any)?.isAdmin) {
      return res.status(403).json({ message: "Forbidden" });
    }
    try {
      const blogPostId = parseInt(req.params.blogPostId);
      const captions = await db
        .select()
        .from(socialPosts)
        .where(eq(socialPosts.blogPostId, blogPostId))
        .orderBy(socialPosts.platform);
      res.json(captions);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/social-posts/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const post = await storage.getSocialPost(id);
      
      if (!post) {
        return res.status(404).json({ message: "Social post not found" });
      }
      
      // Check if user is admin or the post belongs to the user
      if (!req.user.isAdmin && post.userId !== req.user.id) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      res.json(post);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/social-posts", isAuthenticated, async (req, res) => {
    try {
      // Force userId to be the authenticated user's ID
      let postData = { ...req.body, userId: req.user.id };
      const validatedData = insertSocialPostSchema.parse(postData);
      const post = await storage.createSocialPost(validatedData);
      res.status(201).json(post);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.put("/api/social-posts/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const post = await storage.getSocialPost(id);
      
      if (!post) {
        return res.status(404).json({ message: "Social post not found" });
      }
      
      // Check if user is admin or the post belongs to the user
      if (!req.user.isAdmin && post.userId !== req.user.id) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const validatedData = insertSocialPostSchema.partial().parse(req.body);
      const updatedPost = await storage.updateSocialPost(id, validatedData);
      res.json(updatedPost);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/social-posts/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const post = await storage.getSocialPost(id);
      
      if (!post) {
        return res.status(404).json({ message: "Social post not found" });
      }
      
      // Check if user is admin or the post belongs to the user
      if (!req.user.isAdmin && post.userId !== req.user.id) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const success = await storage.deleteSocialPost(id);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Route for publishing posts to connected social media accounts
  app.post("/api/social-posts/:id/publish", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const post = await storage.getSocialPost(id);
      
      if (!post) {
        return res.status(404).json({ message: "Social post not found" });
      }
      
      // Check if user is admin or the post belongs to the user
      if (!req.user.isAdmin && post.userId !== req.user.id) {
        return res.status(403).json({ message: "Forbidden" });
      }

      // Get platforms to publish to
      const { platforms } = req.body;
      if (!platforms || !Array.isArray(platforms) || platforms.length === 0) {
        return res.status(400).json({ message: "Please specify at least one platform to publish to" });
      }

      // In a real implementation, this would connect to each platform's API
      // For now, we'll just update the post's publishedTo field
      const publishedTo = Array.from(new Set([...(post.publishedTo || []), ...platforms]));
      const updatedPost = await storage.updateSocialPost(id, {
        published: true,
        publishedTo
      });
      
      res.json({
        success: true,
        message: `Post published to ${platforms.join(', ')}`,
        post: updatedPost
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Special route to serve 3D model files with correct content type
  app.get("/3d-models/:filename", (req, res) => {
    const filename = req.params.filename;
    const filePath = path.join(process.cwd(), 'public', filename);
    
    console.log(`3D Model requested: ${filename}, full path: ${filePath}`);
    
    try {
      // Check if file exists
      if (!fs.existsSync(filePath)) {
        console.log(`3D Model file not found: ${filePath}`);
        return res.status(404).send('File not found');
      }
      
      // Set content type based on file extension
      const ext = path.extname(filename).toLowerCase();
      let contentType = 'application/octet-stream'; // default binary type
      
      if (ext === '.obj') {
        contentType = 'model/obj';
      } else if (ext === '.gltf') {
        contentType = 'model/gltf+json';
      } else if (ext === '.glb') {
        contentType = 'model/gltf-binary';
      } else if (ext === '.fbx') {
        contentType = 'application/octet-stream';
      }
      
      console.log(`Serving 3D Model ${filename} with content type: ${contentType}`);
      
      res.setHeader('Content-Type', contentType);
      // Create a read stream to pipe the file to the response
      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);
    } catch (error) {
      console.error(`Error serving 3D model file ${filename}:`, error);
      res.status(500).send('Server error');
    }
  });

  const httpServer = createServer(app);
  
  // Set up websocket server
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  wss.on('connection', (ws) => {
    console.log('WebSocket client connected');
    
    ws.on('message', (message) => {
      console.log('Received message:', message.toString());
      
      try {
        const data = JSON.parse(message.toString());
        
        // Broadcasting to all connected clients
        wss.clients.forEach((client) => {
          if (client !== ws && client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({
              type: data.type || 'message',
              content: data.content,
              sender: data.sender || 'Anonymous',
              timestamp: new Date().toISOString()
            }));
          }
        });
      } catch (error) {
        console.error('Invalid JSON message:', error);
      }
    });
    
    ws.on('close', () => {
      console.log('WebSocket client disconnected');
    });
    
    // Send welcome message
    ws.send(JSON.stringify({
      type: 'system',
      content: 'Connected to Apollo DroneWorks websocket server',
      timestamp: new Date().toISOString()
    }));
  });

  // ===== Financial Management Routes =====

  // Expense Categories
  app.get("/api/expense-categories", isAuthenticated, async (req, res) => {
    try {
      const results = await db.select().from(expenseCategories).orderBy(asc(expenseCategories.name));
      res.json(results);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/expense-categories", isAdmin, async (req, res) => {
    try {
      const validatedData = insertExpenseCategorySchema.parse(req.body);
      const result = await db.insert(expenseCategories).values(validatedData).returning();
      res.status(201).json(result[0]);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.put("/api/expense-categories/:id", isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertExpenseCategorySchema.partial().parse(req.body);
      
      const result = await db
        .update(expenseCategories)
        .set({
          ...validatedData,
          updatedAt: new Date()
        })
        .where(eq(expenseCategories.id, id))
        .returning();
      
      if (result.length === 0) {
        return res.status(404).json({ message: "Expense category not found" });
      }
      
      res.json(result[0]);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/expense-categories/:id", isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      // Check if category exists
      const existing = await db.select().from(expenseCategories).where(eq(expenseCategories.id, id));
      if (existing.length === 0) {
        return res.status(404).json({ message: "Expense category not found" });
      }
      
      // Check if this category is in use
      const inUseExpenses = await db.select({ count: sql`count(*)` }).from(expenses).where(eq(expenses.categoryId, id));
      if (parseInt(inUseExpenses[0].count.toString()) > 0) {
        return res.status(400).json({ 
          message: "Cannot delete category that is in use. Update expenses to use a different category first."
        });
      }
      
      await db.delete(expenseCategories).where(eq(expenseCategories.id, id));
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Expenses
  app.get("/api/expenses", isAuthenticated, async (req, res) => {
    try {
      const { startDate, endDate, categoryId, minAmount, maxAmount, vendor, sort, order, query } = req.query;
      
      let conditions = [];
      
      // Only admins can see all expenses, regular users see only their own
      if (!req.user?.isAdmin) {
        conditions.push(eq(expenses.userId, req.user?.id as number));
      }
      
      // Apply filters if provided
      if (startDate) {
        conditions.push(gte(expenses.date, new Date(startDate as string)));
      }
      
      if (endDate) {
        conditions.push(lte(expenses.date, new Date(endDate as string)));
      }
      
      if (categoryId) {
        conditions.push(eq(expenses.categoryId, parseInt(categoryId as string)));
      }
      
      if (minAmount) {
        conditions.push(gte(expenses.amount, parseFloat(minAmount as string)));
      }
      
      if (maxAmount) {
        conditions.push(lte(expenses.amount, parseFloat(maxAmount as string)));
      }
      
      if (vendor) {
        conditions.push(like(expenses.vendor, `%${vendor}%`));
      }
      
      if (query) {
        conditions.push(
          sql`(
            ${expenses.description} ILIKE ${`%${query}%`} OR
            ${expenses.vendor} ILIKE ${`%${query}%`} OR
            ${expenses.notes} ILIKE ${`%${query}%`}
          )`
        );
      }
      
      let queryBuilder = db.select({
        expense: expenses,
        categoryName: expenseCategories.name,
        categoryColor: expenseCategories.color,
        categoryIcon: expenseCategories.icon
      })
        .from(expenses)
        .leftJoin(expenseCategories, eq(expenses.categoryId, expenseCategories.id));
      
      if (conditions.length > 0) {
        queryBuilder = queryBuilder.where(and(...conditions));
      }
      
      // Apply sorting
      const sortField = sort as string || 'date';
      const sortOrder = (order as string || 'desc').toLowerCase() === 'asc' ? asc : desc;
      
      switch (sortField) {
        case 'amount':
          queryBuilder = queryBuilder.orderBy(sortOrder(expenses.amount));
          break;
        case 'vendor':
          queryBuilder = queryBuilder.orderBy(sortOrder(expenses.vendor));
          break;
        case 'category':
          queryBuilder = queryBuilder.orderBy(sortOrder(expenseCategories.name));
          break;
        case 'createdAt':
          queryBuilder = queryBuilder.orderBy(sortOrder(expenses.createdAt));
          break;
        case 'date':
        default:
          queryBuilder = queryBuilder.orderBy(sortOrder(expenses.date));
          break;
      }
      
      const results = await queryBuilder;
      
      // Format the results
      const formattedResults = results.map(row => ({
        ...row.expense,
        categoryName: row.categoryName,
        categoryColor: row.categoryColor,
        categoryIcon: row.categoryIcon
      }));
      
      res.json(formattedResults);
    } catch (error: any) {
      console.error("Error fetching expenses:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/expenses/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      const result = await db.select({
        expense: expenses,
        categoryName: expenseCategories.name,
        categoryColor: expenseCategories.color,
        categoryIcon: expenseCategories.icon
      })
        .from(expenses)
        .leftJoin(expenseCategories, eq(expenses.categoryId, expenseCategories.id))
        .where(eq(expenses.id, id));
      
      if (result.length === 0) {
        return res.status(404).json({ message: "Expense not found" });
      }
      
      // Check user permission
      if (!req.user?.isAdmin && result[0].expense.userId !== req.user?.id) {
        return res.status(403).json({ message: "You don't have permission to view this expense" });
      }
      
      const formattedResult = {
        ...result[0].expense,
        categoryName: result[0].categoryName,
        categoryColor: result[0].categoryColor,
        categoryIcon: result[0].categoryIcon
      };
      
      res.json(formattedResult);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Normalize fields coming in from a multipart/form-data POST (multer puts
  // every text field on req.body as a string). Falls back to identity for
  // plain JSON requests.
  const normalizeExpenseBody = (body: any, file?: Express.Multer.File) => {
    const out: Record<string, any> = { ...body };
    if (typeof out.amount === "string" && out.amount !== "") {
      // Schema accepts numeric strings, leave as-is.
    }
    if (typeof out.categoryId === "string" && out.categoryId !== "") {
      const n = parseInt(out.categoryId);
      if (!isNaN(n)) out.categoryId = n;
    }
    if (typeof out.projectId === "string" && out.projectId !== "") {
      const n = parseInt(out.projectId);
      if (!isNaN(n)) out.projectId = n;
    }
    if (typeof out.isDeductible === "string") {
      out.isDeductible = out.isDeductible === "true";
    }
    if (typeof out.isRecurring === "string") {
      out.isRecurring = out.isRecurring === "true";
    }
    if (typeof out.tags === "string") {
      try { out.tags = JSON.parse(out.tags); } catch { /* ignore */ }
    }
    if (file) {
      out.receiptUrl = `/uploads/${file.filename}`;
    }
    return out;
  };

  app.post("/api/expenses", isAuthenticated, upload.single("receipt"), async (req, res) => {
    try {
      let expenseData = normalizeExpenseBody(req.body, req.file);
      // Ensure userId is set to current user if not admin
      if (!req.user?.isAdmin) {
        expenseData.userId = req.user?.id;
      } else if (!expenseData.userId) {
        expenseData.userId = req.user?.id;
      }

      const validatedData = insertExpenseSchema.parse(expenseData);

      const result = await db.insert(expenses).values(validatedData).returning();

      // Synchronize financial data with analytics data
      await synchronizeFinancialWithAnalytics();

      res.status(201).json(result[0]);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.put("/api/expenses/:id", isAuthenticated, upload.single("receipt"), async (req, res) => {
    try {
      const id = parseInt(req.params.id);

      // Check if expense exists and belongs to user
      const existingExpense = await db.select().from(expenses).where(eq(expenses.id, id));

      if (existingExpense.length === 0) {
        return res.status(404).json({ message: "Expense not found" });
      }

      // Check permission
      if (!req.user?.isAdmin && existingExpense[0].userId !== req.user?.id) {
        return res.status(403).json({ message: "You don't have permission to update this expense" });
      }

      const expenseData = normalizeExpenseBody(req.body, req.file);
      const validatedData = insertExpenseSchema.partial().parse(expenseData);

      const result = await db
        .update(expenses)
        .set({
          ...validatedData,
          updatedAt: new Date()
        })
        .where(eq(expenses.id, id))
        .returning();

      // Synchronize financial data with analytics data
      await synchronizeFinancialWithAnalytics();

      res.json(result[0]);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Frontend uses PATCH for expense updates; alias to the same handler logic.
  app.patch("/api/expenses/:id", isAuthenticated, upload.single("receipt"), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const existingExpense = await db.select().from(expenses).where(eq(expenses.id, id));
      if (existingExpense.length === 0) {
        return res.status(404).json({ message: "Expense not found" });
      }
      if (!req.user?.isAdmin && existingExpense[0].userId !== req.user?.id) {
        return res.status(403).json({ message: "You don't have permission to update this expense" });
      }

      const expenseData = normalizeExpenseBody(req.body, req.file);
      const validatedData = insertExpenseSchema.partial().parse(expenseData);

      const result = await db
        .update(expenses)
        .set({ ...validatedData, updatedAt: new Date() })
        .where(eq(expenses.id, id))
        .returning();

      await synchronizeFinancialWithAnalytics();
      res.json(result[0]);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/expenses/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      // Check if expense exists and belongs to user
      const existingExpense = await db.select().from(expenses).where(eq(expenses.id, id));
      
      if (existingExpense.length === 0) {
        return res.status(404).json({ message: "Expense not found" });
      }
      
      // Check permission
      if (!req.user?.isAdmin && existingExpense[0].userId !== req.user?.id) {
        return res.status(403).json({ message: "You don't have permission to delete this expense" });
      }
      
      await db.delete(expenses).where(eq(expenses.id, id));
      
      // Synchronize financial data with analytics data
      await synchronizeFinancialWithAnalytics();
      
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Income Routes
  app.get("/api/income", isAuthenticated, async (req, res) => {
    try {
      const { startDate, endDate, minAmount, maxAmount, client, sort, order, query } = req.query;
      
      let conditions = [];
      
      // Only admins can see all income entries, regular users see only their own
      if (!req.user?.isAdmin) {
        conditions.push(eq(income.userId, req.user?.id as number));
      }
      
      // Apply filters if provided
      if (startDate) {
        conditions.push(gte(income.date, new Date(startDate as string)));
      }
      
      if (endDate) {
        conditions.push(lte(income.date, new Date(endDate as string)));
      }
      
      if (minAmount) {
        conditions.push(gte(income.amount, parseFloat(minAmount as string)));
      }
      
      if (maxAmount) {
        conditions.push(lte(income.amount, parseFloat(maxAmount as string)));
      }
      
      if (client) {
        conditions.push(like(income.client, `%${client}%`));
      }
      
      if (query) {
        conditions.push(
          sql`(
            ${income.description} ILIKE ${`%${query}%`} OR
            ${income.client} ILIKE ${`%${query}%`} OR
            ${income.notes} ILIKE ${`%${query}%`}
          )`
        );
      }
      
      let queryBuilder = db.select().from(income);
      
      if (conditions.length > 0) {
        queryBuilder = queryBuilder.where(and(...conditions));
      }
      
      // Apply sorting
      const sortField = sort as string || 'date';
      const sortOrder = (order as string || 'desc').toLowerCase() === 'asc' ? asc : desc;
      
      switch (sortField) {
        case 'amount':
          queryBuilder = queryBuilder.orderBy(sortOrder(income.amount));
          break;
        case 'client':
          queryBuilder = queryBuilder.orderBy(sortOrder(income.client));
          break;
        case 'category':
          queryBuilder = queryBuilder.orderBy(sortOrder(income.category));
          break;
        case 'createdAt':
          queryBuilder = queryBuilder.orderBy(sortOrder(income.createdAt));
          break;
        case 'date':
        default:
          queryBuilder = queryBuilder.orderBy(sortOrder(income.date));
          break;
      }
      
      const results = await queryBuilder;
      res.json(results);
    } catch (error: any) {
      console.error("Error fetching income:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/income/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      const result = await db.select().from(income).where(eq(income.id, id));
      
      if (result.length === 0) {
        return res.status(404).json({ message: "Income entry not found" });
      }
      
      // Check user permission
      if (!req.user?.isAdmin && result[0].userId !== req.user?.id) {
        return res.status(403).json({ message: "You don't have permission to view this income entry" });
      }
      
      res.json(result[0]);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/income", isAuthenticated, async (req, res) => {
    try {
      // Ensure userId is set to current user if not admin
      let incomeData = { ...req.body };
      if (!req.user?.isAdmin) {
        incomeData.userId = req.user?.id;
      }
      
      const validatedData = insertIncomeSchema.parse(incomeData);
      
      const result = await db.insert(income).values(validatedData).returning();

      await syncIncomeToProjectAnalytics(result[0].bookingId ?? null);

      res.status(201).json(result[0]);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.put("/api/income/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      // Check if income entry exists and belongs to user
      const existingIncome = await db.select().from(income).where(eq(income.id, id));
      
      if (existingIncome.length === 0) {
        return res.status(404).json({ message: "Income entry not found" });
      }
      
      // Check permission
      if (!req.user?.isAdmin && existingIncome[0].userId !== req.user?.id) {
        return res.status(403).json({ message: "You don't have permission to update this income entry" });
      }
      
      const validatedData = insertIncomeSchema.partial().parse(req.body);
      
      const result = await db
        .update(income)
        .set({
          ...validatedData,
          updatedAt: new Date()
        })
        .where(eq(income.id, id))
        .returning();

      await syncIncomeToProjectAnalytics(result[0].bookingId ?? null);

      res.json(result[0]);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/income/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      // Check if income entry exists and belongs to user
      const existingIncome = await db.select().from(income).where(eq(income.id, id));
      
      if (existingIncome.length === 0) {
        return res.status(404).json({ message: "Income entry not found" });
      }
      
      // Check permission
      if (!req.user?.isAdmin && existingIncome[0].userId !== req.user?.id) {
        return res.status(403).json({ message: "You don't have permission to delete this income entry" });
      }
      
      const deletedBookingId = existingIncome[0].bookingId ?? null;
      await db.delete(income).where(eq(income.id, id));
      await syncIncomeToProjectAnalytics(deletedBookingId);

      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ===== Data Analytics Routes =====

  // Drone Analytics
  app.get("/api/drone-analytics", isAdmin, async (req, res) => {
    try {
      const results = await db.select().from(droneAnalytics).orderBy(asc(droneAnalytics.droneName));
      res.json(results);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/drone-analytics/:id", isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const result = await db.select().from(droneAnalytics).where(eq(droneAnalytics.id, id));
      
      if (result.length === 0) {
        return res.status(404).json({ message: "Drone analytics not found" });
      }
      
      res.json(result[0]);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/drone-analytics", isAdmin, async (req, res) => {
    try {
      const validatedData = insertDroneAnalyticsSchema.parse(req.body);
      const result = await db.insert(droneAnalytics).values(validatedData).returning();
      res.status(201).json(result[0]);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.put("/api/drone-analytics/:id", isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertDroneAnalyticsSchema.partial().parse(req.body);
      
      const result = await db
        .update(droneAnalytics)
        .set({
          ...validatedData,
          updatedAt: new Date()
        })
        .where(eq(droneAnalytics.id, id))
        .returning();
      
      if (result.length === 0) {
        return res.status(404).json({ message: "Drone analytics not found" });
      }
      
      res.json(result[0]);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/drone-analytics/:id", isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      // Check if record exists
      const existing = await db.select().from(droneAnalytics).where(eq(droneAnalytics.id, id));
      if (existing.length === 0) {
        return res.status(404).json({ message: "Drone analytics not found" });
      }
      
      // Check if this drone has flight logs
      const flightLogsCount = await db
        .select({ count: sql`count(*)` })
        .from(flightLogs)
        .where(eq(flightLogs.droneId, id));
      
      if (parseInt(flightLogsCount[0].count.toString()) > 0) {
        return res.status(400).json({ 
          message: "Cannot delete drone with existing flight logs. Delete the flight logs first."
        });
      }
      
      await db.delete(droneAnalytics).where(eq(droneAnalytics.id, id));
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Flight Logs
  app.get("/api/flight-logs", isAuthenticated, async (req, res) => {
    try {
      const { droneId, startDate, endDate, pilotId } = req.query;
      
      let conditions = [];
      
      if (droneId) {
        conditions.push(eq(flightLogs.droneId, parseInt(droneId as string)));
      }
      
      if (startDate) {
        conditions.push(gte(flightLogs.flightDate, new Date(startDate as string)));
      }
      
      if (endDate) {
        conditions.push(lte(flightLogs.flightDate, new Date(endDate as string)));
      }
      
      if (pilotId) {
        conditions.push(eq(flightLogs.pilotId, parseInt(pilotId as string)));
      }
      
      let queryBuilder = db.select({
        flightLog: flightLogs,
        droneName: droneAnalytics.droneName,
        droneModel: droneAnalytics.droneModel
      })
        .from(flightLogs)
        .leftJoin(droneAnalytics, eq(flightLogs.droneId, droneAnalytics.id))
        .orderBy(desc(flightLogs.flightDate));
      
      if (conditions.length > 0) {
        queryBuilder = queryBuilder.where(and(...conditions));
      }
      
      const results = await queryBuilder;
      
      // Format the results
      const formattedResults = results.map(row => ({
        ...row.flightLog,
        droneName: row.droneName,
        droneModel: row.droneModel
      }));
      
      res.json(formattedResults);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/flight-logs", isAuthenticated, async (req, res) => {
    try {
      // Set pilot ID to current user if not provided
      let flightLogData = { ...req.body };
      if (!flightLogData.pilotId && req.user) {
        flightLogData.pilotId = req.user.id;
      }
      
      const validatedData = insertFlightLogSchema.parse(flightLogData);
      
      // Calculate duration if start and end times are provided but duration is not
      if (!validatedData.duration && validatedData.startTime && validatedData.endTime) {
        const start = new Date(validatedData.startTime);
        const end = new Date(validatedData.endTime);
        const durationHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
        validatedData.duration = parseFloat(durationHours.toFixed(2));
      }
      
      const result = await db.insert(flightLogs).values(validatedData).returning();
      
      // Update drone analytics with the new flight data
      if (validatedData.droneId) {
        const drone = await db.select().from(droneAnalytics).where(eq(droneAnalytics.id, validatedData.droneId));
        
        if (drone.length > 0) {
          const currentFlightHours = drone[0].flightHours || 0;
          const newFlightHours = currentFlightHours + (validatedData.duration || 0);
          
          // Update drone analytics
          await db.update(droneAnalytics)
            .set({ 
              flightHours: newFlightHours,
              lastFlight: validatedData.startTime,
              updatedAt: new Date()
            })
            .where(eq(droneAnalytics.id, validatedData.droneId));
        }
      }
      
      res.status(201).json(result[0]);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.put("/api/flight-logs/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      // Get existing flight log
      const existingLog = await db.select().from(flightLogs).where(eq(flightLogs.id, id));
      
      if (existingLog.length === 0) {
        return res.status(404).json({ message: "Flight log not found" });
      }
      
      // Only admin or the pilot who created the log can update it
      if (!req.user?.isAdmin && existingLog[0].pilotId !== req.user?.id) {
        return res.status(403).json({ message: "You don't have permission to update this flight log" });
      }
      
      const validatedData = insertFlightLogSchema.partial().parse(req.body);
      
      // Calculate duration if start and end times are provided but duration is not
      if (validatedData.startTime && validatedData.endTime && !validatedData.duration) {
        const start = new Date(validatedData.startTime);
        const end = new Date(validatedData.endTime);
        const durationHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
        validatedData.duration = parseFloat(durationHours.toFixed(2));
      }
      
      const result = await db
        .update(flightLogs)
        .set({
          ...validatedData,
          updatedAt: new Date()
        })
        .where(eq(flightLogs.id, id))
        .returning();
      
      // Update drone analytics if the flight duration has changed
      if (validatedData.duration && existingLog[0].droneId) {
        const oldDuration = existingLog[0].duration || 0;
        const durationDiff = validatedData.duration - oldDuration;
        
        if (durationDiff !== 0) {
          const drone = await db.select().from(droneAnalytics).where(eq(droneAnalytics.id, existingLog[0].droneId));
          
          if (drone.length > 0) {
            const currentFlightHours = drone[0].flightHours || 0;
            const newFlightHours = currentFlightHours + durationDiff;
            
            // Update drone analytics
            await db.update(droneAnalytics)
              .set({ 
                flightHours: newFlightHours,
                updatedAt: new Date()
              })
              .where(eq(droneAnalytics.id, existingLog[0].droneId));
          }
        }
      }
      
      res.json(result[0]);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/flight-logs/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      // Get existing flight log
      const existingLog = await db.select().from(flightLogs).where(eq(flightLogs.id, id));
      
      if (existingLog.length === 0) {
        return res.status(404).json({ message: "Flight log not found" });
      }
      
      // Only admin or the pilot who created the log can delete it
      if (!req.user?.isAdmin && existingLog[0].pilotId !== req.user?.id) {
        return res.status(403).json({ message: "You don't have permission to delete this flight log" });
      }
      
      // Update drone analytics to subtract the flight hours
      if (existingLog[0].droneId && existingLog[0].duration) {
        const drone = await db.select().from(droneAnalytics).where(eq(droneAnalytics.id, existingLog[0].droneId));
        
        if (drone.length > 0) {
          const currentFlightHours = drone[0].flightHours || 0;
          const newFlightHours = Math.max(0, currentFlightHours - existingLog[0].duration);
          
          // Update drone analytics
          await db.update(droneAnalytics)
            .set({ 
              flightHours: newFlightHours,
              updatedAt: new Date()
            })
            .where(eq(droneAnalytics.id, existingLog[0].droneId));
        }
      }
      
      await db.delete(flightLogs).where(eq(flightLogs.id, id));
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Project Analytics
  app.get("/api/project-analytics", isAdmin, async (req, res) => {
    try {
      const { serviceType, clientId, minProfit, maxProfit, startDate, endDate } = req.query;
      
      let conditions = [];
      
      if (serviceType) {
        conditions.push(eq(projectAnalytics.serviceType, serviceType as string));
      }
      
      if (clientId) {
        conditions.push(eq(projectAnalytics.clientId, parseInt(clientId as string)));
      }
      
      if (minProfit) {
        conditions.push(gte(projectAnalytics.profit, parseFloat(minProfit as string)));
      }
      
      if (maxProfit) {
        conditions.push(lte(projectAnalytics.profit, parseFloat(maxProfit as string)));
      }
      
      if (startDate) {
        conditions.push(gte(projectAnalytics.completionDate, new Date(startDate as string)));
      }
      
      if (endDate) {
        conditions.push(lte(projectAnalytics.completionDate, new Date(endDate as string)));
      }
      
      let queryBuilder = db.select().from(projectAnalytics).orderBy(desc(projectAnalytics.completionDate));
      
      if (conditions.length > 0) {
        queryBuilder = queryBuilder.where(and(...conditions));
      }
      
      const results = await queryBuilder;
      res.json(results);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/project-analytics", isAdmin, async (req, res) => {
    try {
      const validatedData = insertProjectAnalyticsSchema.parse(req.body);
      const result = await db.insert(projectAnalytics).values(validatedData).returning();
      
      // Synchronize financial data with analytics data
      await synchronizeFinancialWithAnalytics();
      
      res.status(201).json(result[0]);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.put("/api/project-analytics/:id", isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertProjectAnalyticsSchema.partial().parse(req.body);
      
      const result = await db
        .update(projectAnalytics)
        .set({
          ...validatedData,
          updatedAt: new Date()
        })
        .where(eq(projectAnalytics.id, id))
        .returning();
      
      if (result.length === 0) {
        return res.status(404).json({ message: "Project analytics not found" });
      }
      
      // Synchronize financial data with analytics data
      await synchronizeFinancialWithAnalytics();
      
      res.json(result[0]);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/project-analytics/:id", isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      // Check if record exists
      const existing = await db.select().from(projectAnalytics).where(eq(projectAnalytics.id, id));
      if (existing.length === 0) {
        return res.status(404).json({ message: "Project analytics not found" });
      }
      
      await db.delete(projectAnalytics).where(eq(projectAnalytics.id, id));
      
      // Synchronize financial data with analytics data
      await synchronizeFinancialWithAnalytics();
      
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Client Analytics
  app.get("/api/client-analytics", isAdmin, async (req, res) => {
    try {
      const { clientType, startDate, endDate } = req.query;
      
      let conditions = [];
      
      if (clientType) {
        conditions.push(eq(clientAnalytics.clientType, clientType as string));
      }
      
      if (startDate) {
        conditions.push(gte(clientAnalytics.createdAt, new Date(startDate as string)));
      }
      
      if (endDate) {
        conditions.push(lte(clientAnalytics.createdAt, new Date(endDate as string)));
      }
      
      let queryBuilder = db.select().from(clientAnalytics).orderBy(desc(clientAnalytics.createdAt));
      
      if (conditions.length > 0) {
        queryBuilder = queryBuilder.where(and(...conditions));
      }
      
      const results = await queryBuilder;
      res.json(results);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/client-analytics", isAdmin, async (req, res) => {
    try {
      const validatedData = insertClientAnalyticsSchema.parse(req.body);
      const result = await db.insert(clientAnalytics).values(validatedData).returning();
      
      // Synchronize financial data with analytics data
      await synchronizeFinancialWithAnalytics();
      
      res.status(201).json(result[0]);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.put("/api/client-analytics/:id", isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertClientAnalyticsSchema.partial().parse(req.body);
      
      const result = await db
        .update(clientAnalytics)
        .set({
          ...validatedData,
          updatedAt: new Date()
        })
        .where(eq(clientAnalytics.id, id))
        .returning();
      
      if (result.length === 0) {
        return res.status(404).json({ message: "Client analytics not found" });
      }
      
      // Synchronize financial data with analytics data
      await synchronizeFinancialWithAnalytics();
      
      res.json(result[0]);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/client-analytics/:id", isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      // Check if record exists
      const existing = await db.select().from(clientAnalytics).where(eq(clientAnalytics.id, id));
      if (existing.length === 0) {
        return res.status(404).json({ message: "Client analytics not found" });
      }
      
      await db.delete(clientAnalytics).where(eq(clientAnalytics.id, id));
      
      // Synchronize financial data with analytics data
      await synchronizeFinancialWithAnalytics();
      
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Marketing Analytics
  app.get("/api/marketing-analytics", isAdmin, async (req, res) => {
    try {
      const { source, medium, campaign, startDate, endDate } = req.query;
      
      let conditions = [];
      
      if (source) {
        conditions.push(eq(marketingAnalytics.source, source as string));
      }
      
      if (medium) {
        conditions.push(eq(marketingAnalytics.medium, medium as string));
      }
      
      if (campaign) {
        conditions.push(eq(marketingAnalytics.campaign, campaign as string));
      }
      
      if (startDate) {
        conditions.push(gte(marketingAnalytics.date, new Date(startDate as string)));
      }
      
      if (endDate) {
        conditions.push(lte(marketingAnalytics.date, new Date(endDate as string)));
      }
      
      let queryBuilder = db.select().from(marketingAnalytics).orderBy(desc(marketingAnalytics.date));
      
      if (conditions.length > 0) {
        queryBuilder = queryBuilder.where(and(...conditions));
      }
      
      const results = await queryBuilder;
      res.json(results);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/marketing-analytics", isAdmin, async (req, res) => {
    try {
      const validatedData = insertMarketingAnalyticsSchema.parse(req.body);
      const result = await db.insert(marketingAnalytics).values(validatedData).returning();
      
      // Synchronize financial data with analytics data
      await synchronizeFinancialWithAnalytics();
      
      res.status(201).json(result[0]);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.put("/api/marketing-analytics/:id", isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertMarketingAnalyticsSchema.partial().parse(req.body);
      
      const result = await db
        .update(marketingAnalytics)
        .set({
          ...validatedData,
          updatedAt: new Date()
        })
        .where(eq(marketingAnalytics.id, id))
        .returning();
      
      if (result.length === 0) {
        return res.status(404).json({ message: "Marketing analytics not found" });
      }
      
      // Synchronize financial data with analytics data
      await synchronizeFinancialWithAnalytics();
      
      res.json(result[0]);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/marketing-analytics/:id", isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      // Check if record exists
      const existing = await db.select().from(marketingAnalytics).where(eq(marketingAnalytics.id, id));
      if (existing.length === 0) {
        return res.status(404).json({ message: "Marketing analytics not found" });
      }
      
      await db.delete(marketingAnalytics).where(eq(marketingAnalytics.id, id));
      
      // Synchronize financial data with analytics data
      await synchronizeFinancialWithAnalytics();
      
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // AI Recommendation Engine Routes
  const aiEngine = new AIRecommendationEngine();

  app.post("/api/ai/recommendations", isAdmin, async (req, res) => {
    try {
      const recommendations = await aiEngine.generateRecommendations();
      res.json(recommendations);
    } catch (error: any) {
      console.error("Error generating AI recommendations:", error);
      res.status(500).json({ message: "Failed to generate recommendations" });
    }
  });

  app.get("/api/analytics/overview", isAdmin, async (req, res) => {
    try {
      const { projectAnalytics } = await import("@shared/schema");
      const { sql } = await import("drizzle-orm");
      
      // Calculate analytics overview
      const results = await db.execute(sql`
        SELECT 
          COUNT(*) as total_projects,
          AVG(profit_margin) as avg_profit_margin,
          SUM(flight_hours) as total_flight_hours,
          AVG(quality_score) as avg_quality_score
        FROM project_analytics 
        WHERE created_at >= NOW() - INTERVAL '12 months'
      `);
      
      const overview = results[0] || {};
      
      res.json({
        totalProjects: Number(overview.total_projects) || 0,
        avgProfitMargin: Math.round(Number(overview.avg_profit_margin) || 0),
        totalFlightHours: Math.round(Number(overview.total_flight_hours) || 0),
        avgQualityScore: Math.round((Number(overview.avg_quality_score) || 0) * 10) / 10
      });
    } catch (error: any) {
      console.error("Error fetching analytics overview:", error);
      res.status(500).json({ message: "Failed to fetch analytics overview" });
    }
  });

  // Register upload routes
  registerUploadRoutes(app);

  // Register pricing optimization routes
  try {
    const { registerPricingRoutes } = await import('./pricing-routes');
    registerPricingRoutes(app);
    console.log("Pricing routes registered successfully");
  } catch (error) {
    console.error("Error registering pricing routes:", error);
  }

  // Register quote generation routes
  try {
    const { registerQuoteRoutes } = await import('./quote-routes');
    registerQuoteRoutes(app);
    console.log("Quote routes registered successfully");
  } catch (error) {
    console.error("Error registering quote routes:", error);
  }

  // Register notification routes
  try {
    const { registerNotificationRoutes } = await import('./notification-routes');
    registerNotificationRoutes(app);
    console.log("Notification routes registered successfully");
  } catch (error) {
    console.error("Error registering notification routes:", error);
  }

  // Register AI pricing routes
  try {
    registerAIPricingRoutes(app);
    console.log("AI pricing routes registered successfully");
  } catch (error) {
    console.error("Error registering AI pricing routes:", error);
  }

  // Industry Tiles routes (public endpoints for frontend)
  app.get("/api/industry-tiles", async (req, res) => {
    try {
      const tiles = await storage.getIndustryTiles();
      res.json(tiles);
    } catch (error: any) {
      console.error("Error fetching industry tiles:", error);
      res.status(500).json({ message: "Failed to fetch industry tiles" });
    }
  });

  app.get("/api/industry-tiles/:slug", async (req, res) => {
    try {
      const tile = await storage.getIndustryTileBySlug(req.params.slug);
      if (!tile) {
        return res.status(404).json({ message: "Industry tile not found" });
      }
      res.json(tile);
    } catch (error: any) {
      console.error("Error fetching industry tile:", error);
      res.status(500).json({ message: "Failed to fetch industry tile" });
    }
  });

  app.get("/api/industry-tiles/:slug/services", async (req, res) => {
    try {
      const tile = await storage.getIndustryTileBySlug(req.params.slug);
      if (!tile) {
        return res.status(404).json({ message: "Industry tile not found" });
      }
      const services = await storage.getServicesForTile(tile.id);
      res.json(services);
    } catch (error: any) {
      console.error("Error fetching services for industry tile:", error);
      res.status(500).json({ message: "Failed to fetch services" });
    }
  });

  // Admin routes for managing industry tiles
  app.get("/api/admin/industry-tiles", isAdmin, async (req, res) => {
    try {
      // Get all tiles including inactive ones for admin
      const { industryTiles } = await import("@shared/schema");
      const allTiles = await db.select().from(industryTiles).orderBy(asc(industryTiles.displayOrder));
      res.json(allTiles);
    } catch (error: any) {
      console.error("Error fetching all industry tiles:", error);
      res.status(500).json({ message: "Failed to fetch industry tiles" });
    }
  });

  app.get("/api/admin/industry-tiles/:id", isAdmin, async (req, res) => {
    try {
      const tile = await storage.getIndustryTile(parseInt(req.params.id));
      if (!tile) {
        return res.status(404).json({ message: "Industry tile not found" });
      }
      res.json(tile);
    } catch (error: any) {
      console.error("Error fetching industry tile:", error);
      res.status(500).json({ message: "Failed to fetch industry tile" });
    }
  });

  app.post("/api/admin/industry-tiles", isAdmin, async (req, res) => {
    try {
      if (req.body?.imageUrl) {
        const check = await validateAerialImageReference(req.body.imageUrl);
        if (!check.compliant) {
          return res.status(400).json({
            error: AERIAL_REJECTION_MESSAGE,
            message: AERIAL_REJECTION_MESSAGE,
            reason: check.reason,
          });
        }
      }
      const tile = await storage.createIndustryTile(req.body);
      res.status(201).json(tile);
    } catch (error: any) {
      console.error("Error creating industry tile:", error);
      res.status(500).json({ message: "Failed to create industry tile" });
    }
  });

  app.put("/api/admin/industry-tiles/:id", isAdmin, async (req, res) => {
    try {
      if (req.body?.imageUrl) {
        const check = await validateAerialImageReference(req.body.imageUrl);
        if (!check.compliant) {
          return res.status(400).json({
            error: AERIAL_REJECTION_MESSAGE,
            message: AERIAL_REJECTION_MESSAGE,
            reason: check.reason,
          });
        }
      }
      const tile = await storage.updateIndustryTile(parseInt(req.params.id), req.body);
      if (!tile) {
        return res.status(404).json({ message: "Industry tile not found" });
      }
      res.json(tile);
    } catch (error: any) {
      console.error("Error updating industry tile:", error);
      res.status(500).json({ message: "Failed to update industry tile" });
    }
  });

  app.delete("/api/admin/industry-tiles/:id", isAdmin, async (req, res) => {
    try {
      const success = await storage.deleteIndustryTile(parseInt(req.params.id));
      if (!success) {
        return res.status(404).json({ message: "Industry tile not found" });
      }
      res.json({ message: "Industry tile deleted successfully" });
    } catch (error: any) {
      console.error("Error deleting industry tile:", error);
      res.status(500).json({ message: "Failed to delete industry tile" });
    }
  });

  // Tile service associations
  app.get("/api/admin/industry-tiles/:id/services", isAdmin, async (req, res) => {
    try {
      const tileServices = await storage.getIndustryTileServices(parseInt(req.params.id));
      res.json(tileServices);
    } catch (error: any) {
      console.error("Error fetching tile services:", error);
      res.status(500).json({ message: "Failed to fetch tile services" });
    }
  });

  app.post("/api/admin/industry-tiles/:id/services", isAdmin, async (req, res) => {
    try {
      const { serviceId, displayOrder } = req.body;
      const tileService = await storage.addServiceToTile(
        parseInt(req.params.id), 
        serviceId, 
        displayOrder
      );
      res.status(201).json(tileService);
    } catch (error: any) {
      console.error("Error adding service to tile:", error);
      res.status(500).json({ message: "Failed to add service to tile" });
    }
  });

  app.delete("/api/admin/industry-tiles/:id/services/:serviceId", isAdmin, async (req, res) => {
    try {
      const success = await storage.removeServiceFromTile(
        parseInt(req.params.id),
        parseInt(req.params.serviceId)
      );
      if (!success) {
        return res.status(404).json({ message: "Service association not found" });
      }
      res.json({ message: "Service removed from tile successfully" });
    } catch (error: any) {
      console.error("Error removing service from tile:", error);
      res.status(500).json({ message: "Failed to remove service from tile" });
    }
  });

  app.put("/api/admin/industry-tiles/:id/services/:serviceId", isAdmin, async (req, res) => {
    try {
      const { displayOrder } = req.body;
      const tileService = await storage.updateTileServiceOrder(
        parseInt(req.params.id),
        parseInt(req.params.serviceId),
        displayOrder
      );
      if (!tileService) {
        return res.status(404).json({ message: "Service association not found" });
      }
      res.json(tileService);
    } catch (error: any) {
      console.error("Error updating tile service order:", error);
      res.status(500).json({ message: "Failed to update service order" });
    }
  });

  // Hero carousel slides — public read endpoint used by the homepage hero
  app.get("/api/hero-slides", async (req, res) => {
    try {
      const slides = await storage.getHeroSlides(false);
      res.json(slides);
    } catch (error: any) {
      console.error("Error fetching hero slides:", error);
      res.status(500).json({ message: "Failed to fetch hero slides" });
    }
  });

  // Admin-only management endpoints for hero carousel slides
  app.get("/api/admin/hero-slides", isAdmin, async (req, res) => {
    try {
      const slides = await storage.getHeroSlides(true);
      res.json(slides);
    } catch (error: any) {
      console.error("Error fetching all hero slides:", error);
      res.status(500).json({ message: "Failed to fetch hero slides" });
    }
  });

  app.post("/api/admin/hero-slides", isAdmin, async (req, res) => {
    try {
      const { insertHeroSlideSchema } = await import("@shared/schema");
      const parsed = insertHeroSlideSchema.parse(req.body);
      if (parsed.type === "image" || (typeof parsed.url === "string" && parsed.url.startsWith("data:image/"))) {
        const check = await validateAerialImageReference(parsed.url);
        if (!check.compliant) {
          return res.status(400).json({
            error: AERIAL_REJECTION_MESSAGE,
            message: AERIAL_REJECTION_MESSAGE,
            reason: check.reason,
          });
        }
      }
      const slide = await storage.createHeroSlide(parsed);
      res.status(201).json(slide);
    } catch (error: any) {
      if (error?.name === "ZodError") {
        return res.status(400).json({ message: "Invalid hero slide data", errors: error.errors });
      }
      console.error("Error creating hero slide:", error);
      res.status(500).json({ message: "Failed to create hero slide" });
    }
  });

  // Batch reorder: accepts an ordered list of slide ids and assigns sequential displayOrder values
  app.patch("/api/admin/hero-slides/reorder", isAdmin, async (req, res) => {
    try {
      const { ids } = req.body ?? {};
      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ message: "ids must be a non-empty array" });
      }
      const numericIds: number[] = [];
      const seen = new Set<number>();
      for (const raw of ids) {
        const id = Number(raw);
        if (!Number.isInteger(id) || id <= 0) {
          return res.status(400).json({ message: "ids must contain positive integers" });
        }
        if (seen.has(id)) {
          return res.status(400).json({ message: "ids must be unique" });
        }
        seen.add(id);
        numericIds.push(id);
      }
      const updated: Awaited<ReturnType<typeof storage.updateHeroSlide>>[] = [];
      for (let i = 0; i < numericIds.length; i++) {
        const slide = await storage.updateHeroSlide(numericIds[i], { displayOrder: i + 1 });
        if (!slide) {
          return res.status(404).json({ message: `Hero slide ${numericIds[i]} not found` });
        }
        updated.push(slide);
      }
      res.json(updated);
    } catch (error: any) {
      console.error("Error reordering hero slides:", error);
      res.status(500).json({ message: "Failed to reorder hero slides" });
    }
  });

  app.patch("/api/admin/hero-slides/:id", isAdmin, async (req, res) => {
    try {
      if (!/^\d+$/.test(req.params.id)) {
        return res.status(400).json({ message: "Invalid hero slide id" });
      }
      const id = Number(req.params.id);
      if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ message: "Invalid hero slide id" });
      }
      const { insertHeroSlideSchema } = await import("@shared/schema");
      const parsed = insertHeroSlideSchema.partial().parse(req.body);
      if (typeof parsed.url === "string" && parsed.url.length > 0) {
        const existing = parsed.type ? null : await storage.getHeroSlide(id);
        const effectiveType = parsed.type ?? existing?.type;
        const looksLikeImage =
          effectiveType === "image" || parsed.url.startsWith("data:image/");
        if (looksLikeImage) {
          const check = await validateAerialImageReference(parsed.url);
          if (!check.compliant) {
            return res.status(400).json({
              error: AERIAL_REJECTION_MESSAGE,
              message: AERIAL_REJECTION_MESSAGE,
              reason: check.reason,
            });
          }
        }
      }
      const slide = await storage.updateHeroSlide(id, parsed);
      if (!slide) {
        return res.status(404).json({ message: "Hero slide not found" });
      }
      res.json(slide);
    } catch (error: any) {
      if (error?.name === "ZodError") {
        return res.status(400).json({ message: "Invalid hero slide data", errors: error.errors });
      }
      console.error("Error updating hero slide:", error);
      res.status(500).json({ message: "Failed to update hero slide" });
    }
  });

  app.delete("/api/admin/hero-slides/:id", isAdmin, async (req, res) => {
    try {
      if (!/^\d+$/.test(req.params.id)) {
        return res.status(400).json({ message: "Invalid hero slide id" });
      }
      const id = Number(req.params.id);
      if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ message: "Invalid hero slide id" });
      }
      const success = await storage.deleteHeroSlide(id);
      if (!success) {
        return res.status(404).json({ message: "Hero slide not found" });
      }
      res.json({ message: "Hero slide deleted successfully" });
    } catch (error: any) {
      console.error("Error deleting hero slide:", error);
      res.status(500).json({ message: "Failed to delete hero slide" });
    }
  });

  // Admin Client Portal: Generate and download a ZIP of empty folder structure
  // Body: { projectName: string, clientName?: string, serviceIds: string[] }
  app.post("/api/admin/client-portal/download-zip", isAdmin, async (req, res) => {
    try {
      const projectName: unknown = req.body.projectName;
      const clientName: unknown = req.body.clientName;
      const serviceIds: unknown = req.body.serviceIds;

      if (typeof projectName !== "string" || projectName.trim() === "") {
        return res.status(400).json({ message: "projectName is required" });
      }
      if (!Array.isArray(serviceIds) || serviceIds.length === 0) {
        return res.status(400).json({ message: "serviceIds is required" });
      }

      const idSet = new Set(serviceIds.map((id) => String(id)));
      const allServices = await storage.getServices();
      const selectedServices = allServices.filter(s => idSet.has(String(s.id)));

      if (selectedServices.length === 0) {
        return res.status(400).json({ message: "No matching services found" });
      }

      const JSZip = (await import("jszip")).default;
      const zip = new JSZip();

      // Sanitize only OS/ZIP-illegal chars; preserve meaningful chars like & . ( )
      const sanitizeName = (s: string) =>
        String(s).replace(/[/\\<>:"*?|]/g, "_").replace(/\.\./g, "_").trim();

      const safeProject = sanitizeName(projectName).replace(/\s+/g, "_") || "Project";
      const root = zip.folder(safeProject)!;

      const serviceLines: string[] = [];
      for (const svc of selectedServices) {
        const safeService = sanitizeName(svc.name).replace(/\s+/g, "_") || "Service";
        const folders: string[] = Array.isArray(svc.folderStructure) ? (svc.folderStructure as string[]) : [];
        const svcFolder = root.folder(safeService)!;

        const phaseGuide = [
          `# ${svc.name}`,
          `Category: ${svc.category ?? "Uncategorized"}`,
          "",
          "## Delivery Folders",
          ...folders.map(f => `- ${f}`),
          "",
          "## Instructions",
          "Place the appropriate deliverables in each folder, then compress and send to the client.",
        ].join("\n");
        svcFolder.file("README.md", phaseGuide);

        for (const folder of folders) {
          // Support nested paths: "01_Raw/Stills" → two directory levels
          const parts = folder.split("/").map(p => sanitizeName(p)).filter(p => p.length > 0);
          let current = svcFolder;
          for (let i = 0; i < parts.length; i++) {
            current = current.folder(parts[i])!;
          }
          current.file(".gitkeep", "");
        }

        serviceLines.push(`### ${svc.name} (${svc.category ?? "Uncategorized"})`);
        folders.forEach(f => serviceLines.push(`  - ${f}`));
        serviceLines.push("");
      }

      const rootReadme = [
        `# ${projectName}`,
        `Client: ${clientName ?? "N/A"}`,
        `Created: ${new Date().toISOString().split("T")[0]}`,
        "",
        "## Services Included",
        ...serviceLines,
        "---",
        "Generated by Apollo DroneWorks Client Portal",
      ].join("\n");
      root.file("README.md", rootReadme);

      const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });

      res.set({
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${safeProject}.zip"`,
        "Content-Length": zipBuffer.length,
      });

      res.send(zipBuffer);
    } catch (error: any) {
      console.error("Error generating ZIP:", error);
      res.status(500).json({ message: "Failed to generate ZIP" });
    }
  });

  // ── SITEMAP ────────────────────────────────────────────────────────────────
  app.get("/sitemap.xml", async (_req, res) => {
    const BASE = process.env.SITE_URL || "https://apollodroneworks.com";
    const now = new Date().toISOString().split("T")[0];

    const staticUrls = [
      { loc: "/",             priority: "1.0", changefreq: "weekly"  },
      { loc: "/services",     priority: "0.9", changefreq: "weekly"  },
      { loc: "/blog",         priority: "0.8", changefreq: "daily"   },
      { loc: "/gallery",      priority: "0.7", changefreq: "monthly" },
      { loc: "/about",        priority: "0.6", changefreq: "monthly" },
      { loc: "/contact",      priority: "0.8", changefreq: "monthly" },
      { loc: "/testimonials", priority: "0.6", changefreq: "monthly" },
    ];

    let dynamicEntries = "";

    try {
      const [services, posts] = await Promise.all([
        storage.getServices(),
        storage.getBlogPosts(),
      ]);

      for (const svc of services) {
        dynamicEntries += `  <url><loc>${BASE}/services/${svc.id}</loc><changefreq>monthly</changefreq><priority>0.8</priority><lastmod>${now}</lastmod></url>\n`;
      }
      for (const post of posts) {
        const date = post.createdAt ? new Date(post.createdAt).toISOString().split("T")[0] : now;
        dynamicEntries += `  <url><loc>${BASE}/blog/${post.id}</loc><changefreq>monthly</changefreq><priority>0.7</priority><lastmod>${date}</lastmod></url>\n`;
      }
    } catch {
      // Fall through with static-only sitemap if DB is unavailable
    }

    const staticEntries = staticUrls
      .map(u => `  <url><loc>${BASE}${u.loc}</loc><changefreq>${u.changefreq}</changefreq><priority>${u.priority}</priority><lastmod>${now}</lastmod></url>`)
      .join("\n");

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${staticEntries}
${dynamicEntries}</urlset>`;

    res.setHeader("Content-Type", "application/xml");
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.send(xml);
  });

  // ── Partner account toggle ────────────────────────────────────────────────
  app.patch("/api/admin/users/:userId/partner-account", isAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const { isPartnerAccount } = req.body;
      if (typeof isPartnerAccount !== "boolean") {
        return res.status(400).json({ message: "isPartnerAccount must be a boolean" });
      }
      const [updated] = await db
        .update(users)
        .set({ isPartnerAccount })
        .where(eq(users.id, userId))
        .returning({ id: users.id, isPartnerAccount: users.isPartnerAccount });
      if (!updated) return res.status(404).json({ message: "User not found" });
      res.json(updated);
    } catch (err) {
      console.error("Error updating partner account status:", err);
      res.status(500).json({ message: "Failed to update partner account status" });
    }
  });

  app.get("/api/admin/users/:userId/partner-account", isAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const [user] = await db
        .select({ id: users.id, email: users.email, isPartnerAccount: users.isPartnerAccount })
        .from(users)
        .where(eq(users.id, userId));
      if (!user) return res.status(404).json({ message: "User not found" });
      res.json(user);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  return httpServer;
}
