import { users, type User, type InsertUser, services, type Service, type InsertService, 
  bookings, type Booking, type InsertBooking, galleries, type Gallery, type InsertGallery,
  beforeAfterImages, type BeforeAfterImage, type InsertBeforeAfterImage,
  blogPosts, type BlogPost, type InsertBlogPost, testimonials, type Testimonial, type InsertTestimonial,
  contactMessages, type ContactMessage, type InsertContactMessage, quotes, 
  businessConfig, type BusinessConfig, 
  socialMediaAccounts, type SocialMediaAccount, type InsertSocialMediaAccount,
  socialPosts, type SocialPost, type InsertSocialPost,
  type BookingFeedback,
  clientProjects, type ClientProject, type InsertClientProject,
  projectMilestones, type ProjectMilestone, type InsertProjectMilestone,
  projectTasks, type ProjectTask, type InsertProjectTask,
  taskFiles, type TaskFile, type InsertTaskFile,
  taskMessages, type TaskMessage, type InsertTaskMessage,
  timelapseItems, type TimelapseItem, type InsertTimelapseItem,
  // Notifications import
  notifications, type Notification, type InsertNotification,
  // Analytics imports
  droneAnalytics, type DroneAnalytics, type InsertDroneAnalytics,
  flightLogs, type FlightLog, type InsertFlightLog,
  projectAnalytics, type ProjectAnalytics, type InsertProjectAnalytics,
  marketingAnalytics, type MarketingAnalytics, type InsertMarketingAnalytics,
  clientAnalytics, type ClientAnalytics, type InsertClientAnalytics,
  analyticsReports, type AnalyticsReport, type InsertAnalyticsReport,
  // Payroll imports
  departments, type Department, type InsertDepartment,
  employees, type Employee, type InsertEmployee,
  payrollPeriods, type PayrollPeriod, type InsertPayrollPeriod,
  payrollEntries, type PayrollEntry, type InsertPayrollEntry,
  timeEntries, type TimeEntry, type InsertTimeEntry,
  // CRM imports
  customers, type Customer, type InsertCustomer,
  customerInteractions, type CustomerInteraction, type InsertCustomerInteraction,
  customerDeals, type CustomerDeal, type InsertCustomerDeal,
  customerTasks, type CustomerTask, type InsertCustomerTask,
  // Virtual tours import
  virtualTours, type VirtualTour, type InsertVirtualTour,
  // Trust administration imports
  trustEntities, type TrustEntity, type InsertTrustEntity,
  trustBeneficiaries, type TrustBeneficiary, type InsertTrustBeneficiary,
  trustTrustees, type TrustTrustee, type InsertTrustTrustee,
  trustAssets, type TrustAsset, type InsertTrustAsset,
  trustAssetHistory, type TrustAssetHistory, type InsertTrustAssetHistory,
  trustDistributions, type TrustDistribution, type InsertTrustDistribution,
  trustDocuments, type TrustDocument, type InsertTrustDocument,
  trustCompliance, type TrustCompliance, type InsertTrustCompliance,
  trustMeetings, type TrustMeeting, type InsertTrustMeeting,
  // Industry tiles imports
  industryTiles, type IndustryTile, type InsertIndustryTile,
  industryTileServices, type IndustryTileService, type InsertIndustryTileService,
  // Hero carousel slides
  heroSlides, type HeroSlide, type InsertHeroSlide,
  // Service bundle discounts
  serviceBundleDiscounts, type ServiceBundleDiscount,
  // Email campaigns and lead scoring
  emailCampaigns, type EmailCampaign, type InsertEmailCampaign,
  leadScores, type LeadScore, type InsertLeadScore } from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, asc, gte, lte, or, sql, between, like, isNull, inArray } from "drizzle-orm";
import session, { Store as SessionStore } from "express-session";
import connectPgSimple from "connect-pg-simple";
import { pool } from "./db";
import { IStorage } from "./storage";

export class ServiceHasBookingsError extends Error {
  constructor(public readonly serviceId: number, public readonly bookingsCount: number) {
    super(`Service ${serviceId} has ${bookingsCount} booking${bookingsCount === 1 ? "" : "s"} and cannot be deleted`);
    this.name = "ServiceHasBookingsError";
  }
}

export class DatabaseStorage implements IStorage {
  public sessionStore: session.SessionStore;

  constructor() {
    // Initialize session store with PostgreSQL
    const PostgresSessionStore = connectPgSimple(session);
    this.sessionStore = new PostgresSessionStore({
      pool,
      createTableIfMissing: true,
    });
  }

  // User operations
  async getUsers(): Promise<User[]> {
    return db.select().from(users).orderBy(asc(users.id));
  }
  
  // Alias for getUsers, used by admin dashboard
  async getAllUsers(): Promise<User[]> {
    return this.getUsers();
  }
  
