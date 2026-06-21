import 'dotenv/config';
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { pool } from "./db";
import { initializeDatabase } from "./init-db";
import { migrateFinancialAnalytics } from "./migrate-financial-analytics";
import { populateAnalyticsData } from "./populate-analytics-data";
import { synchronizeFinancialWithAnalytics, synchronizePayrollWithAnalytics } from "./analytics-routes";
import { createSocialAdTables } from "./migrate-social-ad-tables";
import { seedAdCampaigns } from "./seed-ad-campaigns";
import { migrateCRM } from "./migrate-crm-tables";
import { migrateKeywords } from "./migrate-keywords";
import { migrateAboutPageContent } from "./migrate-about-page";
import { addServiceAddonFields } from "./migrations/add-service-addon-fields";
import addServiceSubscriptionFields from "./migrations/add-service-subscription-fields";
import { migrateTiers } from "./migrations/add-subscription-tiers";
import { main as migrateProcessSteps } from "./migrations/add-process-steps";
import { main as migrateFeaturedBadge } from "./migrations/add-featured-badge";
import { main as migrateClientProjects } from "./migrations/add-client-projects";
import { runProjectWorkflowMigration } from "./migrations/add-project-workflow";
import { runBusinessAssetsMigration } from "./migrations/add-business-assets";
import { addSocialPostFields } from "./migrations/add-social-post-fields";
import { addServiceDeliverables } from "./migrations/add-service-deliverables";
import { addTaskNotesFields } from "./migrations/add-task-notes-fields";
import { addHeroSlides } from "./migrations/add-hero-slides";
import { seedHeroSlides } from "./migrations/seed-hero-slides";
import { fixAddonPricesToCents } from "./migrations/fix-addon-prices-to-cents";
import { migrateLegacyPricingTiersToJsonb } from "./migrations/migrate-legacy-pricing-tiers-to-jsonb";
import { alignServiceFkRules } from "./migrations/align-service-fk-rules";
import { fixAnalyticsReportsSchema } from "./migrations/fix-analytics-reports-schema";
import { fixIndustryTileCategories } from "./migrations/fix-industry-tile-categories";
import { seedIndustryTiles } from "./migrations/seed-industry-tiles";
import { startBlogCron } from "./cron/blog-cron";
import { backfillBookingIncome, seedDemoExpenses } from "./booking-finance-sync";
import { addPricingSettings } from "./migrations/add-pricing-settings";
import { fixServiceAddonsFk } from "./migrations/fix-service-addons-fk";
import { addSocialLinks } from "./migrations/add-social-links";
import { addRoughInCredit } from "./migrations/add-rough-in-credit";
import { addF2fDiscounts } from "./migrations/add-f2f-discounts";

const app = express();
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: false, limit: '100mb' }));

// Serve virtual tour files
app.use('/tours', express.static('public/tours'));

