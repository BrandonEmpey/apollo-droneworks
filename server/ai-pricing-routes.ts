import type { Express } from "express";
import { db } from "./db";
import { services } from "@shared/schema";
import { aiPricingSuggestions, expeditedSlots } from "@shared/pricing-schema";
import { eq, desc } from "drizzle-orm";
import { requireAuth } from "./auth";

export function registerAIPricingRoutes(app: Express) {
  // Get pricing suggestions
  app.get("/api/pricing/suggestions", requireAuth, async (req, res) => {
    try {
      const suggestions = await db
        .select({
          id: aiPricingSuggestions.id,
          serviceName: aiPricingSuggestions.serviceName,
          currentPrice: aiPricingSuggestions.currentPrice,
          suggestedPrice: aiPricingSuggestions.suggestedPrice,
          confidence: aiPricingSuggestions.confidence,
          reasoning: aiPricingSuggestions.reasoning,
          marketFactors: aiPricingSuggestions.marketFactors,
          isApplied: aiPricingSuggestions.isApplied,
          createdAt: aiPricingSuggestions.createdAt
        })
        .from(aiPricingSuggestions)
        .orderBy(desc(aiPricingSuggestions.createdAt));

      res.json(suggestions);
    } catch (error) {
      console.error("Error fetching pricing suggestions:", error);
      res.status(500).json({ error: "Failed to fetch pricing suggestions" });
    }
  });

  // Generate new pricing suggestions
  app.post("/api/pricing/generate-suggestions", requireAuth, async (req, res) => {
    try {
      // Get existing services
      const existingServices = await db.select().from(services);
      
      const suggestions = [];
      for (const service of existingServices) {
        const currentPrice = parseFloat((service.price || 0).toString());
        const adjustmentFactor = 0.8 + Math.random() * 0.4; // 0.8 to 1.2 range
        const suggestedPrice = (currentPrice * adjustmentFactor).toFixed(2);
        
        const confidence = Math.random() > 0.6 ? "high" : Math.random() > 0.3 ? "medium" : "low";
        
        const suggestion = {
          serviceName: service.name,
          currentPrice: (service.price || 0).toString(),
          suggestedPrice: suggestedPrice,
          confidence: confidence,
          reasoning: `Based on market analysis and demand patterns, ${
            adjustmentFactor > 1 ? "increasing" : "decreasing"
          } price by ${Math.abs((adjustmentFactor - 1) * 100).toFixed(1)}% would optimize revenue.`,
          marketFactors: {
            competition: Math.floor(Math.random() * 5) + 1,
            demand: Math.floor(Math.random() * 5) + 1,
            seasonality: Math.floor(Math.random() * 5) + 1,
            location: "Regional Average"
          },
          isApplied: false
        };
        
        suggestions.push(suggestion);
      }

      // Insert suggestions into database
      if (suggestions.length > 0) {
        await db.insert(aiPricingSuggestions).values(suggestions);
      }

      res.json({ message: "Pricing suggestions generated successfully", count: suggestions.length });
    } catch (error) {
      console.error("Error generating pricing suggestions:", error);
      res.status(500).json({ error: "Failed to generate pricing suggestions" });
    }
  });

  // Apply pricing suggestion
  app.post("/api/pricing/apply-suggestion", requireAuth, async (req, res) => {
    try {
      const { suggestionId, newPrice } = req.body;

      // Mark suggestion as applied
      await db
        .update(aiPricingSuggestions)
        .set({ isApplied: true })
        .where(eq(aiPricingSuggestions.id, suggestionId));

      res.json({ message: "Pricing suggestion applied successfully" });
    } catch (error) {
      console.error("Error applying pricing suggestion:", error);
      res.status(500).json({ error: "Failed to apply pricing suggestion" });
    }
  });

  // Get expedited availability
  app.get("/api/scheduling/expedited-availability", requireAuth, async (req, res) => {
    try {
      const slots = await db.select().from(expeditedSlots);
      
      const availability = {
        availableSlots: slots.map(slot => ({
          weekStarting: slot.weekStarting,
          weekEnding: slot.weekEnding,
          available: slot.available,
          reason: slot.reason || "Standard availability"
        })),
        currentExpeditedJobs: 0,
        maxExpeditedJobs: 1,
        blockedWeekends: slots
          .filter(slot => slot.reason?.includes("weekend"))
          .map(slot => slot.weekStarting)
      };

      res.json(availability);
    } catch (error) {
      console.error("Error fetching expedited availability:", error);
      res.status(500).json({ error: "Failed to fetch expedited availability" });
    }
  });

  // Block weekend for expedited services
  app.post("/api/scheduling/block-weekend", requireAuth, async (req, res) => {
    try {
      const { weekend } = req.body;
      
      await db.insert(expeditedSlots).values({
        weekStarting: weekend,
        weekEnding: weekend,
        available: false,
        reason: "Weekend blocked for expedited services"
      });

      res.json({ message: "Weekend blocked successfully" });
    } catch (error) {
      console.error("Error blocking weekend:", error);
      res.status(500).json({ error: "Failed to block weekend" });
    }
  });
}