  async getUser(id: number): Promise<User | undefined> {
    console.log(`DatabaseStorage: Fetching user with ID: ${id}`);
    
    // First try the users table
    const [user] = await db.select().from(users).where(eq(users.id, id));
    
    if (user) {
      console.log(`DatabaseStorage: User lookup result: Found user ${user.username} in users table`);
      return user;
    }
    
    // If not found in users table, check the customers table
    console.log(`DatabaseStorage: User not found in users table, checking customers table`);
    try {
      const [customer] = await db.select().from(customers).where(eq(customers.id, id));
      
      if (customer) {
        console.log(`DatabaseStorage: Found customer with ID ${id}, converting to user format`);
        
        // Convert customer to user format
        const customerAsUser: User = {
          id: customer.id,
          username: customer.username || customer.email,
          password: customer.password || '',
          email: customer.email,
          firstName: customer.firstName,
          lastName: customer.lastName,
          phone: customer.phone || null,
          isAdmin: false,
          createdAt: customer.createdAt || new Date(),
        };
        
        return customerAsUser;
      }
    } catch (error) {
      console.error(`DatabaseStorage: Error checking customers table:`, error);
    }
    
    console.log(`DatabaseStorage: User lookup result: User not found in either table`);
    return undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(userData: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(userData).returning();
    return user;
  }

  async updateUser(id: number, userData: Partial<User>): Promise<User | undefined> {
    const [updatedUser] = await db
      .update(users)
      .set(userData)
      .where(eq(users.id, id))
      .returning();
    return updatedUser;
  }

  // Service operations
  async getServices(): Promise<Service[]> {
    return db.select().from(services);
  }

  async getService(id: number): Promise<Service | undefined> {
    const [service] = await db.select().from(services).where(eq(services.id, id));
    return service;
  }

  async createService(serviceData: InsertService): Promise<Service> {
    // Ensure new services are properly initialized with carousel arrays
    const serviceWithCarousel = {
      ...serviceData,
      // Initialize images array with imageUrl if provided
      images: serviceData.imageUrl ? [serviceData.imageUrl] : (serviceData.images || []),
      // Initialize videos array with videoUrl if provided  
      videos: serviceData.videoUrl ? [serviceData.videoUrl] : (serviceData.videos || []),
      // Ensure other arrays are initialized
      features: serviceData.features || [],
      keywords: serviceData.keywords || [],
      whatsIncludedContent: serviceData.whatsIncludedContent || [],
      processSteps: serviceData.processSteps || [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const [service] = await db.insert(services).values(serviceWithCarousel).returning();
    return service;
  }

  async updateService(id: number, serviceData: Partial<Service>): Promise<Service | undefined> {
    // Ensure array fields are properly formatted for database insertion
    const cleanedData = {
      ...serviceData,
      updatedAt: new Date()
    };

    // Handle array fields properly for PostgreSQL storage
    // The database uses JSON columns that need proper serialization
    // folderStructure is a native text[] column but benefits from the same null→[] normalization
    const arrayFields = ['features', 'whatsIncludedContent', 'processSteps', 'bundleConfigurations', 'pricingTiers', 'folderStructure'];
    
    arrayFields.forEach(field => {
      if (cleanedData[field as keyof typeof cleanedData] !== undefined) {
        // If it's a string, try to parse it as JSON first
        if (typeof cleanedData[field as keyof typeof cleanedData] === 'string') {
          try {
            cleanedData[field as keyof typeof cleanedData] = JSON.parse(cleanedData[field as keyof typeof cleanedData] as string);
          } catch {
            cleanedData[field as keyof typeof cleanedData] = null as any;
          }
        }
        // Keep existing arrays as-is, only convert null to empty array for new data
        if (cleanedData[field as keyof typeof cleanedData] === null) {
          cleanedData[field as keyof typeof cleanedData] = [] as any;
        }
      }
    });

    const [updatedService] = await db
      .update(services)
      .set(cleanedData)
      .where(eq(services.id, id))
      .returning();
    return updatedService;
  }

  async deleteService(id: number): Promise<boolean> {
    try {
      return await db.transaction(async (tx) => {
        const [bookingCount] = await tx
          .select({ count: sql<number>`count(*)::int` })
          .from(bookings)
          .where(eq(bookings.serviceId, id));
        const count = Number(bookingCount?.count ?? 0);
        if (count > 0) {
          throw new ServiceHasBookingsError(id, count);
        }

        await tx
          .delete(serviceBundleDiscounts)
          .where(
            or(
              eq(serviceBundleDiscounts.primaryServiceId, id),
              eq(serviceBundleDiscounts.secondaryServiceId, id),
            ),
          );

        const result = await tx
          .delete(services)
          .where(eq(services.id, id))
          .returning({ id: services.id });
        return result.length > 0;
      });
    } catch (err) {
      // Concurrency safety: if a booking was inserted between our count and the
      // service delete, Postgres raises FK violation 23503 on
      // bookings_service_id_fkey (RESTRICT). Re-count and surface the same
      // 409 contract instead of leaking a 500. Narrow strictly to the bookings
      // FK so unrelated FK violations still bubble up as 500.
      if (err instanceof ServiceHasBookingsError) throw err;
      const e = err as { code?: string; constraint?: string } | null;
      if (e?.code === "23503" && e?.constraint === "bookings_service_id_fkey") {
        const [post] = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(bookings)
          .where(eq(bookings.serviceId, id));
        const postCount = Number(post?.count ?? 0);
        if (postCount > 0) {
          throw new ServiceHasBookingsError(id, postCount);
        }
      }
      throw err;
    }
  }

  // Service bundle discount operations
  async getServiceBundleDiscounts(): Promise<ServiceBundleDiscount[]> {
    return db.select().from(serviceBundleDiscounts);
  }

  // Booking operations
  async getBookings(): Promise<Booking[]> {
    return db.select().from(bookings).orderBy(desc(bookings.createdAt));
  }

  async getBooking(id: number): Promise<Booking | undefined> {
    const [booking] = await db.select().from(bookings).where(eq(bookings.id, id));
    return booking;
  }

  async getUserBookings(userId: number): Promise<Booking[]> {
    console.log(`Fetching bookings for user ID: ${userId}`);
    const result = await db
      .select()
      .from(bookings)
      .where(eq(bookings.userId, userId))
      .orderBy(desc(bookings.createdAt));
    
    console.log(`Found ${result.length} bookings for user ID ${userId}:`, result);
    return result;
  }

  async getCustomerBookings(customerId: number): Promise<Booking[]> {
    console.log(`Fetching bookings for customer ID: ${customerId}`);
    
    // Get the customer record directly (not from clients table)
    const customer = await this.getCustomerById(customerId);
    
    if (!customer) {
      console.log(`No customer found with ID ${customerId}`);
      return [];
    }
    
    // Handle two cases: 
    // 1. Customer has a userId reference to a user in the users table
    // 2. Customer is the actual user (no userId reference)
    
    let userIdToSearch;
    
    if (customer.userId) {
      // Case 1: Customer has a reference to a user
      console.log(`Customer ${customerId} has associated user ID: ${customer.userId}`);
      userIdToSearch = customer.userId;
    } else {
      // Case 2: Customer is directly a user (logged in as customer)
      console.log(`Customer ${customerId} is directly a user`);
      userIdToSearch = customerId;
    }
    
    // Get bookings for this user ID
    console.log(`Getting bookings for user ID: ${userIdToSearch}`);
    const result = await db
      .select()
      .from(bookings)
      .where(eq(bookings.userId, userIdToSearch))
      .orderBy(desc(bookings.createdAt));
    
    console.log(`Found ${result.length} bookings for customer ID ${customerId}:`, result);
    return result;
  }

  async createBooking(bookingData: InsertBooking): Promise<Booking> {
    console.log("Creating booking with data:", JSON.stringify(bookingData, null, 2));
    const [booking] = await db.insert(bookings).values(bookingData).returning();
    console.log("Created booking:", JSON.stringify(booking, null, 2));
    return booking;
  }

  async updateBooking(id: number, bookingData: Partial<Booking>): Promise<Booking | undefined> {
    const [updatedBooking] = await db
      .update(bookings)
      .set(bookingData)
      .where(eq(bookings.id, id))
      .returning();
    return updatedBooking;
  }

  async deleteBooking(id: number): Promise<boolean> {
    await db.delete(bookings).where(eq(bookings.id, id));
    return true;
  }

  // Gallery operations
  async getGalleries(): Promise<Gallery[]> {
    return db.select().from(galleries).orderBy(desc(galleries.createdAt));
  }

  async getGallery(id: number): Promise<Gallery | undefined> {
    const [gallery] = await db.select().from(galleries).where(eq(galleries.id, id));
    return gallery;
  }

  async getUserGalleries(userId: number): Promise<Gallery[]> {
    return db
      .select()
      .from(galleries)
      .where(eq(galleries.userId, userId))
      .orderBy(desc(galleries.createdAt));
  }

  async getPublicGalleries(): Promise<Gallery[]> {
    return db
      .select()
      .from(galleries)
      .where(eq(galleries.isPublic, true))
      .orderBy(desc(galleries.createdAt));
  }

  async createGallery(galleryData: InsertGallery): Promise<Gallery> {
    const [gallery] = await db.insert(galleries).values(galleryData).returning();
    return gallery;
  }

  async updateGallery(id: number, galleryData: Partial<Gallery>): Promise<Gallery | undefined> {
    const [updatedGallery] = await db
      .update(galleries)
      .set(galleryData)
      .where(eq(galleries.id, id))
      .returning();
    return updatedGallery;
  }

  async deleteGallery(id: number): Promise<boolean> {
    await db.delete(galleries).where(eq(galleries.id, id));
    return true;
  }

  // Before/After Image operations
  async getBeforeAfterImages(): Promise<BeforeAfterImage[]> {
    return db.select().from(beforeAfterImages).orderBy(desc(beforeAfterImages.createdAt));
  }

  async getBeforeAfterImage(id: number): Promise<BeforeAfterImage | undefined> {
    const [image] = await db.select().from(beforeAfterImages).where(eq(beforeAfterImages.id, id));
    return image;
  }

  async getPublicBeforeAfterImages(): Promise<BeforeAfterImage[]> {
    return db
      .select()
      .from(beforeAfterImages)
      .where(eq(beforeAfterImages.isPublic, true))
      .orderBy(desc(beforeAfterImages.createdAt));
  }

  async createBeforeAfterImage(imageData: InsertBeforeAfterImage): Promise<BeforeAfterImage> {
    const [image] = await db.insert(beforeAfterImages).values(imageData).returning();
    return image;
  }

  async updateBeforeAfterImage(id: number, imageData: Partial<BeforeAfterImage>): Promise<BeforeAfterImage | undefined> {
    const [updatedImage] = await db
      .update(beforeAfterImages)
      .set(imageData)
      .where(eq(beforeAfterImages.id, id))
      .returning();
    return updatedImage;
  }

  async deleteBeforeAfterImage(id: number): Promise<boolean> {
    await db.delete(beforeAfterImages).where(eq(beforeAfterImages.id, id));
    return true;
  }

  // Blog Post operations
  async getBlogPosts(): Promise<BlogPost[]> {
    return db.select().from(blogPosts).orderBy(desc(blogPosts.createdAt));
  }

  async getBlogPost(id: number): Promise<BlogPost | undefined> {
    const [blogPost] = await db.select().from(blogPosts).where(eq(blogPosts.id, id));
    return blogPost;
  }

  async createBlogPost(blogPostData: InsertBlogPost): Promise<BlogPost> {
    const [blogPost] = await db.insert(blogPosts).values(blogPostData).returning();
    return blogPost;
  }

  async updateBlogPost(id: number, blogPostData: Partial<BlogPost>): Promise<BlogPost | undefined> {
    const [updatedBlogPost] = await db
      .update(blogPosts)
      .set({ ...blogPostData, updatedAt: new Date() })
      .where(eq(blogPosts.id, id))
      .returning();
    return updatedBlogPost;
  }

  async deleteBlogPost(id: number): Promise<boolean> {
    await db.delete(blogPosts).where(eq(blogPosts.id, id));
    return true;
  }

  // Testimonial operations
  async getTestimonials(): Promise<Testimonial[]> {
    return db.select().from(testimonials).orderBy(desc(testimonials.createdAt));
  }

  async getApprovedTestimonials(): Promise<Testimonial[]> {
    return db
      .select()
      .from(testimonials)
      .where(eq(testimonials.isApproved, true))
      .orderBy(desc(testimonials.createdAt));
  }

  async getTestimonial(id: number): Promise<Testimonial | undefined> {
    const [testimonial] = await db.select().from(testimonials).where(eq(testimonials.id, id));
    return testimonial;
  }

  async createTestimonial(testimonialData: InsertTestimonial): Promise<Testimonial> {
    const [testimonial] = await db.insert(testimonials).values(testimonialData).returning();
    return testimonial;
  }

  async updateTestimonial(id: number, testimonialData: Partial<Testimonial>): Promise<Testimonial | undefined> {
    const [updatedTestimonial] = await db
      .update(testimonials)
      .set(testimonialData)
      .where(eq(testimonials.id, id))
      .returning();
    return updatedTestimonial;
  }

  async deleteTestimonial(id: number): Promise<boolean> {
    await db.delete(testimonials).where(eq(testimonials.id, id));
    return true;
  }

  // Contact Message operations
  async getContactMessages(): Promise<ContactMessage[]> {
    return db.select().from(contactMessages).orderBy(desc(contactMessages.createdAt));
  }

  async getContactMessage(id: number): Promise<ContactMessage | undefined> {
    const [message] = await db.select().from(contactMessages).where(eq(contactMessages.id, id));
    return message;
  }

  async createContactMessage(messageData: InsertContactMessage): Promise<ContactMessage> {
    const [message] = await db.insert(contactMessages).values(messageData).returning();
    return message;
  }

  async updateContactMessage(id: number, messageData: Partial<ContactMessage>): Promise<ContactMessage | undefined> {
    const [updatedMessage] = await db
      .update(contactMessages)
      .set(messageData)
      .where(eq(contactMessages.id, id))
      .returning();
    return updatedMessage;
  }

  async deleteContactMessage(id: number): Promise<boolean> {
    await db.delete(contactMessages).where(eq(contactMessages.id, id));
    return true;
  }
  
  // Quote operations
  async getQuotes(userId?: number): Promise<any[]> {
    if (userId) {
      return db
        .select()
        .from(quotes)
        .where(eq(quotes.userId, userId))
        .orderBy(desc(quotes.createdAt));
    }
    return db.select().from(quotes).orderBy(desc(quotes.createdAt));
  }

  async getQuote(id: number): Promise<any | undefined> {
    const [quote] = await db.select().from(quotes).where(eq(quotes.id, id));
    return quote;
  }

  async createQuote(quoteData: any): Promise<any> {
    const [quote] = await db.insert(quotes).values(quoteData).returning();
    return quote;
  }

  async updateQuote(id: number, quoteData: Partial<any>): Promise<any | undefined> {
    const [updatedQuote] = await db
      .update(quotes)
      .set({ ...quoteData, updatedAt: new Date() })
      .where(eq(quotes.id, id))
      .returning();
    return updatedQuote;
  }

  async deleteQuote(id: number): Promise<boolean> {
    await db.delete(quotes).where(eq(quotes.id, id));
    return true;
  }
  
  // Business Config operations
  async getBusinessConfig(): Promise<BusinessConfig | undefined> {
    const [config] = await db.select().from(businessConfig).where(eq(businessConfig.name, 'default'));
    return config;
  }
  
  async updateBusinessConfig(configData: Partial<BusinessConfig>): Promise<BusinessConfig> {
    // Check if default config exists
    const [existingConfig] = await db.select().from(businessConfig).where(eq(businessConfig.name, 'default'));
    
    if (existingConfig) {
      // Update existing config
      const [updatedConfig] = await db
        .update(businessConfig)
        .set({ ...configData, updatedAt: new Date() })
        .where(eq(businessConfig.id, existingConfig.id))
        .returning();
      return updatedConfig;
    } else {
      // Create new config with default name
      const [newConfig] = await db
        .insert(businessConfig)
        .values({ ...configData, name: 'default' })
        .returning();
      return newConfig;
    }
  }

  // Social Media Account operations
  async getSocialMediaAccounts(userId: number): Promise<SocialMediaAccount[]> {
    return db
      .select()
      .from(socialMediaAccounts)
      .where(eq(socialMediaAccounts.userId, userId))
      .orderBy(desc(socialMediaAccounts.updatedAt));
  }

  async getSocialMediaAccount(id: number): Promise<SocialMediaAccount | undefined> {
    const [account] = await db
      .select()
      .from(socialMediaAccounts)
      .where(eq(socialMediaAccounts.id, id));
    return account;
  }

  async getSocialMediaAccountByPlatform(userId: number, platform: string): Promise<SocialMediaAccount | undefined> {
    const [account] = await db
      .select()
      .from(socialMediaAccounts)
      .where(
        and(
          eq(socialMediaAccounts.userId, userId),
          eq(socialMediaAccounts.platform, platform)
        )
      );
    return account;
  }

  async createSocialMediaAccount(accountData: InsertSocialMediaAccount): Promise<SocialMediaAccount> {
    const [account] = await db
      .insert(socialMediaAccounts)
      .values({
        ...accountData,
        connected: accountData.connected ?? false
      })
      .returning();
    return account;
  }

  async updateSocialMediaAccount(id: number, accountData: Partial<SocialMediaAccount>): Promise<SocialMediaAccount | undefined> {
    const [updatedAccount] = await db
      .update(socialMediaAccounts)
      .set({ ...accountData, updatedAt: new Date() })
      .where(eq(socialMediaAccounts.id, id))
      .returning();
    return updatedAccount;
  }

  async deleteSocialMediaAccount(id: number): Promise<boolean> {
    await db.delete(socialMediaAccounts).where(eq(socialMediaAccounts.id, id));
    return true;
  }

  // Social Post operations
  async getSocialPosts(userId: number): Promise<SocialPost[]> {
    return db
      .select()
      .from(socialPosts)
      .where(eq(socialPosts.userId, userId))
      .orderBy(desc(socialPosts.createdAt));
  }

  async getSocialPost(id: number): Promise<SocialPost | undefined> {
    const [post] = await db.select().from(socialPosts).where(eq(socialPosts.id, id));
    return post;
  }

  async createSocialPost(postData: InsertSocialPost): Promise<SocialPost> {
    const [post] = await db
      .insert(socialPosts)
      .values({
        ...postData,
        published: postData.published ?? false
      })
      .returning();
    return post;
  }

  async updateSocialPost(id: number, postData: Partial<SocialPost>): Promise<SocialPost | undefined> {
    const [updatedPost] = await db
      .update(socialPosts)
      .set({ ...postData, updatedAt: new Date() })
      .where(eq(socialPosts.id, id))
      .returning();
    return updatedPost;
  }

  async deleteSocialPost(id: number): Promise<boolean> {
    await db.delete(socialPosts).where(eq(socialPosts.id, id));
    return true;
  }
  
  // Drone Analytics operations
  async getDrones(): Promise<DroneAnalytics[]> {
    return db.select().from(droneAnalytics).orderBy(asc(droneAnalytics.droneName));
  }
  
  async getDrone(id: number): Promise<DroneAnalytics | undefined> {
    const [drone] = await db.select().from(droneAnalytics).where(eq(droneAnalytics.id, id));
    return drone;
  }
  
  async createDrone(droneData: InsertDroneAnalytics): Promise<DroneAnalytics> {
    const [drone] = await db.insert(droneAnalytics).values(droneData).returning();
    return drone;
  }
  
  async updateDrone(id: number, droneData: Partial<DroneAnalytics>): Promise<DroneAnalytics | undefined> {
    const [updatedDrone] = await db
      .update(droneAnalytics)
      .set({ ...droneData, updatedAt: new Date() })
      .where(eq(droneAnalytics.id, id))
      .returning();
    return updatedDrone;
  }
  
  async deleteDrone(id: number): Promise<boolean> {
    await db.delete(droneAnalytics).where(eq(droneAnalytics.id, id));
    return true;
  }
  
  // Flight Log operations
  async getFlightLogs(filters?: { droneId?: number, startDate?: string, endDate?: string }): Promise<FlightLog[]> {
    let query = db.select().from(flightLogs);
    
    if (filters) {
      const conditions = [];
      
      if (filters.droneId) {
        conditions.push(eq(flightLogs.droneId, filters.droneId));
      }
      
      if (filters.startDate && filters.endDate) {
        conditions.push(
          and(
            gte(flightLogs.flightDate, filters.startDate),
            lte(flightLogs.flightDate, filters.endDate)
          )
        );
      } else if (filters.startDate) {
        conditions.push(gte(flightLogs.flightDate, filters.startDate));
      } else if (filters.endDate) {
        conditions.push(lte(flightLogs.flightDate, filters.endDate));
      }
      
      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }
    }
    
    return query.orderBy(desc(flightLogs.flightDate), desc(flightLogs.startTime));
  }
  
  async getFlightLog(id: number): Promise<FlightLog | undefined> {
    const [log] = await db.select().from(flightLogs).where(eq(flightLogs.id, id));
    return log;
  }
  
  async createFlightLog(logData: InsertFlightLog): Promise<FlightLog> {
    const [log] = await db.insert(flightLogs).values(logData).returning();
    return log;
  }
  
  async updateFlightLog(id: number, logData: Partial<FlightLog>): Promise<FlightLog | undefined> {
    const [updatedLog] = await db
      .update(flightLogs)
      .set({ ...logData, updatedAt: new Date() })
      .where(eq(flightLogs.id, id))
      .returning();
    return updatedLog;
  }
  
  async deleteFlightLog(id: number): Promise<boolean> {
    await db.delete(flightLogs).where(eq(flightLogs.id, id));
    return true;
  }
  
  // Project Analytics operations
  async getProjectAnalytics(filters?: { startDate?: string, endDate?: string, serviceType?: string }): Promise<ProjectAnalytics[]> {
    let query = db.select().from(projectAnalytics);
    
    if (filters) {
      const conditions = [];
      
      if (filters.serviceType) {
        conditions.push(eq(projectAnalytics.serviceType, filters.serviceType));
      }
      
      if (filters.startDate && filters.endDate) {
        conditions.push(
          and(
            gte(projectAnalytics.createdAt, new Date(filters.startDate)),
            lte(projectAnalytics.createdAt, new Date(filters.endDate))
          )
        );
      } else if (filters.startDate) {
        conditions.push(gte(projectAnalytics.createdAt, new Date(filters.startDate)));
      } else if (filters.endDate) {
        conditions.push(lte(projectAnalytics.createdAt, new Date(filters.endDate)));
      }
      
      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }
    }
    
    return query.orderBy(desc(projectAnalytics.createdAt));
  }
  
  async getProjectAnalytic(id: number): Promise<ProjectAnalytics | undefined> {
    const [project] = await db.select().from(projectAnalytics).where(eq(projectAnalytics.id, id));
    return project;
  }
  
  async createProjectAnalytic(projectData: InsertProjectAnalytics): Promise<ProjectAnalytics> {
    const [project] = await db.insert(projectAnalytics).values(projectData).returning();
    return project;
  }
  
  async updateProjectAnalytic(id: number, projectData: Partial<ProjectAnalytics>): Promise<ProjectAnalytics | undefined> {
    const [updatedProject] = await db
      .update(projectAnalytics)
      .set({ ...projectData, updatedAt: new Date() })
      .where(eq(projectAnalytics.id, id))
      .returning();
    return updatedProject;
  }
  
  async deleteProjectAnalytic(id: number): Promise<boolean> {
    await db.delete(projectAnalytics).where(eq(projectAnalytics.id, id));
    return true;
  }
  
  // Client Analytics operations
  async getClientAnalytics(filters?: { startDate?: string, endDate?: string }): Promise<ClientAnalytics[]> {
    let query = db.select().from(clientAnalytics);
    
    if (filters) {
      const conditions = [];
      
      if (filters.startDate && filters.endDate) {
        conditions.push(
          and(
            gte(clientAnalytics.createdAt, new Date(filters.startDate)),
            lte(clientAnalytics.createdAt, new Date(filters.endDate))
          )
        );
      } else if (filters.startDate) {
        conditions.push(gte(clientAnalytics.createdAt, new Date(filters.startDate)));
      } else if (filters.endDate) {
        conditions.push(lte(clientAnalytics.createdAt, new Date(filters.endDate)));
      }
      
      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }
    }
    
    return query.orderBy(desc(clientAnalytics.createdAt));
  }
  
