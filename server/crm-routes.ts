import type { Express } from "express";
import { z } from "zod";
import { storage } from "./storage";
import multer from "multer";
import path from "path";
import fs from "fs";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";
import {
  insertCustomerSchema,
  insertCustomerInteractionSchema,
  insertCustomerDealSchema,
  insertCustomerTaskSchema,
  insertUserSchema,
  insertEmailCampaignSchema,
  insertLeadScoreSchema,
  // Include client type aliases for schema standardization
  InsertClient,
  InsertClientInteraction,
  InsertClientDeal,
  InsertClientTask
} from "@shared/schema";

// Setup for file uploads
const scryptAsync = promisify(scrypt);

// Helper function to hash passwords for client credentials
async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

// Configure multer for file uploads
const storage_config = multer.diskStorage({
  destination: (req, file, cb) => {
    const fileType = req.body.fileType || 'photo';
    let uploadPath = path.join(__dirname, '..', 'public', 'uploads');
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    
    // Create subdirectories based on file type
    if (fileType === 'photo') {
      uploadPath = path.join(uploadPath, 'photos');
    } else if (fileType === 'video') {
      uploadPath = path.join(uploadPath, 'videos');
    } else if (fileType === '3dmodel') {
      uploadPath = path.join(uploadPath, 'models');
    } else if (fileType === 'logo') {
      uploadPath = path.join(uploadPath, 'logos');
    }
    
    // Create subdirectory if it doesn't exist
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    // Create a unique filename with client ID prefix
    const clientId = req.body.clientId || 'unknown';
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `client_${clientId}_${uniqueSuffix}${ext}`);
  }
});

// Middleware to check if user is authenticated (re-used from routes.ts)
const isAuthenticated = (req: any, res: any, next: any) => {
  console.log('CRM route authentication check, authenticated:', req.isAuthenticated());
  if (req.isAuthenticated()) {
    return next();
  }
  return res.status(401).json({ message: "Unauthorized" });
};

// Middleware to check if user is admin (re-used from routes.ts)
const isAdmin = (req: any, res: any, next: any) => {
  if (req.isAuthenticated() && req.user.isAdmin) {
    return next();
  }
  res.status(403).json({ message: "Forbidden" });
};

