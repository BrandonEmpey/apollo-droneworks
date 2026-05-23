import { Express } from "express";
import { db } from "./db";
import { services } from "@shared/schema";
import { 
  aiPricingSuggestions, 
  subscriptionPlans, 
  expeditedSlots, 
  rushOrderPricing,
  pricingZones,
  bulkDiscounts
} from "@shared/pricing-schema";
import { eq, and, gte, lte, desc } from "drizzle-orm";
import { AIPricingEngine } from "./ai/pricing-engine";
import { requireAuth } from "./auth";

// Helper function to fetch competitor prices using web search
async function fetchCompetitorPrices(searchQuery: string, serviceName: string) {
  try {
    // Simulated competitor data for demo purposes
    // In production, this would call a real web search API
    const mockCompetitors = [
      { competitor: "SkyView Drones", location: "Washington, UT", price: Math.floor(Math.random() * 500) + 300 },
      { competitor: "Utah Aerial Services", location: "St. George, UT", price: Math.floor(Math.random() * 500) + 300 },
      { competitor: "Red Rock Drone Co", location: "Hurricane, UT", price: Math.floor(Math.random() * 500) + 300 },
      { competitor: "Desert Drones Pro", location: "Ivins, UT", price: Math.floor(Math.random() * 500) + 300 },
      { competitor: "Zion Aerial Media", location: "Springdale, UT", price: Math.floor(Math.random() * 500) + 300 },
      { competitor: "Southern Utah Imaging", location: "Cedar City, UT", price: Math.floor(Math.random() * 500) + 300 },
      { competitor: "Drone Masters Utah", location: "Santa Clara, UT", price: Math.floor(Math.random() * 500) + 300 },
      { competitor: "Sky High Productions", location: "Washington, UT", price: Math.floor(Math.random() * 500) + 300 },
      { competitor: "Aerial View Solutions", location: "St. George, UT", price: Math.floor(Math.random() * 500) + 300 },
      { competitor: "Pro Drone Services", location: "Hurricane, UT", price: Math.floor(Math.random() * 500) + 300 },
    ];
    
    // Return first 10 competitors
    return mockCompetitors.slice(0, 10).map(comp => ({
      ...comp,
      service: serviceName
    }));
  } catch (error) {
    console.error("Error fetching competitor prices:", error);
    return [];
  }
}