  async getClientAnalytic(id: number): Promise<ClientAnalytics | undefined> {
    const [client] = await db.select().from(clientAnalytics).where(eq(clientAnalytics.id, id));
    return client;
  }
  
  async getClientAnalyticByUserId(userId: number): Promise<ClientAnalytics | undefined> {
    const [client] = await db.select().from(clientAnalytics).where(eq(clientAnalytics.userId, userId));
    return client;
  }
  
  async createClientAnalytic(clientData: InsertClientAnalytics): Promise<ClientAnalytics> {
    const [client] = await db.insert(clientAnalytics).values(clientData).returning();
    return client;
  }
  
  async updateClientAnalytic(id: number, clientData: Partial<ClientAnalytics>): Promise<ClientAnalytics | undefined> {
    const [updatedClient] = await db
      .update(clientAnalytics)
      .set({ ...clientData, updatedAt: new Date() })
      .where(eq(clientAnalytics.id, id))
      .returning();
    return updatedClient;
  }
  
  async deleteClientAnalytic(id: number): Promise<boolean> {
    await db.delete(clientAnalytics).where(eq(clientAnalytics.id, id));
    return true;
  }
  
  // Marketing Analytics operations
  async getMarketingAnalytics(filters?: { startDate?: string, endDate?: string, channel?: string }): Promise<MarketingAnalytics[]> {
    let query = db.select().from(marketingAnalytics);
    
    if (filters) {
      const conditions = [];
      
      if (filters.channel) {
        conditions.push(eq(marketingAnalytics.channel, filters.channel));
      }
      
      if (filters.startDate && filters.endDate) {
        conditions.push(
          and(
            gte(marketingAnalytics.date, filters.startDate),
            lte(marketingAnalytics.date, filters.endDate)
          )
        );
      } else if (filters.startDate) {
        conditions.push(gte(marketingAnalytics.date, filters.startDate));
      } else if (filters.endDate) {
        conditions.push(lte(marketingAnalytics.date, filters.endDate));
      }
      
      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }
    }
    
