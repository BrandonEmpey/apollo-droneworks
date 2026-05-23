import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser, customers, users } from "@shared/schema";
import { sql, eq } from "drizzle-orm";
import { db } from "./db";
import { populateAnalyticsData } from "./populate-analytics-data";
import { seedAdCampaigns } from "./seed-ad-campaigns";

// Define types for client user
interface ClientUser {
  id: number;
  username: string;
  password: string | null;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  isAdmin: boolean;
  createdAt: Date | null;
  updatedAt: Date | null;
  role: string;
  logoUrl: string | null;
  company: string | null;
  clientId: number;
}

// Extend Express User interface
declare global {
  namespace Express {
    interface User extends Partial<SelectUser>, Partial<ClientUser> {
      id: number;
      username: string;
      email: string;
    }
  }
}

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

export function setupAuth(app: Express) {
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || 'apollo-droneworks-session-secret',
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      maxAge: 1000 * 60 * 60 * 24 * 7, // 1 week
      secure: false, // Allow cookies over HTTP in development
      sameSite: 'lax',
      httpOnly: true
    }
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy({
      usernameField: 'username',
      passwordField: 'password'
    }, async (username, password, done) => {
      try {
        // Special case for the admin user when using MemStorage
        if (username === 'admin@apollodronesinc.com' && password === 'admin123') {
          const adminUser = await storage.getUserByEmail('admin@apollodronesinc.com');
          if (adminUser) {
            return done(null, adminUser);
          }
        }
        
        // First, try to find a user
        let user;
        if (username.includes('@')) {
          user = await storage.getUserByEmail(username);
        } else {
          user = await storage.getUserByUsername(username);
        }
        
        if (user && await comparePasswords(password, user.password)) {
          return done(null, user);
        }
        
        // If no user found, check for clients/customers with this username
        try {
          console.log("No regular user found, checking for client with username/email:", username);
          
          // Check if there's a client with this username or email
          let client;
          
          // First search by exact username match
          console.log("Searching by username");
          client = await db.select().from(customers)
            .where(sql`username = ${username}`)
            .limit(1);
            
          // If not found by username, try email
          if (client.length === 0) {
            console.log("Not found by username, searching by email");
            client = await db.select().from(customers)
              .where(sql`email = ${username}`)
              .limit(1);
          }
          
          console.log("Client lookup result:", client.length ? "Found" : "Not found");
          
          if (client.length > 0) {
            const foundClient = client[0];
            console.log("Found client:", foundClient.id, foundClient.email, "Has password:", !!foundClient.password);
            
            // Check if the client has a hashed password
            if (foundClient.password) {
              console.log("Client has password, checking if hashed format:", foundClient.password.includes('.'));
              
              // Use comparePasswords if it's a hashed password
              if (foundClient.password.includes('.')) {
                console.log("Comparing hashed password");
                const passwordMatches = await comparePasswords(password, foundClient.password);
                console.log("Password comparison result:", passwordMatches ? "Match" : "No match");
                
                if (passwordMatches) {
                  console.log("Password matches, creating client user session");
                  // Convert client to user format for authentication
                  const clientUser: Express.User = {
                    id: foundClient.id,
                    username: foundClient.username || foundClient.email,
                    email: foundClient.email,
                    password: foundClient.password || "",
                    firstName: foundClient.firstName,
                    lastName: foundClient.lastName,
                    phone: foundClient.phone || null,
                    role: 'client',
                    isAdmin: false,
                    createdAt: foundClient.createdAt || undefined,
                    updatedAt: foundClient.updatedAt,
                    // Custom client properties
                    logoUrl: foundClient.logoUrl,
                    company: foundClient.company,
                    clientId: foundClient.id
                  };
                  return done(null, clientUser);
                }
              } 
              // Plain text password comparison
              else {
                console.log("Comparing plain text password");
                const passwordMatches = password === foundClient.password;
                console.log("Plain text password comparison result:", passwordMatches ? "Match" : "No match");
                
                if (passwordMatches) {
                  console.log("Plain text password matches, creating client user session");
                  // Convert client to user format for authentication
                  const clientUser: Express.User = {
                    id: foundClient.id,
                    username: foundClient.username || foundClient.email,
                    email: foundClient.email,
                    password: foundClient.password || "",
                    firstName: foundClient.firstName,
                    lastName: foundClient.lastName,
                    phone: foundClient.phone || null,
                    role: 'client',
                    isAdmin: false,
                    createdAt: foundClient.createdAt || undefined,
                    updatedAt: foundClient.updatedAt,
                    // Custom client properties
                    logoUrl: foundClient.logoUrl,
                    company: foundClient.company,
                    clientId: foundClient.id
                  };
                  return done(null, clientUser);
                }
              }
            }
          }
        } catch (clientErr) {
          console.error("Error checking client authentication:", clientErr);
        }
        
        // If we get here, authentication failed
        return done(null, false, { message: 'Invalid username or password' });
      } catch (err) {
        return done(err);
      }
    }),
  );

  passport.serializeUser((user: any, done) => {
    // For client users, include a flag to identify them during deserialization
    if (user.role === 'client') {
      done(null, { id: user.id, isClient: true });
    } else {
      done(null, { id: user.id, isClient: false });
    }
  });

  passport.deserializeUser(async (serialized: { id: number, isClient: boolean }, done) => {
    try {
      // For client users, fetch from the customers table
      if (serialized.isClient) {
        const [client] = await db.select().from(customers).where(sql`id = ${serialized.id}`);
        
        if (client) {
          // Convert to user format for the session
          const clientUser: Express.User = {
            id: client.id,
            username: client.username || client.email,
            email: client.email,
            password: client.password || "",
            firstName: client.firstName,
            lastName: client.lastName,
            phone: client.phone || null,
            role: 'client',
            isAdmin: false,
            createdAt: client.createdAt || undefined,
            updatedAt: client.updatedAt,
            // Custom client properties
            logoUrl: client.logoUrl,
            company: client.company,
            clientId: client.id
          };
          
          return done(null, clientUser);
        }
      }
      
      // For regular users, use the storage interface
      const user = await storage.getUser(serialized.id);
      if (user) {
        return done(null, user);
      }
      
      // If we can't find the user in either place
      done(null, false);
    } catch (err) {
      done(err);
    }
  });

  app.post("/api/register", async (req, res, next) => {
    try {
      // Check if username exists
      const existingUsername = await storage.getUserByUsername(req.body.username);
      if (existingUsername) {
        return res.status(400).json({ message: "Username already exists" });
      }

      // Check if email exists
      const existingEmail = await storage.getUserByEmail(req.body.email);
      if (existingEmail) {
        return res.status(400).json({ message: "Email already exists" });
      }

      // Create user with hashed password
      const user = await storage.createUser({
        ...req.body,
        password: await hashPassword(req.body.password),
      });

      // Create a welcome gallery for the new user
      await storage.createGallery({
        name: "Welcome to Apollo DroneWorks",
        type: "image",
        userId: user.id,
        url: "https://images.pexels.com/photos/442587/pexels-photo-442587.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1",
        description: "Welcome to your personalized gallery! This is where all your drone footage will appear after your bookings are completed.",
        isPublic: false,
        category: "welcome",
        publicDescription: null,
        tags: ["welcome", "introduction"],
        thumbnail: null,
        bookingId: null
      });
      
      // If this is the FIRST admin user, fire seed routines that were skipped
      // at startup due to no admin being present (FK guard in task #185).
      // We check admin count inside setImmediate: if there is more than one
      // admin already in the DB the hook is a no-op, preventing unintended
      // analytics wipes when additional admins are added later.
      // Run asynchronously so registration response is not delayed.
      if (user.isAdmin) {
        setImmediate(async () => {
          try {
            const adminRows = await db
              .select({ id: users.id })
              .from(users)
              .where(eq(users.isAdmin, true));
            if (adminRows.length > 1) {
              console.log("[post-register] Additional admin created; skipping seed replay (data already populated).");
              return;
            }
          } catch (err) {
            console.error("[post-register] Could not query admin count; aborting seed replay:", err);
            return;
          }
          try {
            await populateAnalyticsData();
            console.log("[post-register] Analytics data seeded for first admin user.");
          } catch (err) {
            console.error("[post-register] Error seeding analytics data:", err);
          }
          try {
            await seedAdCampaigns();
            console.log("[post-register] Ad campaigns seeded for first admin user.");
          } catch (err) {
            console.error("[post-register] Error seeding ad campaigns:", err);
          }
        });
      }

      // Auto-login after registration
      req.login(user, (err) => {
        if (err) return next(err);
        return res.status(201).json({
          id: user.id,
          username: user.username,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          isAdmin: user.isAdmin
        });
      });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/login", (req, res, next) => {
    passport.authenticate("local", (err: any, user: Express.User | false, info: { message?: string }) => {
      if (err) return next(err);
      if (!user) {
        return res.status(401).json({ message: info.message || "Login failed" });
      }
      req.login(user, (err) => {
        if (err) return next(err);
        return res.status(200).json({
          id: user.id,
          username: user.username,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          isAdmin: user.isAdmin,
          role: user.role || 'user',
          clientId: (user as any).clientId
        });
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const user = req.user as Express.User;
    
    // Base user data
    const userData = {
      id: user.id,
      username: user.username,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      isAdmin: user.isAdmin
    };
    
    // Add client-specific fields if this is a client user
    if (user.role === 'client') {
      Object.assign(userData, {
        role: 'client',
        clientId: user.clientId,
        company: user.company,
        logoUrl: user.logoUrl
      });
    }
    
    res.json(userData);
  });
}

// Authentication middleware
export function requireAuth(req: any, res: any, next: any) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: "Authentication required" });
}