// Serve uploaded files. If the requested file does not exist, return a real
// 404 instead of falling through to Vite's SPA index.html — otherwise the
// browser tries to render the app's HTML as a PDF/image and shows a misleading
// "Failed to load" error.
app.use('/uploads', express.static('public/uploads'));
app.use('/uploads/project-files', express.static('uploads/project-files'));
app.use('/uploads', (_req, res) => {
  res.status(404).send('File not found');
});

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Fix schema issues before any ORM queries run
  try {
    await addPricingSettings();
  } catch (err) {
    console.error("Error in add-pricing-settings pre-init migration:", err);
  }
  try {
    await fixServiceAddonsFk();
  } catch (err) {
    console.error("Error in fix-service-addons-fk migration:", err);
  }
  try {
    await addSocialLinks();
  } catch (err) {
    console.error("Error in add-social-links migration:", err);
  }
  try {
    await addRoughInCredit();
  } catch (err) {
    console.error("Error in add-rough-in-credit migration:", err);
  }
  try {
    await addF2fDiscounts();
  } catch (err) {
    console.error("Error in add-f2f-discounts migration:", err);
  }

  // Initialize the database
  await initializeDatabase();
  
  // Create financial and analytics tables
  try {
    await migrateFinancialAnalytics();
    console.log("Financial and analytics systems initialized successfully");

    // Reconcile analytics_reports schema for existing deployments that were
    // created before configuration/is_default/etc. columns were added.
    await fixAnalyticsReportsSchema();

    // Seed the three canonical homepage industry tiles on first run so a fresh
    // deploy always has the correct categories without manual SQL intervention.
    try {
      await seedIndustryTiles();
    } catch (tilesSeedErr) {
      console.error("Error seeding industry tiles:", tilesSeedErr);
    }

    // Ensure homepage industry tile categories match canonical service category names.
    await fixIndustryTileCategories();
    
    // Populate analytics data based on financial data
    const analyticsResult = await populateAnalyticsData();
    if (analyticsResult !== 'skipped_no_admin') {
      console.log("Analytics data populated successfully");
    }
    
    // Seed realistic demo expenses (no-op once any expenses exist)
    try {
      await seedDemoExpenses();
    } catch (seedErr) {
      console.error("Error seeding demo expenses:", seedErr);
    }

    // Backfill income for any already-completed bookings (idempotent)
    try {
      await backfillBookingIncome();
    } catch (backfillErr) {
      console.error("Error backfilling booking income:", backfillErr);
    }

    // Synchronize financial data with analytics
    await synchronizeFinancialWithAnalytics();
    
    // Synchronize payroll data with analytics
    await synchronizePayrollWithAnalytics();
    console.log("Financial and payroll data synchronized with analytics system");
    
    // Create social ad tables and seed campaign data
    try {
      // First create the tables
      await createSocialAdTables();
      console.log("Social media ad tables created successfully");
      
      // Then seed the ad campaigns
      const adResult = await seedAdCampaigns();
      if (adResult?.status !== 'skipped_no_admin') {
        console.log("Ad campaigns seeded successfully");
      }
    } catch (error) {
      console.error("Error with social media ad setup:", error);
    }
    
    // Create CRM tables and seed data
    try {
      await migrateCRM();
      console.log("CRM migration completed successfully");
    } catch (error) {
      console.error("Error with CRM migration:", error);
    }
    
    // Add keywords field to media tables for SEO
    try {
      await migrateKeywords();
      console.log("Keywords migration completed successfully");
    } catch (error) {
      console.error("Error with keywords migration:", error);
    }
    
    // Create about page content table and seed data
    try {
      await migrateAboutPageContent();
      console.log("About page content migration completed successfully");
    } catch (error) {
      console.error("Error with about page content migration:", error);
    }
    
    // Add service add-on fields migration
    try {
      await addServiceAddonFields(pool);
      console.log("Service add-on fields migration completed successfully");
    } catch (error) {
      console.error("Error with service add-on fields migration:", error);
    }
    
    // Add service subscription fields migration
    try {
      await addServiceSubscriptionFields();
      console.log("Service subscription fields migration completed successfully");
    } catch (error) {
      console.error("Error with service subscription fields migration:", error);
    }
    
    // Add subscription tiers migration
    try {
      await migrateTiers();
      console.log("Subscription tiers migration completed successfully");
    } catch (error) {
      console.error("Error with subscription tiers migration:", error);
    }
    
    // Add process steps migration
    try {
      await migrateProcessSteps();
      console.log("Process steps migration completed successfully");
    } catch (error) {
      console.error("Error with process steps migration:", error);
    }

    // Add featured badge migration
    try {
      await migrateFeaturedBadge();
      console.log("Featured badge migration completed successfully");
    } catch (error) {
      console.error("Error with featured badge migration:", error);
    }
    
    // Add client projects migration
    try {
      await migrateClientProjects();
      console.log("Client projects migration completed successfully");
    } catch (error) {
      console.error("Error with client projects migration:", error);
    }

    // Project workflow tables (deliverables, files, drone type, due dates)
    try {
      await runProjectWorkflowMigration();
    } catch (error) {
      console.error("Error with project workflow migration:", error);
    }

    // Business asset registry (drones, vehicles, equipment with depreciation)
    try {
      await runBusinessAssetsMigration();
    } catch (error) {
      console.error("Error with business assets migration:", error);
    }

    // Service-level deliverable templates
    try {
      await addServiceDeliverables();
    } catch (error) {
      console.error("Error with service deliverables migration:", error);
    }

    // Social post blog link + platform fields
    try {
      await addSocialPostFields();
    } catch (error) {
      console.error("Error with social post fields migration:", error);
    }
    
    // Add task notes fields
    try {
      await addTaskNotesFields();
      console.log("Task notes fields migration completed successfully");
    } catch (error) {
      console.error("Error with task notes fields migration:", error);
    }

    // Create hero_slides table for the database-backed homepage hero carousel
    try {
      await addHeroSlides();
      await seedHeroSlides();
    } catch (error) {
      console.error("Error with hero slides migration:", error);
    }

    // Fix add-on prices: convert from dollars to cents (idempotent)
    try {
      await fixAddonPricesToCents();
      console.log("Add-on price cents migration completed successfully");
    } catch (error) {
      console.error("Error with add-on price cents migration:", error);
    }

    // Task #159: copy legacy pricing_tiers table into services.pricing_tiers
    // JSONB (dollars → cents), flip pricingType to 'tiered', drop the legacy
    // table. Idempotent via schema_migrations.
    try {
      await migrateLegacyPricingTiersToJsonb();
      console.log("Legacy pricing tiers JSONB migration completed successfully");
    } catch (error) {
      console.error("Error with legacy pricing tiers JSONB migration:", error);
    }

    // Task #158: align FK ON DELETE rules with shared/schema.ts (idempotent)
    try {
      await alignServiceFkRules();
    } catch (error) {
      console.error("Error with service FK alignment migration:", error);
    }

  } catch (error) {
    console.error("Error initializing financial and analytics systems:", error);
  }
  
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = process.env.PORT ? parseInt(process.env.PORT) : 3000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
    try {
      startBlogCron();
    } catch (err) {
      console.error("Failed to start blog cron:", err);
    }
  });
})();