    return query.orderBy(desc(marketingAnalytics.date));
  }
  
  async getMarketingAnalytic(id: number): Promise<MarketingAnalytics | undefined> {
    const [marketing] = await db.select().from(marketingAnalytics).where(eq(marketingAnalytics.id, id));
    return marketing;
  }
  
  async createMarketingAnalytic(marketingData: Partial<MarketingAnalytics>): Promise<MarketingAnalytics> {
    const [marketing] = await db.insert(marketingAnalytics).values(marketingData as any).returning();
    return marketing;
  }
  
  async updateMarketingAnalytic(id: number, marketingData: Partial<MarketingAnalytics>): Promise<MarketingAnalytics | undefined> {
    const [updatedMarketing] = await db
      .update(marketingAnalytics)
      .set({ ...marketingData, updatedAt: new Date() })
      .where(eq(marketingAnalytics.id, id))
      .returning();
    return updatedMarketing;
  }
  
  async deleteMarketingAnalytic(id: number): Promise<boolean> {
    await db.delete(marketingAnalytics).where(eq(marketingAnalytics.id, id));
    return true;
  }
  
  // Analytics Reports operations
  async getAnalyticsReports(): Promise<AnalyticsReport[]> {
    return db.select().from(analyticsReports).orderBy(desc(analyticsReports.createdAt));
  }
  
  async getAnalyticsReport(id: number): Promise<AnalyticsReport | undefined> {
    const [report] = await db.select().from(analyticsReports).where(eq(analyticsReports.id, id));
    return report;
  }
  
  async createAnalyticsReport(reportData: InsertAnalyticsReport): Promise<AnalyticsReport> {
    const [report] = await db.insert(analyticsReports).values(reportData).returning();
    return report;
  }
  
  async updateAnalyticsReport(id: number, reportData: Partial<AnalyticsReport>): Promise<AnalyticsReport | undefined> {
    const [updatedReport] = await db
      .update(analyticsReports)
      .set({ ...reportData, updatedAt: new Date() })
      .where(eq(analyticsReports.id, id))
      .returning();
    return updatedReport;
  }
  
  async deleteAnalyticsReport(id: number): Promise<boolean> {
    await db.delete(analyticsReports).where(eq(analyticsReports.id, id));
    return true;
  }
  
  // Additional Analytics API Endpoints
  
  // Revenue Analytics (aggregates income data)
  async getRevenueAnalytics(filters: { startDate?: string, endDate?: string, groupBy?: 'day' | 'week' | 'month' | 'year' }): Promise<any[]> {
    let query;
    
    if (filters.groupBy === 'day') {
      query = sql`SELECT DATE(date) as period, SUM(CAST(amount AS DECIMAL)) as revenue 
                 FROM income 
                 WHERE ${filters.startDate && filters.endDate ? 
                   sql`date BETWEEN ${filters.startDate} AND ${filters.endDate}` : 
                   sql`1=1`}
                 GROUP BY DATE(date)
                 ORDER BY period DESC`;
    } else if (filters.groupBy === 'week') {
      query = sql`SELECT DATE_TRUNC('week', date::date) as period, SUM(CAST(amount AS DECIMAL)) as revenue 
                 FROM income 
                 WHERE ${filters.startDate && filters.endDate ? 
                   sql`date BETWEEN ${filters.startDate} AND ${filters.endDate}` : 
                   sql`1=1`}
                 GROUP BY DATE_TRUNC('week', date::date)
                 ORDER BY period DESC`;
    } else if (filters.groupBy === 'month') {
      query = sql`SELECT DATE_TRUNC('month', date::date) as period, SUM(CAST(amount AS DECIMAL)) as revenue 
                 FROM income 
                 WHERE ${filters.startDate && filters.endDate ? 
                   sql`date BETWEEN ${filters.startDate} AND ${filters.endDate}` : 
                   sql`1=1`}
                 GROUP BY DATE_TRUNC('month', date::date)
                 ORDER BY period DESC`;
    } else {
      query = sql`SELECT DATE_TRUNC('year', date::date) as period, SUM(CAST(amount AS DECIMAL)) as revenue 
                 FROM income 
                 WHERE ${filters.startDate && filters.endDate ? 
                   sql`date BETWEEN ${filters.startDate} AND ${filters.endDate}` : 
                   sql`1=1`}
                 GROUP BY DATE_TRUNC('year', date::date)
                 ORDER BY period DESC`;
    }
    
    return db.execute(query);
  }
  
  // Conversion Analytics (calculates marketing channel conversion rates)
  async getConversionAnalytics(filters: { startDate?: string, endDate?: string, channel?: string }): Promise<any[]> {
    const query = sql`
      SELECT 
        m.channel,
        SUM(m.impressions) as total_impressions,
        SUM(m.clicks) as total_clicks,
        SUM(m.leads) as total_leads,
        COUNT(DISTINCT p.id) as conversions,
        CASE WHEN SUM(m.impressions) > 0 THEN 
          ROUND((SUM(m.clicks)::decimal / SUM(m.impressions)) * 100, 2)
        ELSE 0 END as ctr,
        CASE WHEN SUM(m.clicks) > 0 THEN 
          ROUND((SUM(m.leads)::decimal / SUM(m.clicks)) * 100, 2)
        ELSE 0 END as lead_rate,
        CASE WHEN SUM(m.leads) > 0 THEN 
          ROUND((COUNT(DISTINCT p.id)::decimal / SUM(m.leads)) * 100, 2)
        ELSE 0 END as conversion_rate
      FROM 
        marketing_analytics m
      LEFT JOIN 
        project_analytics p ON p.marketing_source = m.channel 
        AND p.created_at::date >= m.date::date
        AND p.created_at::date <= (m.date::date + INTERVAL '30 days')
      WHERE 
        ${filters.channel ? sql`m.channel = ${filters.channel} AND` : sql``}
        ${filters.startDate && filters.endDate ? 
          sql`m.date BETWEEN ${filters.startDate} AND ${filters.endDate}` : 
          sql`1=1`}
      GROUP BY 
        m.channel
      ORDER BY 
        conversions DESC
    `;
    
    return db.execute(query);
  }
  
  // ROI Analytics (calculates return on investment for marketing channels)
  async getROIAnalytics(filters: { startDate?: string, endDate?: string, channel?: string }): Promise<any[]> {
    const query = sql`
      WITH marketing_costs AS (
        SELECT 
          channel,
          SUM(CAST(spend AS DECIMAL)) as total_cost
        FROM 
          marketing_analytics
        WHERE 
          ${filters.channel ? sql`channel = ${filters.channel} AND` : sql``}
          ${filters.startDate && filters.endDate ? 
            sql`date BETWEEN ${filters.startDate} AND ${filters.endDate}` : 
            sql`1=1`}
        GROUP BY 
          channel
      ),
      channel_revenue AS (
        SELECT 
          p.marketing_source as channel,
          SUM(CAST(p.revenue AS DECIMAL)) as total_revenue
        FROM 
          project_analytics p
        WHERE 
          ${filters.channel ? sql`p.marketing_source = ${filters.channel} AND` : sql``}
          ${filters.startDate && filters.endDate ? 
            sql`p.created_at BETWEEN ${filters.startDate} AND ${filters.endDate}` : 
            sql`1=1`}
        GROUP BY 
          p.marketing_source
      )
      SELECT 
        m.channel,
        COALESCE(m.total_cost, 0) as cost,
        COALESCE(r.total_revenue, 0) as revenue,
        CASE 
          WHEN COALESCE(m.total_cost, 0) > 0 THEN 
            ROUND(((COALESCE(r.total_revenue, 0) - COALESCE(m.total_cost, 0)) / COALESCE(m.total_cost, 0)) * 100, 2)
          ELSE 0 
        END as roi_percent
      FROM 
        marketing_costs m
      FULL OUTER JOIN 
        channel_revenue r ON m.channel = r.channel
      ORDER BY 
        roi_percent DESC
    `;
    
    return db.execute(query);
  }
  
  // Equipment Usage Analytics
  async getEquipmentUsageAnalytics(filters: { startDate?: string, endDate?: string, droneId?: number }): Promise<any[]> {
    const query = sql`
      SELECT 
        d.id as drone_id,
        d.drone_name,
        d.drone_model,
        COUNT(f.id) as total_flights,
        SUM(EXTRACT(EPOCH FROM (f.end_time - f.start_time)) / 3600) as total_flight_hours,
        COUNT(DISTINCT f.project_id) as projects_used,
        ROUND(AVG(EXTRACT(EPOCH FROM (f.end_time - f.start_time)) / 60), 2) as avg_flight_time_minutes,
        COUNT(CASE WHEN f.issues IS NOT NULL THEN 1 END) as flights_with_issues,
        SUM(CASE WHEN f.successful = TRUE THEN 1 ELSE 0 END) as successful_flights,
        ROUND((SUM(CASE WHEN f.successful = TRUE THEN 1 ELSE 0 END)::decimal / COUNT(f.id)) * 100, 2) as success_rate
      FROM 
        drone_analytics d
      LEFT JOIN 
        flight_logs f ON d.id = f.drone_id
      WHERE 
        ${filters.droneId ? sql`d.id = ${filters.droneId} AND` : sql``}
        ${filters.startDate && filters.endDate ? 
          sql`f.flight_date BETWEEN ${filters.startDate} AND ${filters.endDate}` : 
          sql`f.flight_date IS NOT NULL`}
      GROUP BY 
        d.id, d.drone_name, d.drone_model
      ORDER BY 
        total_flight_hours DESC
    `;
    
    return db.execute(query);
  }
  
  // Maintenance History
  async getMaintenanceHistory(filters: { droneId?: number, startDate?: string, endDate?: string }): Promise<any[]> {
    const query = sql`
      SELECT 
        d.id as drone_id,
        d.drone_name,
        d.maintenance_history->>'date' as maintenance_date,
        d.maintenance_history->>'type' as maintenance_type,
        d.maintenance_history->>'description' as description,
        d.maintenance_history->>'cost' as cost,
        d.maintenance_history->>'technician' as technician,
        d.maintenance_history->>'parts_replaced' as parts_replaced
      FROM 
        drone_analytics d,
        jsonb_array_elements(CASE WHEN d.maintenance_history IS NULL THEN '[]'::jsonb ELSE d.maintenance_history END) as maintenance_history
      WHERE 
        ${filters.droneId ? sql`d.id = ${filters.droneId} AND` : sql``}
        ${filters.startDate ? 
          sql`(maintenance_history->>'date')::date >= ${filters.startDate}::date AND` : 
          sql``}
        ${filters.endDate ? 
          sql`(maintenance_history->>'date')::date <= ${filters.endDate}::date` : 
          sql`1=1`}
      ORDER BY 
        (maintenance_history->>'date')::date DESC
    `;
    
    return db.execute(query);
  }
  
  // Project Success Metrics
  async getProjectSuccessMetrics(filters: { startDate?: string, endDate?: string, serviceType?: string }): Promise<any[]> {
    const query = sql`
      SELECT 
        service_type,
        COUNT(*) as total_projects,
        ROUND(AVG(CAST(client_satisfaction AS DECIMAL)), 2) as avg_satisfaction,
        ROUND(AVG(CAST(profit_margin AS DECIMAL)) * 100, 2) as avg_profit_margin,
        ROUND(AVG(EXTRACT(EPOCH FROM (completion_date::timestamp - created_at::timestamp)) / 86400), 2) as avg_completion_days,
        COUNT(CASE WHEN completed_on_time = TRUE THEN 1 END) as on_time_projects,
        ROUND((COUNT(CASE WHEN completed_on_time = TRUE THEN 1 END)::decimal / COUNT(*)) * 100, 2) as on_time_rate,
        COUNT(CASE WHEN within_budget = TRUE THEN 1 END) as within_budget_projects,
        ROUND((COUNT(CASE WHEN within_budget = TRUE THEN 1 END)::decimal / COUNT(*)) * 100, 2) as within_budget_rate
      FROM 
        project_analytics
      WHERE 
        ${filters.serviceType ? sql`service_type = ${filters.serviceType} AND` : sql``}
        ${filters.startDate && filters.endDate ? 
          sql`created_at BETWEEN ${filters.startDate} AND ${filters.endDate}` : 
          sql`1=1`}
      GROUP BY 
        service_type
      ORDER BY 
        total_projects DESC
    `;
    
    return db.execute(query);
  }
  
  // Client Retention Data
  async getClientRetentionData(filters: { startDate?: string, endDate?: string }): Promise<any[]> {
    const query = sql`
      WITH client_projects AS (
        SELECT 
          c.user_id,
          c.client_name,
          MIN(p.created_at) as first_project_date,
          MAX(p.created_at) as last_project_date,
          COUNT(p.id) as project_count,
          SUM(CAST(p.revenue AS DECIMAL)) as total_revenue
        FROM 
          client_analytics c
        JOIN 
          project_analytics p ON c.user_id = p.client_id
        WHERE 
          ${filters.startDate && filters.endDate ? 
            sql`p.created_at BETWEEN ${filters.startDate} AND ${filters.endDate}` : 
            sql`1=1`}
        GROUP BY 
          c.user_id, c.client_name
      )
      SELECT 
        client_name,
        project_count,
        total_revenue,
        CASE 
          WHEN project_count = 1 THEN 'One-time'
          WHEN project_count = 2 THEN 'Returning'
          WHEN project_count >= 3 THEN 'Loyal'
        END as client_category,
        first_project_date,
        last_project_date,
        ROUND(EXTRACT(EPOCH FROM (last_project_date - first_project_date)) / 86400, 0) as days_between_first_last,
        ROUND(total_revenue / project_count, 2) as average_project_value
      FROM 
        client_projects
      ORDER BY 
        project_count DESC, total_revenue DESC
    `;
    
    return db.execute(query);
  }
  
  // Geographic Distribution
  async getGeographicDistribution(filters: { startDate?: string, endDate?: string }): Promise<any[]> {
    const query = sql`
      SELECT 
        location,
        COUNT(*) as project_count,
        SUM(CAST(revenue AS DECIMAL)) as total_revenue,
        ROUND(AVG(CAST(client_satisfaction AS DECIMAL)), 2) as avg_satisfaction
      FROM 
        project_analytics
      WHERE 
        location IS NOT NULL AND
        ${filters.startDate && filters.endDate ? 
          sql`created_at BETWEEN ${filters.startDate} AND ${filters.endDate}` : 
          sql`1=1`}
      GROUP BY 
        location
      ORDER BY 
        project_count DESC
    `;
    
    return db.execute(query);
  }
  
  // Custom Report Generation
  async generateCustomReport(params: {
    metrics: string[], // 'revenue', 'profit', 'client_satisfaction', etc.
    dimensions: string[], // 'service_type', 'client_id', 'location', etc.
    filters: { [key: string]: any },
    startDate?: string,
    endDate?: string,
    limit?: number
  }): Promise<any[]> {
    // Validate and sanitize metrics and dimensions to prevent SQL injection
    const validMetrics = [
      'revenue', 'cost', 'profit', 'profit_margin', 'client_satisfaction',
      'equipment_cost', 'flight_time', 'completion_time', 'completed_on_time', 'within_budget'
    ];
    
    const validDimensions = [
      'service_type', 'client_id', 'client_name', 'drone_id', 'drone_name',
      'location', 'marketing_source', 'year', 'month', 'quarter'
    ];
    
    const metrics = params.metrics.filter(m => validMetrics.includes(m));
    const dimensions = params.dimensions.filter(d => validDimensions.includes(d));
    
    if (metrics.length === 0 || dimensions.length === 0) {
      return [];
    }
    
    // Build SQL select, group by, and date filtering
    const selectClauses: string[] = [];
    const groupByClauses: string[] = [];
    
    dimensions.forEach(dim => {
      if (dim === 'year') {
        selectClauses.push(`EXTRACT(YEAR FROM created_at) as year`);
        groupByClauses.push(`EXTRACT(YEAR FROM created_at)`);
      } else if (dim === 'month') {
        selectClauses.push(`EXTRACT(MONTH FROM created_at) as month`);
        groupByClauses.push(`EXTRACT(MONTH FROM created_at)`);
      } else if (dim === 'quarter') {
        selectClauses.push(`EXTRACT(QUARTER FROM created_at) as quarter`);
        groupByClauses.push(`EXTRACT(QUARTER FROM created_at)`);
      } else if (dim === 'client_name') {
        selectClauses.push(`c.client_name`);
        groupByClauses.push(`c.client_name`);
      } else {
        selectClauses.push(`p.${dim}`);
        groupByClauses.push(`p.${dim}`);
      }
    });
    
    metrics.forEach(metric => {
      if (metric === 'revenue' || metric === 'cost' || metric === 'profit' || metric === 'equipment_cost') {
        selectClauses.push(`SUM(CAST(p.${metric} AS DECIMAL)) as ${metric}`);
      } else if (metric === 'profit_margin' || metric === 'client_satisfaction') {
        selectClauses.push(`ROUND(AVG(CAST(p.${metric} AS DECIMAL)), 2) as ${metric}`);
      } else if (metric === 'flight_time') {
        selectClauses.push(`SUM(CAST(p.flight_time AS DECIMAL)) as flight_time`);
      } else if (metric === 'completion_time') {
        selectClauses.push(`ROUND(AVG(EXTRACT(EPOCH FROM (p.completion_date - p.created_at)) / 86400), 2) as avg_completion_days`);
      } else if (metric === 'completed_on_time' || metric === 'within_budget') {
        selectClauses.push(`COUNT(CASE WHEN p.${metric} = TRUE THEN 1 END) as ${metric}_count`);
        selectClauses.push(`ROUND((COUNT(CASE WHEN p.${metric} = TRUE THEN 1 END)::decimal / COUNT(*)) * 100, 2) as ${metric}_rate`);
      }
    });
    
    // Add count of projects
    selectClauses.push(`COUNT(*) as project_count`);
    
    // Build filter conditions
    const filterConditions: string[] = [];
    
    if (params.startDate && params.endDate) {
      filterConditions.push(`p.created_at BETWEEN '${params.startDate}' AND '${params.endDate}'`);
    }
    
    Object.entries(params.filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        filterConditions.push(`p.${key} = '${value}'`);
      }
    });
    
    // Build and execute the query
    let queryStr = `
      SELECT 
        ${selectClauses.join(', ')}
      FROM 
        project_analytics p
    `;
    
    // Add joins if needed
    if (dimensions.includes('client_name')) {
      queryStr += `LEFT JOIN client_analytics c ON p.client_id = c.user_id `;
    }
    
    if (filterConditions.length > 0) {
      queryStr += `WHERE ${filterConditions.join(' AND ')} `;
    }
    
    if (groupByClauses.length > 0) {
      queryStr += `GROUP BY ${groupByClauses.join(', ')} `;
    }
    
    // Add ordering
    queryStr += `ORDER BY project_count DESC `;
    
    // Add limit if specified
    if (params.limit) {
      queryStr += `LIMIT ${params.limit}`;
    }
    
    const query = sql.raw(queryStr);
    return db.execute(query);
  }

  // Department operations
  async getDepartments(): Promise<Department[]> {
    return db.select().from(departments).orderBy(asc(departments.name));
  }

  async getDepartment(id: number): Promise<Department | undefined> {
    const [department] = await db.select().from(departments).where(eq(departments.id, id));
    return department;
  }

  async createDepartment(departmentData: InsertDepartment): Promise<Department> {
    const [department] = await db.insert(departments).values(departmentData).returning();
    return department;
  }

  async updateDepartment(id: number, departmentData: Partial<Department>): Promise<Department | undefined> {
    const [updatedDepartment] = await db
      .update(departments)
      .set({ ...departmentData, updatedAt: new Date() })
      .where(eq(departments.id, id))
      .returning();
    return updatedDepartment;
  }

  async deleteDepartment(id: number): Promise<boolean> {
    await db.delete(departments).where(eq(departments.id, id));
    return true;
  }

  // Employee operations
  async getEmployees(): Promise<Employee[]> {
    return db.select().from(employees).orderBy(asc(employees.lastName));
  }

  async getEmployee(id: number): Promise<Employee | undefined> {
    const [employee] = await db.select().from(employees).where(eq(employees.id, id));
    return employee;
  }

  async getEmployeeByUserId(userId: number): Promise<Employee | undefined> {
    const [employee] = await db.select().from(employees).where(eq(employees.userId, userId));
    return employee;
  }

  async createEmployee(employeeData: InsertEmployee): Promise<Employee> {
    const [employee] = await db.insert(employees).values(employeeData).returning();
    return employee;
  }

  async updateEmployee(id: number, employeeData: Partial<Employee>): Promise<Employee | undefined> {
    const [updatedEmployee] = await db
      .update(employees)
      .set({ ...employeeData, updatedAt: new Date() })
      .where(eq(employees.id, id))
      .returning();
    return updatedEmployee;
  }

  async deleteEmployee(id: number): Promise<boolean> {
    await db.delete(employees).where(eq(employees.id, id));
    return true;
  }

  // PayrollPeriod operations
  async getPayrollPeriods(): Promise<PayrollPeriod[]> {
    return db.select().from(payrollPeriods).orderBy(desc(payrollPeriods.periodStart));
  }

  async getPayrollPeriod(id: number): Promise<PayrollPeriod | undefined> {
    const [period] = await db.select().from(payrollPeriods).where(eq(payrollPeriods.id, id));
    return period;
  }

  async createPayrollPeriod(periodData: InsertPayrollPeriod): Promise<PayrollPeriod> {
    const [period] = await db.insert(payrollPeriods).values(periodData).returning();
    return period;
  }

  async updatePayrollPeriod(id: number, periodData: Partial<PayrollPeriod>): Promise<PayrollPeriod | undefined> {
    const [updatedPeriod] = await db
      .update(payrollPeriods)
      .set({ ...periodData, updatedAt: new Date() })
      .where(eq(payrollPeriods.id, id))
      .returning();
    return updatedPeriod;
  }

  async deletePayrollPeriod(id: number): Promise<boolean> {
    await db.delete(payrollPeriods).where(eq(payrollPeriods.id, id));
    return true;
  }

  // PayrollEntry operations
  async getPayrollEntries(payrollPeriodId?: number): Promise<PayrollEntry[]> {
    if (payrollPeriodId) {
      return db
        .select()
        .from(payrollEntries)
        .where(eq(payrollEntries.payrollPeriodId, payrollPeriodId))
        .orderBy(asc(payrollEntries.employeeId));
    }
    return db.select().from(payrollEntries).orderBy(desc(payrollEntries.updatedAt));
  }

  async getPayrollEntry(id: number): Promise<PayrollEntry | undefined> {
    const [entry] = await db.select().from(payrollEntries).where(eq(payrollEntries.id, id));
    return entry;
  }

  async getEmployeePayrollEntries(employeeId: number): Promise<PayrollEntry[]> {
    return db
      .select()
      .from(payrollEntries)
      .where(eq(payrollEntries.employeeId, employeeId))
      .orderBy(desc(payrollEntries.updatedAt));
  }

  async createPayrollEntry(entryData: InsertPayrollEntry): Promise<PayrollEntry> {
    const [entry] = await db.insert(payrollEntries).values(entryData).returning();
    return entry;
  }

  async updatePayrollEntry(id: number, entryData: Partial<PayrollEntry>): Promise<PayrollEntry | undefined> {
    const [updatedEntry] = await db
      .update(payrollEntries)
      .set({ ...entryData, updatedAt: new Date() })
      .where(eq(payrollEntries.id, id))
      .returning();
    return updatedEntry;
  }

  async deletePayrollEntry(id: number): Promise<boolean> {
    await db.delete(payrollEntries).where(eq(payrollEntries.id, id));
    return true;
  }

  // TimeEntry operations
  async getTimeEntries(filters?: { employeeId?: number, projectId?: number, startDate?: string, endDate?: string }): Promise<TimeEntry[]> {
    let query = db.select().from(timeEntries);
    
    if (filters) {
      if (filters.employeeId) {
        query = query.where(eq(timeEntries.employeeId, filters.employeeId));
      }
      
      if (filters.projectId) {
        query = query.where(eq(timeEntries.projectAnalyticsId, filters.projectId));
      }
      
      if (filters.startDate) {
        query = query.where(gte(timeEntries.entryDate, filters.startDate));
      }
      
      if (filters.endDate) {
        query = query.where(lte(timeEntries.entryDate, filters.endDate));
      }
    }
    
    return query.orderBy(desc(timeEntries.entryDate));
  }

  async getTimeEntry(id: number): Promise<TimeEntry | undefined> {
    const [entry] = await db.select().from(timeEntries).where(eq(timeEntries.id, id));
    return entry;
  }

  async createTimeEntry(entryData: InsertTimeEntry): Promise<TimeEntry> {
    const [entry] = await db.insert(timeEntries).values(entryData).returning();
    return entry;
  }

  async updateTimeEntry(id: number, entryData: Partial<TimeEntry>): Promise<TimeEntry | undefined> {
    const [updatedEntry] = await db
      .update(timeEntries)
      .set({ ...entryData, updatedAt: new Date() })
      .where(eq(timeEntries.id, id))
      .returning();
    return updatedEntry;
  }

  async deleteTimeEntry(id: number): Promise<boolean> {
    await db.delete(timeEntries).where(eq(timeEntries.id, id));
    return true;
  }

  // Notification operations
  async getUserNotifications(userId: number): Promise<Notification[]> {
    return db.select().from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt));
  }

  async getUserUnreadNotificationsCount(userId: number): Promise<number> {
    const unreadNotifications = await db.select({ count: sql<number>`count(*)` })
      .from(notifications)
      .where(and(
        eq(notifications.userId, userId),
        eq(notifications.isRead, false)
      ));
    
    return unreadNotifications[0]?.count || 0;
  }

  async getNotification(id: number): Promise<Notification | undefined> {
    const [notification] = await db.select().from(notifications).where(eq(notifications.id, id));
    return notification;
  }

  async createNotification(notification: InsertNotification): Promise<Notification> {
    const [newNotification] = await db.insert(notifications).values(notification).returning();
    return newNotification;
  }

  async markNotificationAsRead(id: number): Promise<Notification | undefined> {
    const [updatedNotification] = await db.update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.id, id))
      .returning();
    
    return updatedNotification;
  }

  async markAllNotificationsAsRead(userId: number): Promise<boolean> {
    await db.update(notifications)
      .set({ isRead: true })
      .where(and(
        eq(notifications.userId, userId),
        eq(notifications.isRead, false)
      ));
    
    return true;
  }

  async deleteNotification(id: number): Promise<boolean> {
    await db.delete(notifications).where(eq(notifications.id, id));
    return true;
  }

  // Email Campaign operations
  async getEmailCampaigns(): Promise<EmailCampaign[]> {
    return await db.select().from(emailCampaigns).orderBy(desc(emailCampaigns.createdAt));
  }

  async getEmailCampaign(id: number): Promise<EmailCampaign | undefined> {
    const [campaign] = await db.select().from(emailCampaigns).where(eq(emailCampaigns.id, id));
    return campaign;
  }

  async createEmailCampaign(campaign: InsertEmailCampaign): Promise<EmailCampaign> {
    const [newCampaign] = await db.insert(emailCampaigns).values(campaign).returning();
    return newCampaign;
  }

  async updateEmailCampaign(id: number, campaign: Partial<InsertEmailCampaign>): Promise<EmailCampaign | undefined> {
    const [updatedCampaign] = await db.update(emailCampaigns)
      .set({ ...campaign, updatedAt: new Date() })
      .where(eq(emailCampaigns.id, id))
      .returning();
    return updatedCampaign;
  }

  async deleteEmailCampaign(id: number): Promise<boolean> {
    await db.delete(emailCampaigns).where(eq(emailCampaigns.id, id));
    return true;
  }

  // Lead Score operations
  async getLeadScores(): Promise<LeadScore[]> {
    return await db.select().from(leadScores).orderBy(desc(leadScores.score));
  }

  async getLeadScore(customerId: number): Promise<LeadScore | undefined> {
    const [score] = await db.select().from(leadScores).where(eq(leadScores.customerId, customerId));
    return score;
  }

  async createLeadScore(leadScore: InsertLeadScore): Promise<LeadScore> {
    const [newScore] = await db.insert(leadScores).values(leadScore).returning();
    return newScore;
  }

  async updateLeadScore(id: number, leadScore: Partial<InsertLeadScore>): Promise<LeadScore | undefined> {
    const [updatedScore] = await db.update(leadScores)
      .set({ ...leadScore, updatedAt: new Date() })
      .where(eq(leadScores.id, id))
      .returning();
    return updatedScore;
  }

  async calculateLeadScore(customerId: number): Promise<LeadScore> {
    const customer = await this.getCustomer(customerId);
    if (!customer) {
      throw new Error("Customer not found");
    }

    const interactions = await this.getCustomerInteractions(customerId);
    const deals = await this.getCustomerDeals({ customerId });
    const bookings = await this.getCustomerBookings(customerId);

    let engagementScore = 0;
    let fitScore = 0;
    let behaviorScore = 0;

    engagementScore += Math.min(interactions.length * 5, 30);
    engagementScore += Math.min(bookings.length * 10, 30);

    if (customer.company) fitScore += 15;
    if (customer.email) fitScore += 10;
    if (customer.phone) fitScore += 10;

    const completedDeals = deals.filter(d => d.stage === 'closed_won');
    behaviorScore += Math.min(completedDeals.length * 15, 30);
    behaviorScore += Math.min(deals.length * 5, 20);

    const totalScore = Math.min(engagementScore + fitScore + behaviorScore, 100);

    let grade = 'D';
    if (totalScore >= 80) grade = 'A';
    else if (totalScore >= 60) grade = 'B';
    else if (totalScore >= 40) grade = 'C';

    const conversionProbability = Math.round(totalScore * 0.8);

    const existingScore = await this.getLeadScore(customerId);

    if (existingScore) {
      return await this.updateLeadScore(existingScore.id, {
        score: totalScore,
        grade,
        engagementScore,
        fitScore,
        behaviorScore,
        conversionProbability,
        lastActivityDate: new Date()
      }) as LeadScore;
    } else {
      return await this.createLeadScore({
        customerId,
        score: totalScore,
        grade,
        engagementScore,
        fitScore,
        behaviorScore,
        conversionProbability,
        lastActivityDate: new Date()
      });
    }
  }

  // CRM operations

  // Booking Feedback operations
  async saveBookingFeedback(bookingId: number, feedbackData: BookingFeedback): Promise<Booking | undefined> {
    const [updatedBooking] = await db
      .update(bookings)
      .set({
        rating: feedbackData.rating || null,
        feedback: feedbackData.feedback || null,
        feedbackSubmittedAt: feedbackData.submittedAt ? new Date(feedbackData.submittedAt) : null,
        feedbackSubmitted: feedbackData.feedbackSubmitted || false
      })
      .where(eq(bookings.id, bookingId))
      .returning();
    
    return updatedBooking;
  }

  // Customer operations
  async getCustomers(filters?: { status?: string, assignedTo?: number }): Promise<Customer[]> {
    let query = db.select().from(customers);
    
    if (filters) {
      if (filters.status) {
        query = query.where(eq(customers.status, filters.status));
      }
      
      if (filters.assignedTo) {
        query = query.where(eq(customers.assignedTo, filters.assignedTo));
      }
    }
    
    return query.orderBy(desc(customers.createdAt));
  }
  
  async getCustomer(id: number): Promise<Customer | undefined> {
    const [customer] = await db.select().from(customers).where(eq(customers.id, id));
    return customer;
  }
  
  // Alias for getCustomer for better readability
  async getCustomerById(id: number): Promise<Customer | undefined> {
    return this.getCustomer(id);
  }
  
  async getCustomerByEmail(email: string): Promise<Customer | undefined> {
    const [customer] = await db.select().from(customers).where(eq(customers.email, email));
    return customer;
  }
  
  async getCustomerByUserId(userId: number, createIfNotExists: boolean = false): Promise<Customer | undefined> {
    console.log(`DatabaseStorage: getCustomerByUserId called with userId: ${userId}, createIfNotExists: ${createIfNotExists}`);
    
    // Special case: Check if this userId is actually a customer ID
    // This handles the case where a user logs in as a customer but doesn't exist in users table
    const [customerById] = await db.select().from(customers).where(eq(customers.id, userId));
    if (customerById) {
      console.log(`DatabaseStorage: Found customer directly with ID ${userId}, returning it directly`);
      return customerById;
    }
    
    // First try to find existing customer
    const [customer] = await db.select().from(customers).where(eq(customers.userId, userId));
    console.log(`DatabaseStorage: Customer lookup result for user ${userId}:`, customer ? `Found customer ID: ${customer.id}` : 'No customer found');
    
    // If customer exists or we don't want to create one, return result
    if (customer || !createIfNotExists) {
      return customer;
    }
    
    // Customer not found, create one if requested
    try {
      console.log(`Creating customer record for user ID: ${userId}`);
      
      // Get user data
      const user = await this.getUser(userId);
      console.log(`DatabaseStorage: User lookup for ID ${userId} result:`, user ? `Found user ${user.username}` : 'User not found');
      
      if (!user) {
        console.log(`Failed to create customer - user ${userId} not found`);
        return undefined;
      }
      
      // Check if this user is already a customer (from the customers table)
      // In this case, we don't want to create a new customer record with a foreign key
      const [userFromUsersTable] = await db.select().from(users).where(eq(users.id, userId));
      if (!userFromUsersTable) {
        console.log(`User ID ${userId} is not in users table, assuming it's a customer ID`);
        return customerById; // We already checked this above, but just to be safe
      }
      
      // Create new customer with user data
      const newCustomer = await this.createCustomer({
        userId: user.id,
        firstName: user.firstName || user.username || '',
        lastName: user.lastName || '',
        email: user.email || `user-${user.id}@example.com`,
        phone: '',
        status: 'active',
        source: 'auto-created',
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      console.log(`Successfully created customer ID: ${newCustomer.id} for user ID: ${userId}`);
      return newCustomer;
    } catch (error) {
      console.error(`Error creating customer for user ID ${userId}:`, error);
      return undefined;
    }
  }
  
  async createCustomer(customerData: InsertCustomer): Promise<Customer> {
    const [customer] = await db.insert(customers).values(customerData).returning();
    return customer;
  }
  
  async updateCustomer(id: number, customerData: Partial<Customer>): Promise<Customer | undefined> {
    const [updatedCustomer] = await db
      .update(customers)
      .set({ ...customerData, updatedAt: new Date() })
      .where(eq(customers.id, id))
      .returning();
    return updatedCustomer;
  }
  
  async deleteCustomer(id: number): Promise<boolean> {
    await db.delete(customers).where(eq(customers.id, id));
    return true;
  }
  
  // Customer interactions operations
  async getCustomerInteractions(customerId: number): Promise<CustomerInteraction[]> {
    // If customerId is 0, return all interactions
    if (customerId === 0) {
      return db
        .select()
        .from(customerInteractions)
        .orderBy(desc(customerInteractions.createdAt));
    }
    // Otherwise, return interactions for the specified customer
    return db
      .select()
      .from(customerInteractions)
      .where(eq(customerInteractions.customerId, customerId))
      .orderBy(desc(customerInteractions.createdAt));
  }
  
  async getCustomerInteraction(id: number): Promise<CustomerInteraction | undefined> {
    const [interaction] = await db.select().from(customerInteractions).where(eq(customerInteractions.id, id));
    return interaction;
  }
  
  async createCustomerInteraction(interactionData: InsertCustomerInteraction): Promise<CustomerInteraction> {
    const [interaction] = await db.insert(customerInteractions).values(interactionData).returning();
    return interaction;
  }
  
  async updateCustomerInteraction(id: number, interactionData: Partial<CustomerInteraction>): Promise<CustomerInteraction | undefined> {
    const [updatedInteraction] = await db
      .update(customerInteractions)
      .set({ ...interactionData, updatedAt: new Date() })
      .where(eq(customerInteractions.id, id))
      .returning();
    return updatedInteraction;
  }
  
  async deleteCustomerInteraction(id: number): Promise<boolean> {
    await db.delete(customerInteractions).where(eq(customerInteractions.id, id));
    return true;
  }
  
  // Customer deals operations
  async getCustomerDeals(filters?: { customerId?: number, stage?: string }): Promise<CustomerDeal[]> {
    let query = db.select().from(customerDeals);
    
    if (filters) {
      if (filters.customerId) {
        query = query.where(eq(customerDeals.customerId, filters.customerId));
      }
      
      if (filters.stage) {
        query = query.where(eq(customerDeals.stage, filters.stage));
      }
    }
    
    return query.orderBy(desc(customerDeals.createdAt));
  }
  
  async getCustomerDeal(id: number): Promise<CustomerDeal | undefined> {
    const [deal] = await db.select().from(customerDeals).where(eq(customerDeals.id, id));
    return deal;
  }
  
  async createCustomerDeal(dealData: InsertCustomerDeal): Promise<CustomerDeal> {
    const [deal] = await db.insert(customerDeals).values(dealData).returning();
    return deal;
  }
  
  async updateCustomerDeal(id: number, dealData: Partial<CustomerDeal>): Promise<CustomerDeal | undefined> {
    const [updatedDeal] = await db
      .update(customerDeals)
      .set({ ...dealData, updatedAt: new Date() })
      .where(eq(customerDeals.id, id))
      .returning();
    return updatedDeal;
  }
  
  async deleteCustomerDeal(id: number): Promise<boolean> {
    await db.delete(customerDeals).where(eq(customerDeals.id, id));
    return true;
  }
  
  // Customer tasks operations
  async getCustomerTasks(filters?: { customerId?: number, assignedTo?: number, status?: string }): Promise<CustomerTask[]> {
    let query = db.select().from(customerTasks);
    
    if (filters) {
      if (filters.customerId) {
        query = query.where(eq(customerTasks.customerId, filters.customerId));
      }
      
      if (filters.assignedTo) {
        query = query.where(eq(customerTasks.assignedTo, filters.assignedTo));
      }
      
      if (filters.status) {
        query = query.where(eq(customerTasks.status, filters.status));
      }
    }
    
    return query.orderBy(desc(customerTasks.createdAt));
  }
  
  async getCustomerTask(id: number): Promise<CustomerTask | undefined> {
    const [task] = await db.select().from(customerTasks).where(eq(customerTasks.id, id));
    return task;
  }
  
  async createCustomerTask(taskData: InsertCustomerTask): Promise<CustomerTask> {
    const [task] = await db.insert(customerTasks).values(taskData).returning();
    return task;
  }
  
  async updateCustomerTask(id: number, taskData: Partial<CustomerTask>): Promise<CustomerTask | undefined> {
    const [updatedTask] = await db
      .update(customerTasks)
      .set({ ...taskData, updatedAt: new Date() })
      .where(eq(customerTasks.id, id))
      .returning();
    return updatedTask;
  }
  
  async deleteCustomerTask(id: number): Promise<boolean> {
    await db.delete(customerTasks).where(eq(customerTasks.id, id));
    return true;
  }

  // Client Projects operations
  async getAllClientProjects(): Promise<ClientProject[]> {
    return await db.select().from(clientProjects).orderBy(clientProjects.createdAt);
  }

  async getClientProject(id: number): Promise<ClientProject | undefined> {
    const result = await db.select().from(clientProjects).where(eq(clientProjects.id, id));
    return result[0];
  }

  async getClientProjectsByClientId(clientId: number): Promise<ClientProject[]> {
    return await db.select()
      .from(clientProjects)
      .where(eq(clientProjects.clientId, clientId))
      .orderBy(clientProjects.displayOrder);
  }

  async getClientProjectByNameAndClientId(projectName: string, clientId: number): Promise<ClientProject | undefined> {
    const result = await db.select()
      .from(clientProjects)
      .where(and(
        eq(clientProjects.clientId, clientId),
        eq(clientProjects.name, projectName)
      ));
    return result[0];
  }

  async createClientProject(projectData: InsertClientProject): Promise<ClientProject> {
    const [result] = await db.insert(clientProjects).values(projectData).returning();
    return result;
  }

  async updateClientProject(id: number, projectData: Partial<ClientProject>): Promise<ClientProject | undefined> {
    const [result] = await db.update(clientProjects)
      .set({ ...projectData, updatedAt: new Date() })
      .where(eq(clientProjects.id, id))
      .returning();
    return result;
  }

  async deleteClientProject(id: number): Promise<boolean> {
    await db.delete(clientProjects).where(eq(clientProjects.id, id));
    return true;
  }

  // Project Milestones operations
  async getProjectMilestones(projectId: number): Promise<ProjectMilestone[]> {
    return await db.select()
      .from(projectMilestones)
      .where(eq(projectMilestones.projectId, projectId))
      .orderBy(asc(projectMilestones.date));
  }
  
  async getProjectMilestone(id: number): Promise<ProjectMilestone | undefined> {
    const [milestone] = await db.select()
      .from(projectMilestones)
      .where(eq(projectMilestones.id, id));
    return milestone;
  }
  
  async createProjectMilestone(milestoneData: InsertProjectMilestone): Promise<ProjectMilestone> {
    const [milestone] = await db.insert(projectMilestones)
      .values(milestoneData)
      .returning();
    return milestone;
  }
  
  async updateProjectMilestone(id: number, milestoneData: Partial<ProjectMilestone>): Promise<ProjectMilestone | undefined> {
    const [updatedMilestone] = await db.update(projectMilestones)
      .set({
        ...milestoneData,
        updatedAt: new Date()
      })
      .where(eq(projectMilestones.id, id))
      .returning();
    return updatedMilestone;
  }
  
  async deleteProjectMilestone(id: number): Promise<boolean> {
    try {
      await db.delete(projectMilestones)
        .where(eq(projectMilestones.id, id));
      return true;
    } catch (error) {
      console.error('Error deleting project milestone:', error);
      return false;
    }
  }
  
  // Project Tasks operations
  async getProjectTasks(projectId: number): Promise<ProjectTask[]> {
    try {
      // Prioritize by priority and then by due date
      return await db.select()
        .from(projectTasks)
        .where(eq(projectTasks.projectId, projectId))
        .orderBy(
          sql`CASE 
            WHEN ${projectTasks.priority} = 'high' THEN 1 
            WHEN ${projectTasks.priority} = 'medium' THEN 2 
            WHEN ${projectTasks.priority} = 'low' THEN 3 
            ELSE 4 
          END`,
          asc(projectTasks.dueDate)
        );
    } catch (error) {
      console.error('Error fetching project tasks:', error);
      return [];
    }
  }
  
  async getProjectTask(id: number): Promise<ProjectTask | undefined> {
    try {
      const [task] = await db.select()
        .from(projectTasks)
        .where(eq(projectTasks.id, id));
      return task;
    } catch (error) {
      console.error('Error fetching project task:', error);
      return undefined;
    }
  }
  
  async createProjectTask(taskData: InsertProjectTask): Promise<ProjectTask> {
    try {
      const [task] = await db.insert(projectTasks)
        .values(taskData)
        .returning();
      return task;
    } catch (error) {
      console.error('Error creating project task:', error);
      throw error;
    }
  }
  
  async updateProjectTask(id: number, taskData: Partial<ProjectTask>): Promise<ProjectTask | undefined> {
    try {
      // If status is being updated to 'completed', set completedAt date
      let updatedData = { ...taskData };
      if (taskData.status === 'completed' && !taskData.completedAt) {
        updatedData.completedAt = new Date();
      }
      
      // Properly handle date fields
      if (updatedData.dueDate && typeof updatedData.dueDate === 'string') {
        updatedData.dueDate = new Date(updatedData.dueDate);
      }
      
      if (updatedData.completedAt && typeof updatedData.completedAt === 'string') {
        updatedData.completedAt = new Date(updatedData.completedAt);
      }
      
      // Filter out any invalid date values
      const sanitizedData = Object.fromEntries(
        Object.entries(updatedData).filter(([_, value]) => {
          // Keep all non-date values
          if (!(value instanceof Date) && (typeof value !== 'string' || !value.match(/^\d{4}-\d{2}-\d{2}/))) {
            return true;
          }
          // For date values, ensure they're valid dates
          try {
            if (value instanceof Date) {
              return !isNaN(value.getTime());
            } else if (typeof value === 'string') {
              return !isNaN(new Date(value).getTime());
            }
            return true;
          } catch (e) {
            return false;
          }
        })
      );
      
      const [updatedTask] = await db.update(projectTasks)
        .set({
          ...sanitizedData,
          updatedAt: new Date()
        })
        .where(eq(projectTasks.id, id))
        .returning();
      return updatedTask;
    } catch (error) {
      console.error('Error updating project task:', error);
      return undefined;
    }
  }
  
  async deleteProjectTask(id: number): Promise<boolean> {
    try {
      await db.delete(projectTasks)
        .where(eq(projectTasks.id, id));
      return true;
    } catch (error) {
      console.error('Error deleting project task:', error);
      return false;
    }
  }

  // Task Files operations
  async getTaskFiles(taskId: number): Promise<TaskFile[]> {
    try {
      return await db.select()
        .from(taskFiles)
        .where(eq(taskFiles.taskId, taskId))
        .orderBy(desc(taskFiles.uploadedAt));
    } catch (error) {
      console.error('Error fetching task files:', error);
      return [];
    }
  }
  
  async createTaskFile(fileData: InsertTaskFile): Promise<TaskFile> {
    try {
      const [file] = await db.insert(taskFiles)
        .values(fileData)
        .returning();
      return file;
    } catch (error) {
      console.error('Error creating task file:', error);
      throw error;
    }
  }
  
  async deleteTaskFile(id: number): Promise<boolean> {
    try {
      await db.delete(taskFiles)
        .where(eq(taskFiles.id, id));
      return true;
    } catch (error) {
      console.error('Error deleting task file:', error);
      return false;
    }
  }
  
  // Task Messages operations
  async getTaskMessages(taskId: number): Promise<TaskMessage[]> {
    try {
      return await db.select()
        .from(taskMessages)
        .where(eq(taskMessages.taskId, taskId))
        .orderBy(desc(taskMessages.sentAt));
    } catch (error) {
      console.error('Error fetching task messages:', error);
      return [];
    }
  }
  
  async createTaskMessage(messageData: InsertTaskMessage): Promise<TaskMessage> {
    try {
      const [message] = await db.insert(taskMessages)
        .values(messageData)
        .returning();
      return message;
    } catch (error) {
      console.error('Error creating task message:', error);
      throw error;
    }
  }
  
  async getTaskMessage(id: number): Promise<TaskMessage | undefined> {
    try {
      const [message] = await db.select()
        .from(taskMessages)
        .where(eq(taskMessages.id, id));
      return message;
    } catch (error) {
      console.error('Error fetching task message:', error);
      return undefined;
    }
  }
  
  async updateTaskMessageStatus(id: number, status: string): Promise<TaskMessage | undefined> {
    try {
      const [message] = await db.update(taskMessages)
        .set({ status })
        .where(eq(taskMessages.id, id))
        .returning();
      return message;
    } catch (error) {
      console.error('Error updating task message status:', error);
      return undefined;
    }
  }

  // Timelapse Items operations
  async getTimelapseItems(taskId: number): Promise<TimelapseItem[]> {
    try {
      return await db.select()
        .from(timelapseItems)
        .where(eq(timelapseItems.taskId, taskId))
        .orderBy(asc(timelapseItems.captureDate));
    } catch (error) {
      console.error('Error fetching timelapse items:', error);
      return [];
    }
  }

  async getTimelapseItemsByType(taskId: number, mediaType: string): Promise<TimelapseItem[]> {
    try {
      return await db.select()
        .from(timelapseItems)
        .where(and(
          eq(timelapseItems.taskId, taskId),
          eq(timelapseItems.mediaType, mediaType)
        ))
        .orderBy(asc(timelapseItems.captureDate));
    } catch (error) {
      console.error('Error fetching timelapse items by type:', error);
      return [];
    }
  }

  async getTimelapseItem(id: number): Promise<TimelapseItem | undefined> {
    try {
      const [item] = await db.select()
        .from(timelapseItems)
        .where(eq(timelapseItems.id, id));
      return item;
    } catch (error) {
      console.error('Error fetching timelapse item:', error);
      return undefined;
    }
  }

  async createTimelapseItem(itemData: InsertTimelapseItem): Promise<TimelapseItem> {
    try {
      const [item] = await db.insert(timelapseItems)
        .values(itemData)
        .returning();
      return item;
    } catch (error) {
      console.error('Error creating timelapse item:', error);
      throw error;
    }
  }

  async updateTimelapseItem(id: number, itemData: Partial<TimelapseItem>): Promise<TimelapseItem | undefined> {
    try {
      const [updatedItem] = await db.update(timelapseItems)
        .set(itemData)
        .where(eq(timelapseItems.id, id))
        .returning();
      return updatedItem;
    } catch (error) {
      console.error('Error updating timelapse item:', error);
      return undefined;
    }
  }

  async deleteTimelapseItem(id: number): Promise<boolean> {
    try {
      await db.delete(timelapseItems)
        .where(eq(timelapseItems.id, id));
      return true;
    } catch (error) {
      console.error('Error deleting timelapse item:', error);
      return false;
    }
  }

  async getProjectTimelapseItems(projectId: number): Promise<TimelapseItem[]> {
    try {
      const items = await db.select()
        .from(timelapseItems)
        .where(eq(timelapseItems.projectId, projectId))
        .orderBy(asc(timelapseItems.captureDate));
      return items;
    } catch (error) {
      console.error('Error fetching project timelapse items:', error);
      return [];
    }
  }

  // Trust Administration operations

  // Trust Entities operations
  async getTrustEntities(): Promise<TrustEntity[]> {
    try {
      return await db.select().from(trustEntities).orderBy(asc(trustEntities.name));
    } catch (error) {
      console.error('Error fetching trust entities:', error);
      return [];
    }
  }

  async getTrustEntity(id: number): Promise<TrustEntity | undefined> {
    try {
      const [entity] = await db.select().from(trustEntities).where(eq(trustEntities.id, id));
      return entity;
    } catch (error) {
      console.error('Error fetching trust entity:', error);
      return undefined;
    }
  }

  async createTrustEntity(entityData: InsertTrustEntity): Promise<TrustEntity> {
    try {
      const [entity] = await db.insert(trustEntities).values(entityData).returning();
      return entity;
    } catch (error) {
      console.error('Error creating trust entity:', error);
      throw error;
    }
  }

  async updateTrustEntity(id: number, entityData: Partial<TrustEntity>): Promise<TrustEntity | undefined> {
    try {
      const [entity] = await db.update(trustEntities)
        .set({ ...entityData, updatedAt: new Date() })
        .where(eq(trustEntities.id, id))
        .returning();
      return entity;
    } catch (error) {
      console.error('Error updating trust entity:', error);
      return undefined;
    }
  }

  async deleteTrustEntity(id: number): Promise<boolean> {
    try {
      await db.delete(trustEntities).where(eq(trustEntities.id, id));
      return true;
    } catch (error) {
      console.error('Error deleting trust entity:', error);
      return false;
    }
  }

  // Trust Beneficiaries operations
  async getTrustBeneficiaries(trustId?: number): Promise<TrustBeneficiary[]> {
    try {
      let query = db.select().from(trustBeneficiaries);
      if (trustId) {
        query = query.where(eq(trustBeneficiaries.trustId, trustId));
      }
      return await query.orderBy(asc(trustBeneficiaries.lastName), asc(trustBeneficiaries.firstName));
    } catch (error) {
      console.error('Error fetching trust beneficiaries:', error);
      return [];
    }
  }

  async getTrustBeneficiary(id: number): Promise<TrustBeneficiary | undefined> {
    try {
      const [beneficiary] = await db.select().from(trustBeneficiaries).where(eq(trustBeneficiaries.id, id));
      return beneficiary;
    } catch (error) {
      console.error('Error fetching trust beneficiary:', error);
      return undefined;
    }
  }

  async createTrustBeneficiary(beneficiaryData: InsertTrustBeneficiary): Promise<TrustBeneficiary> {
    try {
      const [beneficiary] = await db.insert(trustBeneficiaries).values(beneficiaryData).returning();
      return beneficiary;
    } catch (error) {
      console.error('Error creating trust beneficiary:', error);
      throw error;
    }
  }

  async updateTrustBeneficiary(id: number, beneficiaryData: Partial<TrustBeneficiary>): Promise<TrustBeneficiary | undefined> {
    try {
      const [beneficiary] = await db.update(trustBeneficiaries)
        .set({ ...beneficiaryData, updatedAt: new Date() })
        .where(eq(trustBeneficiaries.id, id))
        .returning();
      return beneficiary;
    } catch (error) {
      console.error('Error updating trust beneficiary:', error);
      return undefined;
    }
  }

  async deleteTrustBeneficiary(id: number): Promise<boolean> {
    try {
      await db.delete(trustBeneficiaries).where(eq(trustBeneficiaries.id, id));
      return true;
    } catch (error) {
      console.error('Error deleting trust beneficiary:', error);
      return false;
    }
  }

  // Trust Trustees operations
  async getTrustTrustees(trustId?: number): Promise<TrustTrustee[]> {
    try {
      let query = db.select().from(trustTrustees);
      if (trustId) {
        query = query.where(eq(trustTrustees.trustId, trustId));
      }
      return await query.orderBy(asc(trustTrustees.lastName), asc(trustTrustees.firstName));
    } catch (error) {
      console.error('Error fetching trust trustees:', error);
      return [];
    }
  }

  async getTrustTrustee(id: number): Promise<TrustTrustee | undefined> {
    try {
      const [trustee] = await db.select().from(trustTrustees).where(eq(trustTrustees.id, id));
      return trustee;
    } catch (error) {
      console.error('Error fetching trust trustee:', error);
      return undefined;
    }
  }

  async createTrustTrustee(trusteeData: InsertTrustTrustee): Promise<TrustTrustee> {
    try {
      const [trustee] = await db.insert(trustTrustees).values(trusteeData).returning();
      return trustee;
    } catch (error) {
      console.error('Error creating trust trustee:', error);
      throw error;
    }
  }

  async updateTrustTrustee(id: number, trusteeData: Partial<TrustTrustee>): Promise<TrustTrustee | undefined> {
    try {
      const [trustee] = await db.update(trustTrustees)
        .set({ ...trusteeData, updatedAt: new Date() })
        .where(eq(trustTrustees.id, id))
        .returning();
      return trustee;
    } catch (error) {
      console.error('Error updating trust trustee:', error);
      return undefined;
    }
  }

  async deleteTrustTrustee(id: number): Promise<boolean> {
    try {
      await db.delete(trustTrustees).where(eq(trustTrustees.id, id));
      return true;
    } catch (error) {
      console.error('Error deleting trust trustee:', error);
      return false;
    }
  }

  // Trust Assets operations
  async getTrustAssets(trustId?: number): Promise<TrustAsset[]> {
    try {
      let query = db.select().from(trustAssets);
      if (trustId) {
        query = query.where(eq(trustAssets.trustId, trustId));
      }
      return await query.orderBy(asc(trustAssets.assetName));
    } catch (error) {
      console.error('Error fetching trust assets:', error);
      return [];
    }
  }

  async getTrustAsset(id: number): Promise<TrustAsset | undefined> {
    try {
      const [asset] = await db.select().from(trustAssets).where(eq(trustAssets.id, id));
      return asset;
    } catch (error) {
      console.error('Error fetching trust asset:', error);
      return undefined;
    }
  }

  async createTrustAsset(assetData: InsertTrustAsset, actionBy?: number): Promise<TrustAsset> {
    return await db.transaction(async (tx) => {
      try {
        // Create the asset first
        const [asset] = await tx.insert(trustAssets).values(assetData).returning();
        
        // Create history record for asset addition with proper field names
        const historyData: InsertTrustAssetHistory = {
          trustId: asset.trustId,
          assetId: asset.id,
          actionType: 'added',
          actionBy: actionBy || 1, // Default to admin user if not provided
          previousValues: null, // No previous values for new asset
          newValues: JSON.stringify({
            assetName: asset.assetName,
            assetType: asset.assetType,
            currentValue: asset.currentValue,
            description: asset.description,
            acquisitionDate: asset.acquisitionDate,
            valuationDate: asset.valuationDate
          }),
          changeReason: 'Asset created',
          changeDescription: `New ${asset.assetType} asset '${asset.assetName}' added to trust`,
          // Populate snapshot fields for better queryability
          assetType: asset.assetType,
          assetName: asset.assetName,
          assetValue: asset.currentValue,
          valuationDate: asset.valuationDate
        };
        
        await tx.insert(trustAssetHistory).values(historyData);
        return asset;
      } catch (error) {
        console.error('Error creating trust asset:', error);
        throw error;
      }
    });
  }

  async updateTrustAsset(id: number, assetData: Partial<TrustAsset>, actionBy?: number, changeReason?: string): Promise<TrustAsset | undefined> {
    return await db.transaction(async (tx) => {
      try {
        // Get the original asset data for history tracking
        const [originalAsset] = await tx.select().from(trustAssets).where(eq(trustAssets.id, id));
        if (!originalAsset) {
          throw new Error('Asset not found');
        }

        // Update the asset
        const [asset] = await tx.update(trustAssets)
          .set({ ...assetData, updatedAt: new Date() })
          .where(eq(trustAssets.id, id))
          .returning();

        // Create history record for asset modification with proper field names
        const historyData: InsertTrustAssetHistory = {
          trustId: asset.trustId,
          assetId: asset.id,
          actionType: 'modified',
          actionBy: actionBy || 1, // Default to admin user if not provided
          previousValues: JSON.stringify({
            assetName: originalAsset.assetName,
            assetType: originalAsset.assetType,
            currentValue: originalAsset.currentValue,
            description: originalAsset.description,
            acquisitionDate: originalAsset.acquisitionDate,
            valuationDate: originalAsset.valuationDate
          }),
          newValues: JSON.stringify({
            assetName: asset.assetName,
            assetType: asset.assetType,
            currentValue: asset.currentValue,
            description: asset.description,
            acquisitionDate: asset.acquisitionDate,
            valuationDate: asset.valuationDate
          }),
          changeReason: changeReason || 'Asset updated',
          changeDescription: `Asset '${asset.assetName}' modified`,
          // Populate snapshot fields for better queryability
          assetType: asset.assetType,
          assetName: asset.assetName,
          assetValue: asset.currentValue,
          valuationDate: asset.valuationDate
        };
        
        await tx.insert(trustAssetHistory).values(historyData);
        return asset;
      } catch (error) {
        console.error('Error updating trust asset:', error);
        return undefined;
      }
    });
  }

  async deleteTrustAsset(id: number, actionBy?: number, changeReason?: string): Promise<boolean> {
    return await db.transaction(async (tx) => {
      try {
        // Get the asset data before deletion for history tracking
        const [originalAsset] = await tx.select().from(trustAssets).where(eq(trustAssets.id, id));
        if (!originalAsset) {
          throw new Error('Asset not found');
        }

        // Create history record for asset removal with proper field names
        const historyData: InsertTrustAssetHistory = {
          trustId: originalAsset.trustId,
          assetId: originalAsset.id,
          actionType: 'removed',
          actionBy: actionBy || 1, // Default to admin user if not provided
          previousValues: JSON.stringify({
            assetName: originalAsset.assetName,
            assetType: originalAsset.assetType,
            currentValue: originalAsset.currentValue,
            description: originalAsset.description,
            acquisitionDate: originalAsset.acquisitionDate,
            valuationDate: originalAsset.valuationDate
          }),
          newValues: null, // No new values for deleted asset
          changeReason: changeReason || 'Asset removed',
          changeDescription: `Asset '${originalAsset.assetName}' removed from trust`,
          // Populate snapshot fields for better queryability
          assetType: originalAsset.assetType,
          assetName: originalAsset.assetName,
          assetValue: originalAsset.currentValue,
          valuationDate: originalAsset.valuationDate
        };
        
        await tx.insert(trustAssetHistory).values(historyData);
        
        // Delete the asset after creating history record
        await tx.delete(trustAssets).where(eq(trustAssets.id, id));
        return true;
      } catch (error) {
        console.error('Error deleting trust asset:', error);
        return false;
      }
    });
  }

  // Trust Asset History operations
  async getTrustAssetHistory(trustId: number): Promise<TrustAssetHistory[]> {
    try {
      return await db.select().from(trustAssetHistory)
        .where(eq(trustAssetHistory.trustId, trustId))
        .orderBy(desc(trustAssetHistory.actionDate));
    } catch (error) {
      console.error('Error fetching trust asset history:', error);
      return [];
    }
  }

  async getAssetHistory(assetId: number): Promise<TrustAssetHistory[]> {
    try {
      return await db.select().from(trustAssetHistory)
        .where(eq(trustAssetHistory.assetId, assetId))
        .orderBy(desc(trustAssetHistory.actionDate));
    } catch (error) {
      console.error('Error fetching asset history:', error);
      return [];
    }
  }

  async createTrustAssetHistory(historyData: InsertTrustAssetHistory): Promise<TrustAssetHistory> {
    try {
      const [history] = await db.insert(trustAssetHistory).values(historyData).returning();
      return history;
    } catch (error) {
      console.error('Error creating trust asset history:', error);
      throw error;
    }
  }

  async getTrustAssetHistoryByActionType(trustId: number, actionType: string): Promise<TrustAssetHistory[]> {
    try {
      return await db.select().from(trustAssetHistory)
        .where(and(
          eq(trustAssetHistory.trustId, trustId),
          eq(trustAssetHistory.actionType, actionType)
        ))
        .orderBy(desc(trustAssetHistory.actionDate));
    } catch (error) {
      console.error('Error fetching trust asset history by action type:', error);
      return [];
    }
  }

  // Trust Distributions operations
  async getTrustDistributions(trustId?: number, beneficiaryId?: number): Promise<TrustDistribution[]> {
    try {
      let query = db.select().from(trustDistributions);
      const conditions = [];
      if (trustId) conditions.push(eq(trustDistributions.trustId, trustId));
      if (beneficiaryId) conditions.push(eq(trustDistributions.beneficiaryId, beneficiaryId));
      
      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }
      
      return await query.orderBy(desc(trustDistributions.distributionDate));
    } catch (error) {
      console.error('Error fetching trust distributions:', error);
      return [];
    }
  }

  async getTrustDistribution(id: number): Promise<TrustDistribution | undefined> {
    try {
      const [distribution] = await db.select().from(trustDistributions).where(eq(trustDistributions.id, id));
      return distribution;
    } catch (error) {
      console.error('Error fetching trust distribution:', error);
      return undefined;
    }
  }

  async createTrustDistribution(distributionData: InsertTrustDistribution): Promise<TrustDistribution> {
    try {
      const [distribution] = await db.insert(trustDistributions).values(distributionData).returning();
      return distribution;
    } catch (error) {
      console.error('Error creating trust distribution:', error);
      throw error;
    }
  }

  async updateTrustDistribution(id: number, distributionData: Partial<TrustDistribution>): Promise<TrustDistribution | undefined> {
    try {
      const [distribution] = await db.update(trustDistributions)
        .set({ ...distributionData, updatedAt: new Date() })
        .where(eq(trustDistributions.id, id))
        .returning();
      return distribution;
    } catch (error) {
      console.error('Error updating trust distribution:', error);
      return undefined;
    }
  }

  async deleteTrustDistribution(id: number): Promise<boolean> {
    try {
      await db.delete(trustDistributions).where(eq(trustDistributions.id, id));
      return true;
    } catch (error) {
      console.error('Error deleting trust distribution:', error);
      return false;
    }
  }

  // Trust Documents operations
  async getTrustDocuments(trustId?: number): Promise<TrustDocument[]> {
    try {
      let query = db.select().from(trustDocuments);
      if (trustId) {
        query = query.where(eq(trustDocuments.trustId, trustId));
      }
      return await query.orderBy(desc(trustDocuments.documentDate));
    } catch (error) {
      console.error('Error fetching trust documents:', error);
      return [];
    }
  }

  async getTrustDocument(id: number): Promise<TrustDocument | undefined> {
    try {
      const [document] = await db.select().from(trustDocuments).where(eq(trustDocuments.id, id));
      return document;
    } catch (error) {
      console.error('Error fetching trust document:', error);
      return undefined;
    }
  }

  async createTrustDocument(documentData: InsertTrustDocument): Promise<TrustDocument> {
    try {
      const [document] = await db.insert(trustDocuments).values(documentData).returning();
      return document;
    } catch (error) {
      console.error('Error creating trust document:', error);
      throw error;
    }
  }

  async updateTrustDocument(id: number, documentData: Partial<TrustDocument>): Promise<TrustDocument | undefined> {
    try {
      const [document] = await db.update(trustDocuments)
        .set({ ...documentData, updatedAt: new Date() })
        .where(eq(trustDocuments.id, id))
        .returning();
      return document;
    } catch (error) {
      console.error('Error updating trust document:', error);
      return undefined;
    }
  }

  async deleteTrustDocument(id: number): Promise<boolean> {
    try {
      await db.delete(trustDocuments).where(eq(trustDocuments.id, id));
      return true;
    } catch (error) {
      console.error('Error deleting trust document:', error);
      return false;
    }
  }

  // Trust Compliance operations
  async getTrustCompliance(trustId?: number): Promise<TrustCompliance[]> {
    try {
      let query = db.select().from(trustCompliance);
      if (trustId) {
        query = query.where(eq(trustCompliance.trustId, trustId));
      }
      return await query.orderBy(asc(trustCompliance.dueDate));
    } catch (error) {
      console.error('Error fetching trust compliance:', error);
      return [];
    }
  }

  async getTrustComplianceItem(id: number): Promise<TrustCompliance | undefined> {
    try {
      const [compliance] = await db.select().from(trustCompliance).where(eq(trustCompliance.id, id));
      return compliance;
    } catch (error) {
      console.error('Error fetching trust compliance item:', error);
      return undefined;
    }
  }

  async createTrustCompliance(complianceData: InsertTrustCompliance): Promise<TrustCompliance> {
    try {
      const [compliance] = await db.insert(trustCompliance).values(complianceData).returning();
      return compliance;
    } catch (error) {
      console.error('Error creating trust compliance:', error);
      throw error;
    }
  }

  async updateTrustCompliance(id: number, complianceData: Partial<TrustCompliance>): Promise<TrustCompliance | undefined> {
    try {
      const [compliance] = await db.update(trustCompliance)
        .set({ ...complianceData, updatedAt: new Date() })
        .where(eq(trustCompliance.id, id))
        .returning();
      return compliance;
    } catch (error) {
      console.error('Error updating trust compliance:', error);
      return undefined;
    }
  }

  async deleteTrustCompliance(id: number): Promise<boolean> {
    try {
      await db.delete(trustCompliance).where(eq(trustCompliance.id, id));
      return true;
    } catch (error) {
      console.error('Error deleting trust compliance:', error);
      return false;
    }
  }

  // Trust Meetings operations
  async getTrustMeetings(trustId?: number): Promise<TrustMeeting[]> {
    try {
      let query = db.select().from(trustMeetings);
      if (trustId) {
        query = query.where(eq(trustMeetings.trustId, trustId));
      }
      return await query.orderBy(desc(trustMeetings.meetingDate));
    } catch (error) {
      console.error('Error fetching trust meetings:', error);
      return [];
    }
  }

  async getTrustMeeting(id: number): Promise<TrustMeeting | undefined> {
    try {
      const [meeting] = await db.select().from(trustMeetings).where(eq(trustMeetings.id, id));
      return meeting;
    } catch (error) {
      console.error('Error fetching trust meeting:', error);
      return undefined;
    }
  }

  async createTrustMeeting(meetingData: InsertTrustMeeting): Promise<TrustMeeting> {
    try {
      const [meeting] = await db.insert(trustMeetings).values(meetingData).returning();
      return meeting;
    } catch (error) {
      console.error('Error creating trust meeting:', error);
      throw error;
    }
  }

  async updateTrustMeeting(id: number, meetingData: Partial<TrustMeeting>): Promise<TrustMeeting | undefined> {
    try {
      const [meeting] = await db.update(trustMeetings)
        .set({ ...meetingData, updatedAt: new Date() })
        .where(eq(trustMeetings.id, id))
        .returning();
      return meeting;
    } catch (error) {
      console.error('Error updating trust meeting:', error);
      return undefined;
    }
  }

  async deleteTrustMeeting(id: number): Promise<boolean> {
    try {
      await db.delete(trustMeetings).where(eq(trustMeetings.id, id));
      return true;
    } catch (error) {
      console.error('Error deleting trust meeting:', error);
      return false;
    }
  }

  // Industry Tiles operations
  async getIndustryTiles(): Promise<IndustryTile[]> {
    try {
      return await db.select().from(industryTiles).where(eq(industryTiles.isActive, true)).orderBy(asc(industryTiles.displayOrder));
    } catch (error) {
      console.error('Error fetching industry tiles:', error);
      return [];
    }
  }

  async getIndustryTile(id: number): Promise<IndustryTile | undefined> {
    try {
      const [tile] = await db.select().from(industryTiles).where(eq(industryTiles.id, id));
      return tile;
    } catch (error) {
      console.error('Error fetching industry tile:', error);
      return undefined;
    }
  }

  async getIndustryTileBySlug(slug: string): Promise<IndustryTile | undefined> {
    try {
      const [tile] = await db.select().from(industryTiles).where(eq(industryTiles.slug, slug));
      return tile;
    } catch (error) {
      console.error('Error fetching industry tile by slug:', error);
      return undefined;
    }
  }

  async createIndustryTile(tileData: InsertIndustryTile): Promise<IndustryTile> {
    try {
      const [tile] = await db.insert(industryTiles).values(tileData).returning();
      return tile;
    } catch (error) {
      console.error('Error creating industry tile:', error);
      throw error;
    }
  }

  async updateIndustryTile(id: number, tileData: Partial<IndustryTile>): Promise<IndustryTile | undefined> {
    try {
      const [tile] = await db.update(industryTiles)
        .set({ ...tileData, updatedAt: new Date() })
        .where(eq(industryTiles.id, id))
        .returning();
      return tile;
    } catch (error) {
      console.error('Error updating industry tile:', error);
      return undefined;
    }
  }

  async deleteIndustryTile(id: number): Promise<boolean> {
    try {
      await db.delete(industryTiles).where(eq(industryTiles.id, id));
      return true;
    } catch (error) {
      console.error('Error deleting industry tile:', error);
      return false;
    }
  }

  // Industry Tile Services operations
  async getIndustryTileServices(tileId: number): Promise<IndustryTileService[]> {
    try {
      return await db.select().from(industryTileServices)
        .where(eq(industryTileServices.tileId, tileId))
        .orderBy(asc(industryTileServices.displayOrder));
    } catch (error) {
      console.error('Error fetching industry tile services:', error);
      return [];
    }
  }

  async getServicesForTile(tileId: number): Promise<Service[]> {
    try {
      const tileServices = await db.select().from(industryTileServices)
        .where(eq(industryTileServices.tileId, tileId))
        .orderBy(asc(industryTileServices.displayOrder));
      
      if (tileServices.length === 0) return [];
      
      const serviceIds = tileServices.map(ts => ts.serviceId);
      const allServices = await db.select().from(services).where(
        inArray(services.id, serviceIds)
      );
      
      // Maintain order from tile services
      return serviceIds
        .map(id => allServices.find(s => s.id === id))
        .filter((s): s is Service => s !== undefined);
    } catch (error) {
      console.error('Error fetching services for tile:', error);
      return [];
    }
  }

  async addServiceToTile(tileId: number, serviceId: number, displayOrder: number = 100): Promise<IndustryTileService> {
    try {
      const [tileService] = await db.insert(industryTileServices)
        .values({ tileId, serviceId, displayOrder })
        .returning();
      return tileService;
    } catch (error) {
      console.error('Error adding service to tile:', error);
      throw error;
    }
  }

  async removeServiceFromTile(tileId: number, serviceId: number): Promise<boolean> {
    try {
      await db.delete(industryTileServices).where(
        and(
          eq(industryTileServices.tileId, tileId),
          eq(industryTileServices.serviceId, serviceId)
        )
      );
      return true;
    } catch (error) {
      console.error('Error removing service from tile:', error);
      return false;
    }
  }

  async updateTileServiceOrder(tileId: number, serviceId: number, displayOrder: number): Promise<IndustryTileService | undefined> {
    try {
      const [tileService] = await db.update(industryTileServices)
        .set({ displayOrder })
        .where(
          and(
            eq(industryTileServices.tileId, tileId),
            eq(industryTileServices.serviceId, serviceId)
          )
        )
        .returning();
      return tileService;
    } catch (error) {
      console.error('Error updating tile service order:', error);
      return undefined;
    }
  }

  // Hero carousel slide operations
  async getHeroSlides(includeInactive: boolean = false): Promise<HeroSlide[]> {
    try {
      const query = db.select().from(heroSlides).orderBy(asc(heroSlides.displayOrder));
      if (includeInactive) {
        return await query;
      }
      return await db.select().from(heroSlides)
        .where(eq(heroSlides.isActive, true))
        .orderBy(asc(heroSlides.displayOrder));
    } catch (error) {
      console.error('Error fetching hero slides:', error);
      return [];
    }
  }

  async getHeroSlide(id: number): Promise<HeroSlide | undefined> {
    try {
      const [slide] = await db.select().from(heroSlides).where(eq(heroSlides.id, id));
      return slide;
    } catch (error) {
      console.error('Error fetching hero slide:', error);
      return undefined;
    }
  }

  async createHeroSlide(slide: InsertHeroSlide): Promise<HeroSlide> {
    const [created] = await db.insert(heroSlides).values(slide).returning();
    return created;
  }

  async updateHeroSlide(id: number, slide: Partial<InsertHeroSlide>): Promise<HeroSlide | undefined> {
    try {
      const [updated] = await db.update(heroSlides)
        .set({ ...slide, updatedAt: new Date() })
        .where(eq(heroSlides.id, id))
        .returning();
      return updated;
    } catch (error) {
      console.error('Error updating hero slide:', error);
      return undefined;
    }
  }

  async deleteHeroSlide(id: number): Promise<boolean> {
    try {
      const result = await db.delete(heroSlides).where(eq(heroSlides.id, id)).returning();
      return result.length > 0;
    } catch (error) {
      console.error('Error deleting hero slide:', error);
      return false;
    }
  }
}