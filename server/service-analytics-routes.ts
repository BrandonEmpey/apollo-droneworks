import { Express } from "express";
import { storage } from "./storage";

export function registerServiceAnalyticsRoutes(app: Express) {
  // Get service performance metrics
  app.get("/api/service-analytics/metrics", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    try {
      // Get all services with their booking data
      const services = await storage.getAllServices();
      const bookings = await storage.getAllBookings();
      
      const serviceMetrics = services.map(service => {
        const serviceBookings = bookings.filter(b => 
          b.serviceId === service.id || 
          (b.selectedServices && b.selectedServices.includes(service.id))
        );
        
        const totalRevenue = serviceBookings.reduce((sum, booking) => {
          // Calculate proportional revenue if multiple services
          const serviceCount = booking.selectedServices?.length || 1;
          return sum + (booking.totalPrice / serviceCount);
        }, 0);

        const bundleCount = serviceBookings.filter(b => 
          b.selectedServices && b.selectedServices.length > 1
        ).length;

        return {
          serviceId: service.id,
          serviceName: service.name,
          totalRevenue,
          bookingCount: serviceBookings.length,
          avgRating: 4.8, // Would come from reviews/ratings system
          bundleFrequency: serviceBookings.length > 0 ? bundleCount / serviceBookings.length : 0,
          seasonalTrend: "up" as const,
          popularRegions: ["Downtown", "Suburbs", "Industrial"],
          conversionRate: 0.72,
          clientRetention: 0.84
        };
      });

      res.json(serviceMetrics);
    } catch (error) {
      console.error("Error fetching service analytics:", error);
      res.status(500).json({ error: "Failed to fetch service analytics" });
    }
  });

  // Get bundle impact analysis
  app.get("/api/service-analytics/bundle-impact", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    try {
      const bookings = await storage.getAllBookings();
      const services = await storage.getAllServices();
      
      // Filter bookings with multiple services (bundles)
      const bundleBookings = bookings.filter(b => 
        b.selectedServices && b.selectedServices.length > 1
      );

      const bundleImpacts = services.map(service => {
        const primaryBookings = bundleBookings.filter(b => 
          b.serviceId === service.id
        );

        if (primaryBookings.length === 0) return null;

        const bundledServices = [...new Set(
          primaryBookings.flatMap(b => b.selectedServices?.filter(id => id !== service.id) || [])
        )];

        const totalValue = primaryBookings.reduce((sum, b) => sum + b.totalPrice, 0);
        const estimatedDiscount = totalValue * 0.15; // Estimated 15% bundle discount

        return {
          primaryService: service.name,
          bundledServices: bundledServices.map(id => 
            services.find(s => s.id === id)?.name || "Unknown"
          ),
          totalValue,
          discountApplied: estimatedDiscount,
          frequency: primaryBookings.length
        };
      }).filter(Boolean);

      res.json(bundleImpacts);
    } catch (error) {
      console.error("Error fetching bundle impact:", error);
      res.status(500).json({ error: "Failed to fetch bundle impact data" });
    }
  });

  // Get client journey data
  app.get("/api/service-analytics/client-journey", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    try {
      // Mock client journey data - in a real implementation, this would track user behavior
      const clientJourney = [
        { 
          step: "Initial Interest", 
          serviceType: "Real Estate Photography", 
          conversionRate: 0.45, 
          dropoffRate: 0.55, 
          avgTimeBetween: 0 
        },
        { 
          step: "Service Booking", 
          serviceType: "Real Estate Photography", 
          conversionRate: 0.72, 
          dropoffRate: 0.28, 
          avgTimeBetween: 3.2 
        },
        { 
          step: "Add-on Consideration", 
          serviceType: "Bundle Options", 
          conversionRate: 0.38, 
          dropoffRate: 0.62, 
          avgTimeBetween: 1.1 
        },
        { 
          step: "Repeat Customer", 
          serviceType: "Various Services", 
          conversionRate: 0.84, 
          dropoffRate: 0.16, 
          avgTimeBetween: 45.3 
        }
      ];

      res.json(clientJourney);
    } catch (error) {
      console.error("Error fetching client journey:", error);
      res.status(500).json({ error: "Failed to fetch client journey data" });
    }
  });
}