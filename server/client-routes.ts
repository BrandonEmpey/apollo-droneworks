import type { Express } from "express";
import { z } from "zod";
import { storage } from "./storage";

// Middleware to check if user is authenticated
const isAuthenticated = (req: any, res: any, next: any) => {
  if (req.isAuthenticated()) {
    return next();
  }
  return res.status(401).json({ message: "Unauthorized" });
};

// Middleware to check if user is admin
const isAdmin = (req: any, res: any, next: any) => {
  if (req.isAuthenticated() && req.user.isAdmin) {
    return next();
  }
  res.status(403).json({ message: "Forbidden" });
};

// Middleware to check client ownership
const checkClientOwnership = async (req: any, res: any, next: any) => {
  try {
    const clientId = parseInt(req.params.clientId);
    const client = await storage.getCustomer(clientId);
    
    if (!client) {
      return res.status(404).json({ message: "Client not found" });
    }
    
    // Admin can access any client
    if (req.user.isAdmin) {
      return next();
    }
    
    // Check if this client belongs to the current user
    // First check if user has a customer record, and create one if it doesn't exist
    const userCustomer = await storage.getCustomerByUserId(req.user.id, true); // true = create if not exists
    
    // Client can only access their own data
    if (userCustomer && userCustomer.id === client.id) {
      return next();
    } else if (req.user.id === client.id) {
      // Legacy check for backward compatibility
      return next();
    }
    
    return res.status(403).json({ message: "You don't have permission to access this client" });
  } catch (error) {
    console.error("Error checking client ownership:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

export function registerClientRoutes(app: Express) {
  // Client dashboard routes
  app.get("/api/client/projects", isAuthenticated, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      if (req.user.isAdmin) {
        // Admin gets all projects
        const projects = await storage.getAllClientProjects();
        return res.json(projects);
      } else {
        // Regular users only get their own projects
        // First determine if the user is a regular user or a customer
        const isCustomer = !!(req.user.role === 'client' || req.user.clientId);
        console.log("Attempting to find/create customer for user ID:", req.user.id, "isCustomer:", isCustomer);
        
        let customer;
        
        if (isCustomer) {
          console.log("User is a client - using direct customer ID:", req.user.id);
          // For client users, their ID is already a customer ID
          customer = await storage.getCustomerById(req.user.id);
          if (!customer) {
            console.log("No customer found with direct ID, trying legacy lookup");
            customer = await storage.getCustomerByUserId(req.user.id, true);
          }
        } else {
          // Regular user flow - use the getCustomerByUserId method
          console.log("Regular user - looking up associated customer for user ID:", req.user.id);
          customer = await storage.getCustomerByUserId(req.user.id, true); // create if not exists
        }
        
        console.log("User ID:", req.user.id, "Found/created customer:", customer ? `ID: ${customer.id}, Name: ${customer.firstName} ${customer.lastName}` : "none");
        
        let projects = [];
        // If customer record exists (which it should now), use that ID to get projects
        if (customer) {
          console.log("Fetching projects for customer ID:", customer.id);
          projects = await storage.getClientProjectsByClientId(customer.id);
        } else {
          // Fallback to direct user ID only if customer creation failed
          console.log("Failed to create customer record, falling back to user ID:", req.user.id);
          projects = await storage.getClientProjectsByClientId(req.user.id);
        }
        
        return res.json(projects);
      }
    } catch (error) {
      console.error("Error fetching client projects:", error);
      res.status(500).json({ message: "Error loading projects" });
    }
  });
  
  // Client dashboard bookings route
  app.get("/api/client/bookings", isAuthenticated, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      console.log(`User ID in client bookings route: ${req.user.id}, isAdmin: ${req.user.isAdmin}`);
      
      // Get services to enrich booking data
      const allServices = await storage.getServices();
      
      // Get bookings based on user role
      let rawBookings;
      if (req.user.isAdmin) {
        // Admin gets all bookings
        rawBookings = await storage.getBookings();
        console.log(`Admin user - fetched ${rawBookings.length} bookings`);
      } else {
        // For regular users, check if there's a customer record in the CRM, create one if needed
        // First determine if the user is a regular user or a customer
        const isCustomer = !!(req.user.role === 'client' || req.user.clientId);
        console.log(`User ID in client bookings route: ${req.user.id}, isCustomer: ${isCustomer}`);
        
        let customer;
        
        if (isCustomer) {
          console.log(`User is a client - using direct customer ID: ${req.user.id}`);
          // For client users, their ID is already a customer ID
          customer = await storage.getCustomerById(req.user.id);
          if (!customer) {
            console.log(`No customer found with direct ID, trying legacy lookup`);
            customer = await storage.getCustomerByUserId(req.user.id, true);
          }
        } else {
          // Regular user flow - use the getCustomerByUserId method
          console.log(`Regular user - looking up associated customer for user ID: ${req.user.id}`);
          customer = await storage.getCustomerByUserId(req.user.id, true); // create if not exists
        }
        
        console.log(`User ID: ${req.user.id}, Found/created customer: ${customer ? customer.id : "none"}`);
        
        // First try to get bookings using the customer ID if available
        if (customer) {
          console.log(`Using customer ID ${customer.id} to fetch bookings`);
          rawBookings = await storage.getCustomerBookings(customer.id);
          console.log(`Found ${rawBookings.length} bookings for customer ID ${customer.id}`);
        }
        
        // If no bookings found via customer ID or no customer record, fallback to user ID
        if (!rawBookings || rawBookings.length === 0) {
          const userId = req.user.id;
          console.log(`No bookings found by customer ID or no customer - trying user ID ${userId}`);
          rawBookings = await storage.getUserBookings(userId);
          console.log(`Found ${rawBookings.length} bookings for user ID ${userId}`);
        }
      }
      
      // Format the bookings with additional display properties
      const formattedBookings = rawBookings.map(booking => {
        // Find the service for this booking
        const service = allServices.find(s => s.id === booking.serviceId);
        
        // Format time from the booking date in Mountain Standard Time (MST)
        const rawDate = booking.scheduledDate ?? booking.date;
        // Add debug log to see what's in the booking date
        console.log(`Processing booking ID ${booking.id} with scheduledDate: ${booking.scheduledDate}, date: ${booking.date}`);
        const timeSlot = rawDate
          ? new Date(rawDate).toLocaleTimeString('en-US', { 
              hour: 'numeric', 
              minute: '2-digit', 
              hour12: true, 
              timeZone: 'America/Denver' 
            })
          : 'TBD';
        
        return {
          ...booking,
          serviceType: service?.name || 'Unknown Service',
          timeSlot: timeSlot,
          location: booking.projectLocation || 'No location provided',
          // Ensure status is properly capitalized for display
          status: booking.status.charAt(0).toUpperCase() + booking.status.slice(1),
        };
      });
      
      return res.json(formattedBookings);
    } catch (error) {
      console.error("Error fetching client bookings:", error);
      res.status(500).json({ message: "Error loading bookings" });
    }
  });
  
  // Client dashboard galleries route
  app.get("/api/client/galleries", isAuthenticated, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      if (req.user.isAdmin) {
        // Admin gets all galleries
        const galleries = await storage.getGalleries();
        return res.json(galleries);
      } else {
        // Regular users get their own galleries plus public ones
        const userId = req.user.id;
        const galleries = await storage.getUserGalleries(userId);
        return res.json(galleries);
      }
    } catch (error) {
      console.error("Error fetching client galleries:", error);
      res.status(500).json({ message: "Error loading galleries" });
    }
  });

  // Virtual tours route for clients
  app.get("/api/client/virtual-tours", isAuthenticated, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      // For now, return sample virtual tour data until database is ready
      const sampleTours = [
        {
          id: 1,
          name: "Construction Progress - Week 4",
          description: "Comprehensive 360° tour showing foundation completion and framing progress",
          projectId: 14,
          projectName: "Test Project 3.1",
          tourPath: "construction-week-4",
          thumbnailUrl: "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjE1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjE1MCIgZmlsbD0iIzEzMjY0MiIvPgogIDx0ZXh0IHg9IjEwMCIgeT0iNzUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZmlsbD0iI2ZmZGQzMyIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPjM2MMKwIFRvdXI8L3RleHQ+Cjwvc3ZnPgo=",
          isPublic: false,
          hasVrMode: false,
          fileSizeMb: 245,
          status: "active",
          uploadedAt: "2024-05-04T15:56:58.316Z",
          panoramaCount: 12,
          has2dMaps: true,
          has3dModels: true,
          tourType: "construction"
        },
        {
          id: 2,
          name: "Site Survey - Aerial Overview",
          description: "Complete aerial photogrammetry tour with orthomosaic mapping",
          projectId: 14,
          projectName: "Test Project 3.1",
          tourPath: "site-survey-aerial",
          thumbnailUrl: "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjE1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjE1MCIgZmlsbD0iIzA4MGQxNyIvPgogIDx0ZXh0IHg9IjEwMCIgeT0iNzUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZmlsbD0iI2ZmZGQzMyIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkFlcmlhbCBTdXJ2ZXk8L3RleHQ+Cjwvc3ZnPgo=",
          isPublic: false,
          hasVrMode: false,
          fileSizeMb: 156,
          status: "active",
          uploadedAt: "2024-05-02T10:30:00.000Z",
          panoramaCount: 8,
          has2dMaps: true,
          has3dModels: false,
          tourType: "inspection"
        }
      ];
      
      // Filter tours based on user permissions
      let tours = sampleTours;
      if (!req.user.isAdmin) {
        // Non-admin users only see tours for their projects
        tours = sampleTours; // For demo, showing all tours
      }
      
      res.json(tours);
    } catch (error) {
      console.error("Error fetching virtual tours:", error);
      res.status(500).json({ message: "Error loading virtual tours" });
    }
  });

  // Leave feedback for a booking
  app.post("/api/bookings/feedback", isAuthenticated, async (req, res) => {
    try {
      const { bookingId, rating, feedback } = req.body;
      
      if (!bookingId || !rating) {
        return res.status(400).json({ message: "Booking ID and rating are required" });
      }
      
      // Validate booking exists and belongs to the user
      const booking = await storage.getBooking(parseInt(bookingId));
      
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }
      
      // Admin can leave feedback for any booking, but client can only leave feedback for their own bookings
      if (!req.user || (!req.user.isAdmin && booking.userId !== req.user.id)) {
        return res.status(403).json({ message: "You don't have permission to leave feedback for this booking" });
      }
      
      // Save feedback
      const updatedBooking = await storage.saveBookingFeedback(parseInt(bookingId), {
        rating: parseInt(rating),
        feedback: feedback || "",
        submittedAt: new Date().toISOString(), // Convert to ISO string for storage
        feedbackSubmitted: true
      });
      
      res.json(updatedBooking);
    } catch (error: any) {
      console.error("Error saving booking feedback:", error);
      res.status(500).json({ message: error.message });
    }
  });
}