export function registerCRMRoutes(app: Express) {
  // Special endpoint for client portal registration that doesn't require authentication
  app.post("/api/client", async (req, res) => {
    try {
      const { username, password, firstName, lastName, email, company, phone } = req.body;
      
      if (!username || !password || !firstName || !lastName || !email) {
        return res.status(400).json({ message: "Missing required fields" });
      }
      
      // Check if username or email already exists
      const existingClient = await storage.getCustomerByEmail(email);
      if (existingClient) {
        return res.status(400).json({ message: "Email already exists" });
      }
      
      // Hash the password
      const hashedPassword = await hashPassword(password);
      
      // Create the client with portal access fields
      const client = await storage.createCustomer({
        username,
        password: hashedPassword,
        firstName,
        lastName,
        email,
        company,
        phone,
        status: 'active',
        tags: []
      });
      
      // Return client without password
      const { password: _, ...clientData } = client as any;
      return res.status(200).json(clientData);
      
    } catch (error: any) {
      console.error("Error creating client:", error);
      return res.status(400).json({ message: error.message });
    }
  });

  // Client routes (new endpoint name)
  app.get("/api/crm/clients", isAuthenticated, async (req, res) => {
    try {
      const filters: { status?: string; assignedTo?: number } = {};
      
      // Apply filters if provided in query parameters
      if (req.query.status) {
        filters.status = req.query.status as string;
      }
      
      // If assigned_to filter is provided, parse it as integer
      if (req.query.assigned_to) {
        filters.assignedTo = parseInt(req.query.assigned_to as string);
      }
      
      const clients = await storage.getCustomers(filters);
      
      // Get booking counts for each client
      const clientsWithBookingCounts = await Promise.all(clients.map(async (client) => {
        // Get all bookings for this client
        const clientBookings = await storage.getBookings({ userId: client.id });
        
        // Return client with booking count
        return {
          ...client,
          bookingCount: clientBookings.length
        };
      }));
      
      res.json(clientsWithBookingCounts);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  // Individual client routes
  app.get("/api/crm/clients/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const client = await storage.getCustomer(id);
      
      if (!client) {
        return res.status(404).json({ message: "Client not found" });
      }
      
      res.json(client);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  app.get("/api/crm/clients/:id/all", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const client = await storage.getCustomer(id);
      
      if (!client) {
        return res.status(404).json({ message: "Client not found" });
      }
      
      const interactions = await storage.getCustomerInteractions(id);
      const deals = await storage.getCustomerDeals({ customerId: id });
      const tasks = await storage.getCustomerTasks({ customerId: id });
      
      res.json({
        client,
        interactions,
        deals,
        tasks
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  // Additional client endpoints for standardized terminology
  app.post("/api/crm/clients", isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertCustomerSchema.parse(req.body);
      const client = await storage.createCustomer(validatedData);
      res.status(201).json(client);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });
  
  app.put("/api/crm/clients/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const client = await storage.getCustomer(id);
      
      if (!client) {
        return res.status(404).json({ message: "Client not found" });
      }
      
      const validatedData = insertCustomerSchema.partial().parse(req.body);
      const updatedClient = await storage.updateCustomer(id, validatedData);
      res.json(updatedClient);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Add PATCH endpoint for client updates (to match client-side code)
  app.patch("/api/crm/clients/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const client = await storage.getCustomer(id);
      
      if (!client) {
        return res.status(404).json({ message: "Client not found" });
      }
      
      const validatedData = insertCustomerSchema.partial().parse(req.body);
      const updatedClient = await storage.updateCustomer(id, validatedData);
      res.json(updatedClient);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });
  
  app.delete("/api/crm/clients/:id", isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const client = await storage.getCustomer(id);
      
      if (!client) {
        return res.status(404).json({ message: "Client not found" });
      }
      
      const success = await storage.deleteCustomer(id);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  // Client interactions endpoints
  app.get("/api/crm/clients/:clientId/interactions", isAuthenticated, async (req, res) => {
    try {
      const clientId = parseInt(req.params.clientId);
      const client = await storage.getCustomer(clientId);
      
      if (!client) {
        return res.status(404).json({ message: "Client not found" });
      }
      
      const interactions = await storage.getCustomerInteractions(clientId);
      res.json(interactions);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  // Client deals endpoints
  app.get("/api/crm/clients/:clientId/deals", isAuthenticated, async (req, res) => {
    try {
      const clientId = parseInt(req.params.clientId);
      const client = await storage.getCustomer(clientId);
      
      if (!client) {
        return res.status(404).json({ message: "Client not found" });
      }
      
      const deals = await storage.getCustomerDeals({ customerId: clientId });
      res.json(deals);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  // Client tasks endpoints
  app.get("/api/crm/clients/:clientId/tasks", isAuthenticated, async (req, res) => {
    try {
      const clientId = parseInt(req.params.clientId);
      const client = await storage.getCustomer(clientId);
      
      if (!client) {
        return res.status(404).json({ message: "Client not found" });
      }
      
      const tasks = await storage.getCustomerTasks({ customerId: clientId });
      res.json(tasks);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  // Customer routes (maintain for backward compatibility)
  app.get("/api/crm/customers", isAuthenticated, async (req, res) => {
    try {
      const filters: { status?: string; assignedTo?: number } = {};
      
      // Apply filters if provided in query parameters
      if (req.query.status) {
        filters.status = req.query.status as string;
      }
      
      // If assigned_to filter is provided, parse it as integer
      if (req.query.assigned_to) {
        filters.assignedTo = parseInt(req.query.assigned_to as string);
      }
      
      const customers = await storage.getCustomers(filters);
      res.json(customers);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/crm/customers/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const customer = await storage.getCustomer(id);
      
      if (!customer) {
        return res.status(404).json({ message: "Customer not found" });
      }
      
      res.json(customer);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/crm/customers", isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertCustomerSchema.parse(req.body);
      const customer = await storage.createCustomer(validatedData);
      res.status(201).json(customer);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.put("/api/crm/customers/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const customer = await storage.getCustomer(id);
      
      if (!customer) {
        return res.status(404).json({ message: "Customer not found" });
      }
      
      const validatedData = insertCustomerSchema.partial().parse(req.body);
      const updatedCustomer = await storage.updateCustomer(id, validatedData);
      res.json(updatedCustomer);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Add PATCH endpoint for customer updates (to match client-side code)
  app.patch("/api/crm/customers/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const customer = await storage.getCustomer(id);
      
      if (!customer) {
        return res.status(404).json({ message: "Customer not found" });
      }
      
      const validatedData = insertCustomerSchema.partial().parse(req.body);
      const updatedCustomer = await storage.updateCustomer(id, validatedData);
      res.json(updatedCustomer);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/crm/customers/:id", isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const customer = await storage.getCustomer(id);
      
      if (!customer) {
        return res.status(404).json({ message: "Customer not found" });
      }
      
      const success = await storage.deleteCustomer(id);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Customer Interactions routes
  // Get all interactions for the current user
  app.get("/api/crm/interactions", isAuthenticated, async (req, res) => {
    try {
      // Collect all interactions from all customers
      const customers = await storage.getCustomers();
      let allInteractions: any[] = [];
      
      for (const customer of customers) {
        const interactions = await storage.getCustomerInteractions(customer.id);
        allInteractions = [...allInteractions, ...interactions];
      }

      res.json(allInteractions);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  app.get("/api/crm/customers/:customerId/interactions", isAuthenticated, async (req, res) => {
    try {
      const customerId = parseInt(req.params.customerId);
      const customer = await storage.getCustomer(customerId);
      
      if (!customer) {
        return res.status(404).json({ message: "Customer not found" });
      }
      
      const interactions = await storage.getCustomerInteractions(customerId);
      res.json(interactions);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/crm/interactions/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const interaction = await storage.getCustomerInteraction(id);
      
      if (!interaction) {
        return res.status(404).json({ message: "Interaction not found" });
      }
      
      res.json(interaction);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/crm/interactions", isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertCustomerInteractionSchema.parse(req.body);
      
      // Check if the customer exists
      const customer = await storage.getCustomer(validatedData.customerId);
      if (!customer) {
        return res.status(404).json({ message: "Customer not found" });
      }
      
      const interaction = await storage.createCustomerInteraction(validatedData);
      res.status(201).json(interaction);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.put("/api/crm/interactions/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const interaction = await storage.getCustomerInteraction(id);
      
      if (!interaction) {
        return res.status(404).json({ message: "Interaction not found" });
      }
      
      const validatedData = insertCustomerInteractionSchema.partial().parse(req.body);
      const updatedInteraction = await storage.updateCustomerInteraction(id, validatedData);
      res.json(updatedInteraction);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/crm/interactions/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const interaction = await storage.getCustomerInteraction(id);
      
      if (!interaction) {
        return res.status(404).json({ message: "Interaction not found" });
      }
      
      const success = await storage.deleteCustomerInteraction(id);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Customer Deals routes
  app.get("/api/crm/deals", isAuthenticated, async (req, res) => {
    try {
      const filters: { customerId?: number; stage?: string } = {};
      
      // Apply filters if provided in query parameters
      if (req.query.customer_id) {
        filters.customerId = parseInt(req.query.customer_id as string);
      }
      
      if (req.query.stage) {
        filters.stage = req.query.stage as string;
      }
      
      const deals = await storage.getCustomerDeals(filters);
      res.json(deals);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/crm/deals/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deal = await storage.getCustomerDeal(id);
      
      if (!deal) {
        return res.status(404).json({ message: "Deal not found" });
      }
      
      res.json(deal);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/crm/deals", isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertCustomerDealSchema.parse(req.body);
      
      // Check if the customer exists
      const customer = await storage.getCustomer(validatedData.customerId);
      if (!customer) {
        return res.status(404).json({ message: "Customer not found" });
      }
      
      const deal = await storage.createCustomerDeal(validatedData);
      res.status(201).json(deal);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.put("/api/crm/deals/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deal = await storage.getCustomerDeal(id);
      
      if (!deal) {
        return res.status(404).json({ message: "Deal not found" });
      }
      
      const validatedData = insertCustomerDealSchema.partial().parse(req.body);
      const updatedDeal = await storage.updateCustomerDeal(id, validatedData);
      res.json(updatedDeal);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/crm/deals/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deal = await storage.getCustomerDeal(id);
      
      if (!deal) {
        return res.status(404).json({ message: "Deal not found" });
      }
      
      const success = await storage.deleteCustomerDeal(id);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Customer Tasks routes
  app.get("/api/crm/tasks", isAuthenticated, async (req, res) => {
    try {
      const filters: { customerId?: number; assignedTo?: number; status?: string } = {};
      
      // Apply filters if provided in query parameters
      if (req.query.customer_id) {
        filters.customerId = parseInt(req.query.customer_id as string);
      }
      
      if (req.query.assigned_to) {
        filters.assignedTo = parseInt(req.query.assigned_to as string);
      }
      
      if (req.query.status) {
        filters.status = req.query.status as string;
      }
      
      const tasks = await storage.getCustomerTasks(filters);
      res.json(tasks);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/crm/tasks/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const task = await storage.getCustomerTask(id);
      
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }
      
      res.json(task);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/crm/tasks", isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertCustomerTaskSchema.parse(req.body);
      
      // Check if the customer exists
      const customer = await storage.getCustomer(validatedData.customerId);
      if (!customer) {
        return res.status(404).json({ message: "Customer not found" });
      }
      
      const task = await storage.createCustomerTask(validatedData);
      res.status(201).json(task);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.put("/api/crm/tasks/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const task = await storage.getCustomerTask(id);
      
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }
      
      const validatedData = insertCustomerTaskSchema.partial().parse(req.body);
      const updatedTask = await storage.updateCustomerTask(id, validatedData);
      res.json(updatedTask);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/crm/tasks/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const task = await storage.getCustomerTask(id);
      
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }
      
      const success = await storage.deleteCustomerTask(id);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Convenience endpoint: Get all data for a customer (customer details + interactions + deals + tasks)
  app.get("/api/crm/customers/:id/all", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const customer = await storage.getCustomer(id);
      
      if (!customer) {
        return res.status(404).json({ message: "Customer not found" });
      }
      
      const interactions = await storage.getCustomerInteractions(id);
      const deals = await storage.getCustomerDeals({ customerId: id });
      const tasks = await storage.getCustomerTasks({ customerId: id });
      
      res.json({
        customer,
        interactions,
        deals,
        tasks
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Dashboard summary endpoint
  app.get("/api/crm/dashboard", isAuthenticated, async (req, res) => {
    try {
      // Get all relevant data for dashboard
      const allClients = await storage.getCustomers();
      const allDeals = await storage.getCustomerDeals();
      const allTasks = await storage.getCustomerTasks();
      
      // Calculate summary metrics
      const clientMetrics = {
        total: allClients.length,
        active: allClients.filter(c => c.status === "Active").length,
        prospect: allClients.filter(c => c.status === "Prospect").length,
        inactive: allClients.filter(c => c.status === "Inactive").length,
      };
      
      const dealMetrics = {
        total: allDeals.length,
        totalValue: allDeals.reduce((sum, deal) => sum + (Number(deal.amount) || 0), 0),
        byStage: {
          proposal: allDeals.filter(d => d.stage === "Proposal").length,
          negotiation: allDeals.filter(d => d.stage === "Negotiation").length,
          closedWon: allDeals.filter(d => d.stage === "Closed Won").length,
          closedLost: allDeals.filter(d => d.stage === "Closed Lost").length
        }
      };
      
      const taskMetrics = {
        total: allTasks.length,
        todo: allTasks.filter(t => t.status === "To Do").length,
        inProgress: allTasks.filter(t => t.status === "In Progress").length,
        completed: allTasks.filter(t => t.status === "Completed").length,
        overdue: allTasks.filter(t => {
          const dueDate = t.dueDate ? new Date(t.dueDate) : null;
          return dueDate && dueDate < new Date() && t.status !== "Completed";
        }).length
      };
      
      // Get recent items
      const recentClients = allClients
        .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
        .slice(0, 5);
      
      const recentDeals = allDeals
        .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
        .slice(0, 5);
      
      const recentTasks = allTasks
        .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
        .slice(0, 5);
      
      // Return dashboard data
      res.json({
        metrics: {
          clients: clientMetrics,
          deals: dealMetrics,
          tasks: taskMetrics
        },
        recent: {
          clients: recentClients,
          deals: recentDeals,
          tasks: recentTasks
        }
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Configure multer for file uploads
  const upload = multer({ 
    storage: storage_config,
    limits: {
      fileSize: 50 * 1024 * 1024, // 50MB file size limit
    },
    fileFilter: (req, file, cb) => {
      const fileType = req.body.fileType || 'photo';
      
      // Check file types based on upload category
      if (fileType === 'photo') {
        if (!file.mimetype.match(/^image\/(jpeg|png|gif|webp)$/)) {
          return cb(null, false);
        }
      } else if (fileType === 'video') {
        if (!file.mimetype.match(/^video\/(mp4|webm|quicktime)$/)) {
          return cb(null, false);
        }
      } else if (fileType === '3dmodel') {
        // For 3D models, we rely on file extension since MIME types aren't standardized
        const ext = path.extname(file.originalname).toLowerCase();
        if (!['.obj', '.stl', '.glb', '.gltf'].includes(ext)) {
          return cb(null, false);
        }
      } else if (fileType === 'logo') {
        if (!file.mimetype.match(/^image\/(jpeg|png|svg\\+xml)$/)) {
          return cb(null, false);
        }
      } else {
        return cb(null, false);
      }
      
      cb(null, true);
    }
  });

  // File upload endpoint
  app.post('/api/upload/client-files', isAdmin, upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
      }
      
      const clientId = parseInt(req.body.clientId);
      const fileType = req.body.fileType || 'photo';
      
      // Verify client exists
      const client = await storage.getCustomer(clientId);
      if (!client) {
        // Delete the uploaded file if client doesn't exist
        fs.unlinkSync(req.file.path);
        return res.status(404).json({ message: 'Client not found' });
      }
      
      // Create a record in the appropriate table based on file type
      const fileUrl = `/uploads/${fileType === 'photo' ? 'photos' : 
                         fileType === 'video' ? 'videos' : 
                         fileType === '3dmodel' ? 'models' : 'logos'}/${path.basename(req.file.path)}`;
      
      if (fileType === 'photo' || fileType === 'video') {
        // For photos and videos, create a gallery entry
        await storage.createGallery({
          userId: req.user?.id || 1, // Default to admin if user is not available
          name: req.file.originalname,
          type: fileType,
          url: fileUrl,
          isPublic: false,
          category: 'client-uploads',
          tags: [`client-${clientId}`, fileType]
        });
      } else if (fileType === '3dmodel') {
        // For 3D models, we'll just create a gallery entry instead
        // since we don't have a specific 3D model table implemented yet
        await storage.createGallery({
          userId: req.user?.id || 1, // Default to admin if user is not available
          name: req.file.originalname,
          type: '3dmodel',
          url: fileUrl,
          isPublic: false,
          category: 'client-models',
          tags: [`client-${clientId}`, '3dmodel'],
          description: `3D model for client ${client.firstName} ${client.lastName}`
        });
      } else if (fileType === 'logo' && client) {
        // For logos, update the client's record
        await storage.updateCustomer(clientId, {
          logoUrl: fileUrl
        });
      }
      
      res.status(200).json({ 
        message: 'File uploaded successfully',
        file: {
          filename: req.file.filename,
          path: fileUrl
        }
      });
    } catch (error: any) {
      // Clean up file if there was an error
      if (req.file) {
        try {
          fs.unlinkSync(req.file.path);
        } catch (err) {
          console.error('Failed to delete file after upload error:', err);
        }
      }
      
      res.status(500).json({ message: `Error uploading file: ${error.message}` });
    }
  });

  // Client credentials endpoint - create user login for client
  app.post('/api/crm/clients/credentials', isAdmin, async (req, res) => {
    try {
      const { clientId, username, password, email } = req.body;
      
      if (!clientId || !username || !password) {
        return res.status(400).json({ message: 'Missing required fields' });
      }
      
      // Check if client exists
      const client = await storage.getCustomer(parseInt(clientId));
      if (!client) {
        return res.status(404).json({ message: 'Client not found' });
      }
      
      // Check if username already exists
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(400).json({ message: 'Username already exists' });
      }
      
      // Create user with client permissions
      const hashedPassword = await hashPassword(password);
      
      const user = await storage.createUser({
        username,
        password: hashedPassword,
        email: email || client.email,
        firstName: client.firstName,
        lastName: client.lastName,
        phone: client.phone,
        isAdmin: false
      });
      
      // Link the client's information to this user
      await storage.updateCustomer(client.id, {
        userId: user.id
      });
      
      res.status(201).json({ 
        message: 'Client credentials created successfully',
        username
      });
    } catch (error: any) {
      res.status(500).json({ message: `Error creating client credentials: ${error.message}` });
    }
  });

  // Email Campaign routes
  app.get("/api/email-campaigns", isAdmin, async (req, res) => {
    try {
      const campaigns = await storage.getEmailCampaigns();
      res.json(campaigns);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/email-campaigns/:id", isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const campaign = await storage.getEmailCampaign(id);
      if (!campaign) {
        return res.status(404).json({ message: "Campaign not found" });
      }
      res.json(campaign);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/email-campaigns", isAdmin, async (req, res) => {
    try {
      const validatedData = insertEmailCampaignSchema.parse(req.body);
      const campaign = await storage.createEmailCampaign(validatedData);
      res.status(201).json(campaign);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.put("/api/email-campaigns/:id", isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertEmailCampaignSchema.partial().parse(req.body);
      const campaign = await storage.updateEmailCampaign(id, validatedData);
      if (!campaign) {
        return res.status(404).json({ message: "Campaign not found" });
      }
      res.json(campaign);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/email-campaigns/:id", isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteEmailCampaign(id);
      if (!success) {
        return res.status(404).json({ message: "Campaign not found" });
      }
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Lead Score routes
  app.get("/api/lead-scores", isAdmin, async (req, res) => {
    try {
      const scores = await storage.getLeadScores();
      res.json(scores);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/lead-scores/:customerId", isAdmin, async (req, res) => {
    try {
      const customerId = parseInt(req.params.customerId);
      const score = await storage.getLeadScore(customerId);
      if (!score) {
        return res.status(404).json({ message: "Lead score not found" });
      }
      res.json(score);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/lead-scores/calculate/:customerId", isAdmin, async (req, res) => {
    try {
      const customerId = parseInt(req.params.customerId);
      const score = await storage.calculateLeadScore(customerId);
      res.json(score);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });
}