export function registerPricingRoutes(app: Express) {
  const pricingEngine = new AIPricingEngine();

  // AI Pricing Suggestions
  app.get("/api/pricing/suggestions", requireAuth, async (req, res) => {
    try {
      const serviceId = req.query.serviceId ? parseInt(req.query.serviceId as string) : undefined;
      const suggestions = await pricingEngine.getPricingSuggestions(serviceId);
      res.json(suggestions);
    } catch (error) {
      console.error("Error fetching pricing suggestions:", error);
      res.status(500).json({ message: "Failed to fetch pricing suggestions" });
    }
  });

  app.post("/api/pricing/generate-suggestions", requireAuth, async (req, res) => {
    try {
      const { serviceId } = req.body;
      const suggestions = await pricingEngine.generatePricingSuggestions(serviceId);
      res.json(suggestions);
    } catch (error) {
      console.error("Error generating pricing suggestions:", error);
      res.status(500).json({ message: "Failed to generate pricing suggestions" });
    }
  });

  app.post("/api/pricing/apply-suggestion/:id", requireAuth, async (req, res) => {
    try {
      const suggestionId = parseInt(req.params.id);
      const { newPrice } = req.body;

      // Get the suggestion
      const [suggestion] = await db.select()
        .from(aiPricingSuggestions)
        .where(eq(aiPricingSuggestions.id, suggestionId));

      if (!suggestion) {
        return res.status(404).json({ message: "Suggestion not found" });
      }

      // Update service price (user can modify the suggested price)
      await db.update(services)
        .set({ price: newPrice })
        .where(eq(services.id, suggestion.serviceId));

      // Mark suggestion as applied
      await pricingEngine.markSuggestionApplied(suggestionId);

      res.json({ message: "Pricing updated successfully" });
    } catch (error) {
      console.error("Error applying pricing suggestion:", error);
      res.status(500).json({ message: "Failed to apply pricing suggestion" });
    }
  });

  // Subscription Plans
  app.get("/api/pricing/subscription-plans", async (req, res) => {
    try {
      const plans = await db.select()
        .from(subscriptionPlans)
        .where(eq(subscriptionPlans.isActive, true))
        .orderBy(subscriptionPlans.displayOrder);
      res.json(plans);
    } catch (error) {
      console.error("Error fetching subscription plans:", error);
      res.status(500).json({ message: "Failed to fetch subscription plans" });
    }
  });

  app.post("/api/pricing/subscription-plans", requireAuth, async (req, res) => {
    try {
      const plan = await db.insert(subscriptionPlans).values(req.body).returning();
      res.json(plan[0]);
    } catch (error) {
      console.error("Error creating subscription plan:", error);
      res.status(500).json({ message: "Failed to create subscription plan" });
    }
  });

  app.put("/api/pricing/subscription-plans/:id", requireAuth, async (req, res) => {
    try {
      const planId = parseInt(req.params.id);
      const updatedPlan = await db.update(subscriptionPlans)
        .set({ ...req.body, updatedAt: new Date() })
        .where(eq(subscriptionPlans.id, planId))
        .returning();
      res.json(updatedPlan[0]);
    } catch (error) {
      console.error("Error updating subscription plan:", error);
      res.status(500).json({ message: "Failed to update subscription plan" });
    }
  });

  // Expedited Scheduling
  app.get("/api/pricing/expedited-slots", requireAuth, async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      let query = db.select().from(expeditedSlots);
      
      if (startDate && endDate) {
        query = query.where(
          and(
            gte(expeditedSlots.weekStartDate, startDate as string),
            lte(expeditedSlots.weekStartDate, endDate as string)
          )
        );
      }
      
      const slots = await query.orderBy(expeditedSlots.weekStartDate);
      res.json(slots);
    } catch (error) {
      console.error("Error fetching expedited slots:", error);
      res.status(500).json({ message: "Failed to fetch expedited slots" });
    }
  });

  app.post("/api/pricing/expedited-slots/block", requireAuth, async (req, res) => {
    try {
      const { weekStartDate, blockReason } = req.body;
      
      const slot = await db.insert(expeditedSlots).values({
        weekStartDate,
        isBlocked: true,
        blockReason,
        isBooked: false
      }).returning();
      
      res.json(slot[0]);
    } catch (error) {
      console.error("Error blocking expedited slot:", error);
      res.status(500).json({ message: "Failed to block expedited slot" });
    }
  });

  app.post("/api/pricing/expedited-slots/unblock", requireAuth, async (req, res) => {
    try {
      const { weekStartDate } = req.body;
      
      await db.update(expeditedSlots)
        .set({ isBlocked: false, blockReason: null })
        .where(eq(expeditedSlots.weekStartDate, weekStartDate));
      
      res.json({ message: "Slot unblocked successfully" });
    } catch (error) {
      console.error("Error unblocking expedited slot:", error);
      res.status(500).json({ message: "Failed to unblock expedited slot" });
    }
  });

  app.post("/api/pricing/expedited-slots/book", async (req, res) => {
    try {
      const { weekStartDate, projectId } = req.body;
      
      // Check if slot is available
      const [existingSlot] = await db.select()
        .from(expeditedSlots)
        .where(eq(expeditedSlots.weekStartDate, weekStartDate));
      
      if (existingSlot && (existingSlot.isBlocked || existingSlot.isBooked)) {
        return res.status(400).json({ 
          message: "Expedited slot not available for this week" 
        });
      }
      
      // Check if any other expedited slot is already booked
      const [bookedSlot] = await db.select()
        .from(expeditedSlots)
        .where(eq(expeditedSlots.isBooked, true));
      
      if (bookedSlot) {
        return res.status(400).json({ 
          message: "Only one expedited job can be scheduled at a time" 
        });
      }
      
      // Book the slot
      if (existingSlot) {
        await db.update(expeditedSlots)
          .set({ isBooked: true, projectId })
          .where(eq(expeditedSlots.weekStartDate, weekStartDate));
      } else {
        await db.insert(expeditedSlots).values({
          weekStartDate,
          isBooked: true,
          projectId,
          isBlocked: false
        });
      }
      
      res.json({ message: "Expedited slot booked successfully" });
    } catch (error) {
      console.error("Error booking expedited slot:", error);
      res.status(500).json({ message: "Failed to book expedited slot" });
    }
  });

  // Rush Order Pricing
  app.get("/api/pricing/rush-orders", requireAuth, async (req, res) => {
    try {
      const rushPricing = await db.select()
        .from(rushOrderPricing)
        .where(eq(rushOrderPricing.isActive, true));
      res.json(rushPricing);
    } catch (error) {
      console.error("Error fetching rush order pricing:", error);
      res.status(500).json({ message: "Failed to fetch rush order pricing" });
    }
  });

  app.put("/api/pricing/rush-orders/:serviceId", requireAuth, async (req, res) => {
    try {
      const serviceId = parseInt(req.params.serviceId);
      const { rushMultiplier, minimumRushFee } = req.body;
      
      const updatedPricing = await db.update(rushOrderPricing)
        .set({ rushMultiplier, minimumRushFee, updatedAt: new Date() })
        .where(eq(rushOrderPricing.serviceId, serviceId))
        .returning();
      
      res.json(updatedPricing[0]);
    } catch (error) {
      console.error("Error updating rush order pricing:", error);
      res.status(500).json({ message: "Failed to update rush order pricing" });
    }
  });

  // Geographic Pricing Zones
  app.get("/api/pricing/zones", async (req, res) => {
    try {
      const zones = await db.select()
        .from(pricingZones)
        .where(eq(pricingZones.isActive, true));
      res.json(zones);
    } catch (error) {
      console.error("Error fetching pricing zones:", error);
      res.status(500).json({ message: "Failed to fetch pricing zones" });
    }
  });

  app.post("/api/pricing/zones", requireAuth, async (req, res) => {
    try {
      const zone = await db.insert(pricingZones).values(req.body).returning();
      res.json(zone[0]);
    } catch (error) {
      console.error("Error creating pricing zone:", error);
      res.status(500).json({ message: "Failed to create pricing zone" });
    }
  });

  // Bulk Discounts
  app.get("/api/pricing/bulk-discounts", async (req, res) => {
    try {
      const discounts = await db.select()
        .from(bulkDiscounts)
        .where(eq(bulkDiscounts.isActive, true));
      res.json(discounts);
    } catch (error) {
      console.error("Error fetching bulk discounts:", error);
      res.status(500).json({ message: "Failed to fetch bulk discounts" });
    }
  });

  app.post("/api/pricing/bulk-discounts", requireAuth, async (req, res) => {
    try {
      const discount = await db.insert(bulkDiscounts).values(req.body).returning();
      res.json(discount[0]);
    } catch (error) {
      console.error("Error creating bulk discount:", error);
      res.status(500).json({ message: "Failed to create bulk discount" });
    }
  });

  // Import current prices for competitor analysis
  app.post("/api/pricing/import-current", requireAuth, async (req, res) => {
    try {
      const allServices = await db.select().from(services);
      res.json(allServices);
    } catch (error) {
      console.error("Error importing current prices:", error);
      res.status(500).json({ message: "Failed to import current prices" });
    }
  });

  // Competitor price analysis
  app.post("/api/pricing/competitor-analysis", requireAuth, async (req, res) => {
    try {
      const { zipCode, percentage = 95 } = req.body;
      
      // Get all services
      const allServices = await db.select().from(services);
      
      // For each service, fetch competitor prices using web search
      const analysisResults = [];
      
      for (const service of allServices) {
        try {
          // Use web search to find competitor pricing
          const searchQuery = `drone ${service.name.toLowerCase()} service price near ${zipCode}`;
          
          // Call web search endpoint (we'll implement this next)
          const competitorData = await fetchCompetitorPrices(searchQuery, service.name);
          
          // Calculate statistics
          const prices = competitorData.map((c: any) => c.price);
          const avgPrice = prices.length > 0 ? prices.reduce((a: number, b: number) => a + b, 0) / prices.length : 0;
          const lowPrice = prices.length > 0 ? Math.min(...prices) : 0;
          const highPrice = prices.length > 0 ? Math.max(...prices) : 0;
          
          // Calculate suggested price using custom percentage and round to nearest $10
          const currentPriceInDollars = parseFloat(service.price) / 100;
          let suggestedPrice = avgPrice > 0 ? avgPrice * (percentage / 100) : currentPriceInDollars;
          suggestedPrice = Math.round(suggestedPrice / 10) * 10;
          
          analysisResults.push({
            serviceId: service.id,
            serviceName: service.name,
            currentPrice: currentPriceInDollars,
            competitors: competitorData,
            avgPrice,
            lowPrice,
            highPrice,
            suggestedPrice
          });
        } catch (error) {
          console.error(`Error analyzing ${service.name}:`, error);
          // Add service with no competitor data
          const currentPriceInDollars = parseFloat(service.price) / 100;
          analysisResults.push({
            serviceId: service.id,
            serviceName: service.name,
            currentPrice: currentPriceInDollars,
            competitors: [],
            avgPrice: 0,
            lowPrice: 0,
            highPrice: 0,
            suggestedPrice: currentPriceInDollars
          });
        }
      }
      
      res.json(analysisResults);
    } catch (error) {
      console.error("Error performing competitor analysis:", error);
      res.status(500).json({ message: "Failed to perform competitor analysis" });
    }
  });

  // Calculate pricing for a quote
  app.post("/api/pricing/calculate", async (req, res) => {
    try {
      const { 
        serviceIds, 
        quantities, 
        location, 
        isRush, 
        zipCode 
      } = req.body;

      let totalPrice = 0;
      const breakdown = [];

      // Get services
      const servicesList = await db.select()
        .from(services)
        .where(eq(services.id, serviceIds[0])); // Simplified for now

      // Get pricing zone
      const zones = await db.select()
        .from(pricingZones)
        .where(eq(pricingZones.isActive, true));

      const applicableZone = zones.find(zone => 
        zone.zipCodes?.includes(zipCode) || 
        zone.cities?.includes(location)
      ) || zones[0]; // Default to first zone

      for (let i = 0; i < serviceIds.length; i++) {
        const serviceId = serviceIds[i];
        const quantity = quantities[i] || 1;
        
        const [service] = await db.select()
          .from(services)
          .where(eq(services.id, serviceId));

        if (!service) continue;

        let servicePrice = parseFloat(service.price) * quantity;
        
        // Apply zone multiplier
        if (applicableZone) {
          servicePrice *= parseFloat(applicableZone.basePriceMultiplier || "1.00");
        }

        // Apply bulk discounts
        const applicableDiscount = await db.select()
          .from(bulkDiscounts)
          .where(eq(bulkDiscounts.isActive, true));

        for (const discount of applicableDiscount) {
          if (quantity >= discount.minimumQuantity && 
              discount.applicableServices?.includes(serviceId)) {
            if (discount.discountType === 'percentage') {
              servicePrice *= (1 - parseFloat(discount.discountValue) / 100);
            } else {
              servicePrice -= parseFloat(discount.discountValue);
            }
            break; // Apply only the first applicable discount
          }
        }

        // Apply rush pricing
        if (isRush) {
          const [rushPricing] = await db.select()
            .from(rushOrderPricing)
            .where(eq(rushOrderPricing.serviceId, serviceId));

          if (rushPricing) {
            const rushFee = Math.max(
              servicePrice * (parseFloat(rushPricing.rushMultiplier) - 1),
              parseFloat(rushPricing.minimumRushFee)
            );
            servicePrice += rushFee;
          }
        }

        breakdown.push({
          serviceId,
          serviceName: service.name,
          quantity,
          basePrice: parseFloat(service.price),
          finalPrice: servicePrice,
          isRush
        });

        totalPrice += servicePrice;
      }

      // Add travel fees if applicable
      if (applicableZone && applicableZone.minimumTravelFee) {
        totalPrice += parseFloat(applicableZone.minimumTravelFee);
        breakdown.push({
          serviceId: null,
          serviceName: "Travel Fee",
          quantity: 1,
          basePrice: parseFloat(applicableZone.minimumTravelFee),
          finalPrice: parseFloat(applicableZone.minimumTravelFee),
          isRush: false
        });
      }

      res.json({
        totalPrice,
        breakdown,
        zone: applicableZone?.zoneName || "Standard",
        currency: "USD"
      });

    } catch (error) {
      console.error("Error calculating pricing:", error);
      res.status(500).json({ message: "Failed to calculate pricing" });
    }
  });
}