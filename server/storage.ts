import { users, type User, type InsertUser, services, type Service, type InsertService, 
  bookings, type Booking, type InsertBooking, galleries, type Gallery, type InsertGallery,
  beforeAfterImages, type BeforeAfterImage, type InsertBeforeAfterImage,
  blogPosts, type BlogPost, type InsertBlogPost, testimonials, type Testimonial, type InsertTestimonial,
  contactMessages, type ContactMessage, type InsertContactMessage, businessConfig, type BusinessConfig,
  socialMediaAccounts, type SocialMediaAccount, type InsertSocialMediaAccount,
  socialPosts, type SocialPost, type InsertSocialPost,
  droneAnalytics, type DroneAnalytics, type InsertDroneAnalytics,
  flightLogs, type FlightLog, type InsertFlightLog,
  projectAnalytics, type ProjectAnalytics, type InsertProjectAnalytics,
  marketingAnalytics, type MarketingAnalytics, type InsertMarketingAnalytics,
  clientAnalytics, type ClientAnalytics, type InsertClientAnalytics,
  analyticsReports, type AnalyticsReport, type InsertAnalyticsReport,
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
  // Client files and projects management
  clientProjects, type ClientProject, type InsertClientProject,
  projectTasks, type ProjectTask, type InsertProjectTask,
  projectMilestones, type ProjectMilestone, type InsertProjectMilestone,
  taskFiles, type TaskFile, type InsertTaskFile,
  taskMessages, type TaskMessage, type InsertTaskMessage,
  // Timelapse management
  timelapseItems, type TimelapseItem, type InsertTimelapseItem,
  // Virtual tours management
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
  // Service bundle discounts
  serviceBundleDiscounts, type ServiceBundleDiscount,
  type BookingFeedback,
  // Email campaigns and lead scoring
  emailCampaigns, type EmailCampaign, type InsertEmailCampaign,
  leadScores, type LeadScore, type InsertLeadScore,
  // Hero carousel slides
  heroSlides, type HeroSlide, type InsertHeroSlide } from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";

const MemoryStore = createMemoryStore(session);

export interface IStorage {
  // User operations
  getUsers(): Promise<User[]>;
  getAllUsers(): Promise<User[]>; // Alias for getUsers, used by admin dashboard
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, userData: Partial<User>): Promise<User | undefined>;
  
  // Service operations
  getServices(): Promise<Service[]>;
  getService(id: number): Promise<Service | undefined>;
  createService(service: InsertService): Promise<Service>;
  updateService(id: number, serviceData: Partial<Service>): Promise<Service | undefined>;
  deleteService(id: number): Promise<boolean>;
  
  // Service bundle discount operations
  getServiceBundleDiscounts(): Promise<ServiceBundleDiscount[]>;
  
  // Booking operations
  getBookings(): Promise<Booking[]>;
  getBooking(id: number): Promise<Booking | undefined>;
  getUserBookings(userId: number): Promise<Booking[]>;
  getCustomerBookings(customerId: number): Promise<Booking[]>;
  createBooking(booking: InsertBooking): Promise<Booking>;
  updateBooking(id: number, bookingData: Partial<Booking>): Promise<Booking | undefined>;
  deleteBooking(id: number): Promise<boolean>;
  
  // Gallery operations
  getGalleries(): Promise<Gallery[]>;
  getGallery(id: number): Promise<Gallery | undefined>;
  getUserGalleries(userId: number): Promise<Gallery[]>;
  getPublicGalleries(): Promise<Gallery[]>;
  createGallery(gallery: InsertGallery): Promise<Gallery>;
  updateGallery(id: number, galleryData: Partial<Gallery>): Promise<Gallery | undefined>;
  deleteGallery(id: number): Promise<boolean>;
  
  // Before/After Image operations
  getBeforeAfterImages(): Promise<BeforeAfterImage[]>;
  getBeforeAfterImage(id: number): Promise<BeforeAfterImage | undefined>;
  getPublicBeforeAfterImages(): Promise<BeforeAfterImage[]>;
  createBeforeAfterImage(beforeAfterImage: InsertBeforeAfterImage): Promise<BeforeAfterImage>;
  updateBeforeAfterImage(id: number, imageData: Partial<BeforeAfterImage>): Promise<BeforeAfterImage | undefined>;
  deleteBeforeAfterImage(id: number): Promise<boolean>;
  
  // Blog Post operations
  getBlogPosts(): Promise<BlogPost[]>;
  getBlogPost(id: number): Promise<BlogPost | undefined>;
  createBlogPost(blogPost: InsertBlogPost): Promise<BlogPost>;
  updateBlogPost(id: number, blogPostData: Partial<BlogPost>): Promise<BlogPost | undefined>;
  deleteBlogPost(id: number): Promise<boolean>;
  
  // Testimonial operations
  getTestimonials(): Promise<Testimonial[]>;
  getApprovedTestimonials(): Promise<Testimonial[]>;
  getTestimonial(id: number): Promise<Testimonial | undefined>;
  createTestimonial(testimonial: InsertTestimonial): Promise<Testimonial>;
  updateTestimonial(id: number, testimonialData: Partial<Testimonial>): Promise<Testimonial | undefined>;
  deleteTestimonial(id: number): Promise<boolean>;
  
  // Contact Message operations
  getContactMessages(): Promise<ContactMessage[]>;
  getContactMessage(id: number): Promise<ContactMessage | undefined>;
  createContactMessage(message: InsertContactMessage): Promise<ContactMessage>;
  updateContactMessage(id: number, messageData: Partial<ContactMessage>): Promise<ContactMessage | undefined>;
  deleteContactMessage(id: number): Promise<boolean>;
  
  // Quote operations
  getQuotes(userId?: number): Promise<any[]>;
  getQuote(id: number): Promise<any | undefined>;
  createQuote(quote: any): Promise<any>;
  updateQuote(id: number, quoteData: Partial<any>): Promise<any | undefined>;
  deleteQuote(id: number): Promise<boolean>;

  // Business Config operations
  getBusinessConfig(): Promise<BusinessConfig | undefined>;
  updateBusinessConfig(configData: Partial<BusinessConfig>): Promise<BusinessConfig>;
  
  // Social Media Account operations
  getSocialMediaAccounts(userId: number): Promise<SocialMediaAccount[]>;
  getSocialMediaAccount(id: number): Promise<SocialMediaAccount | undefined>;
  getSocialMediaAccountByPlatform(userId: number, platform: string): Promise<SocialMediaAccount | undefined>;
  createSocialMediaAccount(account: InsertSocialMediaAccount): Promise<SocialMediaAccount>;
  updateSocialMediaAccount(id: number, accountData: Partial<SocialMediaAccount>): Promise<SocialMediaAccount | undefined>;
  deleteSocialMediaAccount(id: number): Promise<boolean>;
  
  // Social Post operations
  getSocialPosts(userId: number): Promise<SocialPost[]>;
  getSocialPost(id: number): Promise<SocialPost | undefined>;
  createSocialPost(post: InsertSocialPost): Promise<SocialPost>;
  updateSocialPost(id: number, postData: Partial<SocialPost>): Promise<SocialPost | undefined>;
  deleteSocialPost(id: number): Promise<boolean>;
  
  // Drone Analytics operations
  getDrones(): Promise<DroneAnalytics[]>;
  getDrone(id: number): Promise<DroneAnalytics | undefined>;
  createDrone(droneData: InsertDroneAnalytics): Promise<DroneAnalytics>;
  updateDrone(id: number, droneData: Partial<DroneAnalytics>): Promise<DroneAnalytics | undefined>;
  deleteDrone(id: number): Promise<boolean>;
  
  // Flight Log operations
  getFlightLogs(filters?: { droneId?: number, startDate?: string, endDate?: string }): Promise<FlightLog[]>;
  getFlightLog(id: number): Promise<FlightLog | undefined>;
  createFlightLog(logData: InsertFlightLog): Promise<FlightLog>;
  updateFlightLog(id: number, logData: Partial<FlightLog>): Promise<FlightLog | undefined>;
  deleteFlightLog(id: number): Promise<boolean>;
  
  // Project Analytics operations
  getProjectAnalytics(filters?: { startDate?: string, endDate?: string, serviceType?: string }): Promise<ProjectAnalytics[]>;
  getProjectAnalytic(id: number): Promise<ProjectAnalytics | undefined>;
  createProjectAnalytic(projectData: InsertProjectAnalytics): Promise<ProjectAnalytics>;
  updateProjectAnalytic(id: number, projectData: Partial<ProjectAnalytics>): Promise<ProjectAnalytics | undefined>;
  deleteProjectAnalytic(id: number): Promise<boolean>;
  
  // Client Analytics operations
  getClientAnalytics(filters?: { startDate?: string, endDate?: string }): Promise<ClientAnalytics[]>;
  getClientAnalytic(id: number): Promise<ClientAnalytics | undefined>;
  getClientAnalyticByUserId(userId: number): Promise<ClientAnalytics | undefined>;
  createClientAnalytic(clientData: InsertClientAnalytics): Promise<ClientAnalytics>;
  updateClientAnalytic(id: number, clientData: Partial<ClientAnalytics>): Promise<ClientAnalytics | undefined>;
  deleteClientAnalytic(id: number): Promise<boolean>;
  
  // Marketing Analytics operations
  getMarketingAnalytics(filters?: { startDate?: string, endDate?: string, channel?: string }): Promise<MarketingAnalytics[]>;
  getMarketingAnalytic(id: number): Promise<MarketingAnalytics | undefined>;
  createMarketingAnalytic(marketingData: Partial<MarketingAnalytics>): Promise<MarketingAnalytics>;
  updateMarketingAnalytic(id: number, marketingData: Partial<MarketingAnalytics>): Promise<MarketingAnalytics | undefined>;
  deleteMarketingAnalytic(id: number): Promise<boolean>;
  
  // Analytics Reports operations
  getAnalyticsReports(): Promise<AnalyticsReport[]>;
  getAnalyticsReport(id: number): Promise<AnalyticsReport | undefined>;
  createAnalyticsReport(reportData: InsertAnalyticsReport): Promise<AnalyticsReport>;
  updateAnalyticsReport(id: number, reportData: Partial<AnalyticsReport>): Promise<AnalyticsReport | undefined>;
  deleteAnalyticsReport(id: number): Promise<boolean>;
  
  // Additional Analytics API Endpoints
  getRevenueAnalytics(filters: { startDate?: string, endDate?: string, groupBy?: 'day' | 'week' | 'month' | 'year' }): Promise<any[]>;
  getConversionAnalytics(filters: { startDate?: string, endDate?: string, channel?: string }): Promise<any[]>;
  getROIAnalytics(filters: { startDate?: string, endDate?: string, channel?: string }): Promise<any[]>;
  getEquipmentUsageAnalytics(filters: { startDate?: string, endDate?: string, droneId?: number }): Promise<any[]>;
  getMaintenanceHistory(filters: { droneId?: number, startDate?: string, endDate?: string }): Promise<any[]>;
  getProjectSuccessMetrics(filters: { startDate?: string, endDate?: string, serviceType?: string }): Promise<any[]>;
  getClientRetentionData(filters: { startDate?: string, endDate?: string }): Promise<any[]>;
  getGeographicDistribution(filters: { startDate?: string, endDate?: string }): Promise<any[]>;
  generateCustomReport(params: {
    metrics: string[],
    dimensions: string[],
    filters: { [key: string]: any },
    startDate?: string,
    endDate?: string,
    limit?: number
  }): Promise<any[]>;

  // Payroll operations
  getDepartments(): Promise<Department[]>;
  getDepartment(id: number): Promise<Department | undefined>;
  createDepartment(department: InsertDepartment): Promise<Department>;
  updateDepartment(id: number, departmentData: Partial<Department>): Promise<Department | undefined>;
  deleteDepartment(id: number): Promise<boolean>;

  getEmployees(): Promise<Employee[]>;
  getEmployee(id: number): Promise<Employee | undefined>;
  createEmployee(employee: InsertEmployee): Promise<Employee>;
  updateEmployee(id: number, employeeData: Partial<Employee>): Promise<Employee | undefined>;
  deleteEmployee(id: number): Promise<boolean>;

  getPayrollPeriods(): Promise<PayrollPeriod[]>;
  getPayrollPeriod(id: number): Promise<PayrollPeriod | undefined>;
  createPayrollPeriod(period: InsertPayrollPeriod): Promise<PayrollPeriod>;
  updatePayrollPeriod(id: number, periodData: Partial<PayrollPeriod>): Promise<PayrollPeriod | undefined>;
  deletePayrollPeriod(id: number): Promise<boolean>;

  getPayrollEntries(payrollPeriodId?: number): Promise<PayrollEntry[]>;
  getPayrollEntry(id: number): Promise<PayrollEntry | undefined>;
  createPayrollEntry(entry: InsertPayrollEntry): Promise<PayrollEntry>;
  updatePayrollEntry(id: number, entryData: Partial<PayrollEntry>): Promise<PayrollEntry | undefined>;
  deletePayrollEntry(id: number): Promise<boolean>;

  getTimeEntries(employeeId?: number): Promise<TimeEntry[]>;
  getTimeEntriesByEmployee(employeeId: number): Promise<TimeEntry[]>;
  getTimeEntriesByPeriod(periodId: number): Promise<TimeEntry[]>;
  getTimeEntry(id: number): Promise<TimeEntry | undefined>;
  createTimeEntry(entry: InsertTimeEntry): Promise<TimeEntry>;
  updateTimeEntry(id: number, entryData: Partial<TimeEntry>): Promise<TimeEntry | undefined>;
  deleteTimeEntry(id: number): Promise<boolean>;

  // Booking Feedback operations
  saveBookingFeedback(bookingId: number, feedbackData: BookingFeedback): Promise<Booking | undefined>;
  
  // Client Projects operations
  getAllClientProjects(): Promise<ClientProject[]>;
  getClientProject(id: number): Promise<ClientProject | undefined>;
  getClientProjectsByClientId(clientId: number): Promise<ClientProject[]>;
  getClientProjectByNameAndClientId(name: string, clientId: number): Promise<ClientProject | undefined>;
  createClientProject(projectData: InsertClientProject): Promise<ClientProject>;
  updateClientProject(id: number, projectData: Partial<ClientProject>): Promise<ClientProject | undefined>;
  deleteClientProject(id: number): Promise<boolean>;
  // Project Milestones operations
  getProjectMilestones(projectId: number): Promise<ProjectMilestone[]>;
  getProjectMilestone(id: number): Promise<ProjectMilestone | undefined>;
  createProjectMilestone(milestoneData: InsertProjectMilestone): Promise<ProjectMilestone>;
  updateProjectMilestone(id: number, milestoneData: Partial<ProjectMilestone>): Promise<ProjectMilestone | undefined>;
  deleteProjectMilestone(id: number): Promise<boolean>;
  
  // Project Tasks operations
  getProjectTasks(projectId: number): Promise<ProjectTask[]>;
  getProjectTask(id: number): Promise<ProjectTask | undefined>;
  createProjectTask(taskData: InsertProjectTask): Promise<ProjectTask>;
  updateProjectTask(id: number, taskData: Partial<ProjectTask>): Promise<ProjectTask | undefined>;
  deleteProjectTask(id: number): Promise<boolean>;
  
  // Task Files operations
  getTaskFiles(taskId: number): Promise<TaskFile[]>;
  createTaskFile(fileData: InsertTaskFile): Promise<TaskFile>;
  deleteTaskFile(id: number): Promise<boolean>;
  
  // Task Messages operations
  getTaskMessages(taskId: number): Promise<TaskMessage[]>;
  getTaskMessage(id: number): Promise<TaskMessage | undefined>;
  createTaskMessage(messageData: InsertTaskMessage): Promise<TaskMessage>;
  updateTaskMessageStatus(id: number, status: string): Promise<TaskMessage | undefined>;

  // Timelapse Items operations
  getTimelapseItems(taskId: number): Promise<TimelapseItem[]>;
  getTimelapseItem(id: number): Promise<TimelapseItem | undefined>;
  getTimelapseItemsByType(taskId: number, mediaType: string): Promise<TimelapseItem[]>;
  getProjectTimelapseItems(projectId: number): Promise<TimelapseItem[]>;
  createTimelapseItem(itemData: InsertTimelapseItem): Promise<TimelapseItem>;
  updateTimelapseItem(id: number, itemData: Partial<TimelapseItem>): Promise<TimelapseItem | undefined>;
  deleteTimelapseItem(id: number): Promise<boolean>;

  // Notification operations
  getUserNotifications(userId: number): Promise<Notification[]>;
  getUserUnreadNotificationsCount(userId: number): Promise<number>;
  getNotification(id: number): Promise<Notification | undefined>;
  createNotification(notification: InsertNotification): Promise<Notification>;
  markNotificationAsRead(id: number): Promise<Notification | undefined>;
  markAllNotificationsAsRead(userId: number): Promise<boolean>;
  deleteNotification(id: number): Promise<boolean>;

  // Email Campaign operations
  getEmailCampaigns(): Promise<EmailCampaign[]>;
  getEmailCampaign(id: number): Promise<EmailCampaign | undefined>;
  createEmailCampaign(campaign: InsertEmailCampaign): Promise<EmailCampaign>;
  updateEmailCampaign(id: number, campaign: Partial<InsertEmailCampaign>): Promise<EmailCampaign | undefined>;
  deleteEmailCampaign(id: number): Promise<boolean>;

  // Lead Score operations
  getLeadScores(): Promise<LeadScore[]>;
  getLeadScore(customerId: number): Promise<LeadScore | undefined>;
  createLeadScore(leadScore: InsertLeadScore): Promise<LeadScore>;
  updateLeadScore(id: number, leadScore: Partial<InsertLeadScore>): Promise<LeadScore | undefined>;
  calculateLeadScore(customerId: number): Promise<LeadScore>;

  // Session store
  sessionStore: session.SessionStore;
  
  // CRM operations
  
  // Customer operations
  getCustomers(filters?: { status?: string, assignedTo?: number }): Promise<Customer[]>;
  getCustomer(id: number): Promise<Customer | undefined>;
  getCustomerByEmail(email: string): Promise<Customer | undefined>;
  getCustomerByUserId(userId: number, createIfNotExists?: boolean): Promise<Customer | undefined>;
  createCustomer(customerData: InsertCustomer): Promise<Customer>;
  updateCustomer(id: number, customerData: Partial<Customer>): Promise<Customer | undefined>;
  deleteCustomer(id: number): Promise<boolean>;
  
  // Customer interactions operations
  getCustomerInteractions(customerId: number): Promise<CustomerInteraction[]>;
  getCustomerInteraction(id: number): Promise<CustomerInteraction | undefined>;
  createCustomerInteraction(interactionData: InsertCustomerInteraction): Promise<CustomerInteraction>;
  updateCustomerInteraction(id: number, interactionData: Partial<CustomerInteraction>): Promise<CustomerInteraction | undefined>;
  deleteCustomerInteraction(id: number): Promise<boolean>;
  
  // Customer deals operations
  getCustomerDeals(filters?: { customerId?: number, stage?: string }): Promise<CustomerDeal[]>;
  getCustomerDeal(id: number): Promise<CustomerDeal | undefined>;
  createCustomerDeal(dealData: InsertCustomerDeal): Promise<CustomerDeal>;
  updateCustomerDeal(id: number, dealData: Partial<CustomerDeal>): Promise<CustomerDeal | undefined>;
  deleteCustomerDeal(id: number): Promise<boolean>;
  
  // Customer tasks operations
  getCustomerTasks(filters?: { customerId?: number, assignedTo?: number, status?: string }): Promise<CustomerTask[]>;
  getCustomerTask(id: number): Promise<CustomerTask | undefined>;
  createCustomerTask(taskData: InsertCustomerTask): Promise<CustomerTask>;
  updateCustomerTask(id: number, taskData: Partial<CustomerTask>): Promise<CustomerTask | undefined>;
  deleteCustomerTask(id: number): Promise<boolean>;
  
  // Virtual Tours operations
  getAllVirtualTours(): Promise<VirtualTour[]>;
  getVirtualTour(id: number): Promise<VirtualTour | undefined>;
  getVirtualToursByClientId(clientId: number): Promise<VirtualTour[]>;
  createVirtualTour(tourData: InsertVirtualTour): Promise<VirtualTour>;
  updateVirtualTour(id: number, tourData: Partial<VirtualTour>): Promise<VirtualTour | undefined>;
  deleteVirtualTour(id: number): Promise<boolean>;
  
  // Projects operations for admin
  getAllProjects(): Promise<ClientProject[]>;
  
  // Trust Administration operations
  // Trust Entities operations
  getTrustEntities(): Promise<TrustEntity[]>;
  getTrustEntity(id: number): Promise<TrustEntity | undefined>;
  createTrustEntity(entityData: InsertTrustEntity): Promise<TrustEntity>;
  updateTrustEntity(id: number, entityData: Partial<TrustEntity>): Promise<TrustEntity | undefined>;
  deleteTrustEntity(id: number): Promise<boolean>;
  
  // Trust Beneficiaries operations
  getTrustBeneficiaries(trustId?: number): Promise<TrustBeneficiary[]>;
  getTrustBeneficiary(id: number): Promise<TrustBeneficiary | undefined>;
  createTrustBeneficiary(beneficiaryData: InsertTrustBeneficiary): Promise<TrustBeneficiary>;
  updateTrustBeneficiary(id: number, beneficiaryData: Partial<TrustBeneficiary>): Promise<TrustBeneficiary | undefined>;
  deleteTrustBeneficiary(id: number): Promise<boolean>;
  
  // Trust Trustees operations
  getTrustTrustees(trustId?: number): Promise<TrustTrustee[]>;
  getTrustTrustee(id: number): Promise<TrustTrustee | undefined>;
  createTrustTrustee(trusteeData: InsertTrustTrustee): Promise<TrustTrustee>;
  updateTrustTrustee(id: number, trusteeData: Partial<TrustTrustee>): Promise<TrustTrustee | undefined>;
  deleteTrustTrustee(id: number): Promise<boolean>;
  
  // Trust Assets operations
  getTrustAssets(trustId?: number): Promise<TrustAsset[]>;
  getTrustAsset(id: number): Promise<TrustAsset | undefined>;
  createTrustAsset(assetData: InsertTrustAsset, actionBy?: number): Promise<TrustAsset>;
  updateTrustAsset(id: number, assetData: Partial<TrustAsset>, actionBy?: number, changeReason?: string): Promise<TrustAsset | undefined>;
  deleteTrustAsset(id: number, actionBy?: number, changeReason?: string): Promise<boolean>;
  
  // Trust Asset History operations
  getTrustAssetHistory(trustId: number): Promise<TrustAssetHistory[]>;
  getAssetHistory(assetId: number): Promise<TrustAssetHistory[]>;
  createTrustAssetHistory(historyData: InsertTrustAssetHistory): Promise<TrustAssetHistory>;
  getTrustAssetHistoryByActionType(trustId: number, actionType: string): Promise<TrustAssetHistory[]>;
  
  // Trust Distributions operations
  getTrustDistributions(trustId?: number, beneficiaryId?: number): Promise<TrustDistribution[]>;
  getTrustDistribution(id: number): Promise<TrustDistribution | undefined>;
  createTrustDistribution(distributionData: InsertTrustDistribution): Promise<TrustDistribution>;
  updateTrustDistribution(id: number, distributionData: Partial<TrustDistribution>): Promise<TrustDistribution | undefined>;
  deleteTrustDistribution(id: number): Promise<boolean>;
  
  // Trust Documents operations
  getTrustDocuments(trustId?: number): Promise<TrustDocument[]>;
  getTrustDocument(id: number): Promise<TrustDocument | undefined>;
  createTrustDocument(documentData: InsertTrustDocument): Promise<TrustDocument>;
  updateTrustDocument(id: number, documentData: Partial<TrustDocument>): Promise<TrustDocument | undefined>;
  deleteTrustDocument(id: number): Promise<boolean>;
  
  // Trust Compliance operations
  getTrustCompliance(trustId?: number): Promise<TrustCompliance[]>;
  getTrustComplianceItem(id: number): Promise<TrustCompliance | undefined>;
  createTrustCompliance(complianceData: InsertTrustCompliance): Promise<TrustCompliance>;
  updateTrustCompliance(id: number, complianceData: Partial<TrustCompliance>): Promise<TrustCompliance | undefined>;
  deleteTrustCompliance(id: number): Promise<boolean>;
  
  // Trust Meetings operations
  getTrustMeetings(trustId?: number): Promise<TrustMeeting[]>;
  getTrustMeeting(id: number): Promise<TrustMeeting | undefined>;
  createTrustMeeting(meetingData: InsertTrustMeeting): Promise<TrustMeeting>;
  updateTrustMeeting(id: number, meetingData: Partial<TrustMeeting>): Promise<TrustMeeting | undefined>;
  deleteTrustMeeting(id: number): Promise<boolean>;
  
  // Industry Tiles operations
  getIndustryTiles(): Promise<IndustryTile[]>;
  getIndustryTile(id: number): Promise<IndustryTile | undefined>;
  getIndustryTileBySlug(slug: string): Promise<IndustryTile | undefined>;
  createIndustryTile(tileData: InsertIndustryTile): Promise<IndustryTile>;
  updateIndustryTile(id: number, tileData: Partial<IndustryTile>): Promise<IndustryTile | undefined>;
  deleteIndustryTile(id: number): Promise<boolean>;
  
  // Industry Tile Services operations
  getIndustryTileServices(tileId: number): Promise<IndustryTileService[]>;
  getServicesForTile(tileId: number): Promise<Service[]>;
  addServiceToTile(tileId: number, serviceId: number, displayOrder?: number): Promise<IndustryTileService>;
  removeServiceFromTile(tileId: number, serviceId: number): Promise<boolean>;
  updateTileServiceOrder(tileId: number, serviceId: number, displayOrder: number): Promise<IndustryTileService | undefined>;
  
  // Hero carousel slide operations
  getHeroSlides(includeInactive?: boolean): Promise<HeroSlide[]>;
  getHeroSlide(id: number): Promise<HeroSlide | undefined>;
  createHeroSlide(slide: InsertHeroSlide): Promise<HeroSlide>;
  updateHeroSlide(id: number, slide: Partial<InsertHeroSlide>): Promise<HeroSlide | undefined>;
  deleteHeroSlide(id: number): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private services: Map<number, Service>;
  private bookings: Map<number, Booking>;
  private galleries: Map<number, Gallery>;
  private beforeAfterImages: Map<number, BeforeAfterImage>;
  private blogPosts: Map<number, BlogPost>;
  private testimonials: Map<number, Testimonial>;
  private contactMessages: Map<number, ContactMessage>;
  private quotes: Map<number, any>;
  private socialMediaAccounts: Map<number, SocialMediaAccount>;
  private socialPosts: Map<number, SocialPost>;
  private departments: Map<number, Department>;
  private employees: Map<number, Employee>;
  private payrollPeriods: Map<number, PayrollPeriod>;
  private payrollEntries: Map<number, PayrollEntry>;
  private timeEntries: Map<number, TimeEntry>;
  private customers: Map<number, Customer>;
  private customerInteractions: Map<number, CustomerInteraction>;
  private customerDeals: Map<number, CustomerDeal>;
  private customerTasks: Map<number, CustomerTask>;
  private clientProjects: Map<number, ClientProject>;
  public sessionStore: session.SessionStore;
  private userCounter: number;
  private serviceCounter: number;
  private bookingCounter: number;
  private galleryCounter: number;
  private beforeAfterImageCounter: number;
  private blogPostCounter: number;
  private testimonialCounter: number;
  private contactMessageCounter: number;
  private quoteCounter: number;
  private socialMediaAccountCounter: number;
  private socialPostCounter: number;
  private departmentCounter: number;
  private employeeCounter: number;
  private payrollPeriodCounter: number;
  private payrollEntryCounter: number;
  private timeEntryCounter: number;
  private customerCounter: number;
  private customerInteractionCounter: number;
  private customerDealCounter: number;
  private customerTaskCounter: number;
  private clientProjectCounter: number;
  private projectMilestones: Map<number, ProjectMilestone>;
  private projectMilestoneCounter: number;
  private projectTasks: Map<number, ProjectTask>;
  private projectTaskCounter: number;
  private taskFiles: Map<number, TaskFile>;
  private taskFileCounter: number;
  private taskMessages: Map<number, TaskMessage>;
  private taskMessageCounter: number;
  private timelapseItems: Map<number, TimelapseItem>;
  private timelapseItemCounter: number;
  private notifications: Map<number, Notification>;
  private notificationCounter: number;

  constructor() {
    this.users = new Map<number, User>();
    this.services = new Map<number, Service>();
    this.bookings = new Map<number, Booking>();
    this.galleries = new Map<number, Gallery>();
    this.beforeAfterImages = new Map<number, BeforeAfterImage>();
    this.blogPosts = new Map<number, BlogPost>();
    this.testimonials = new Map<number, Testimonial>();
    this.contactMessages = new Map<number, ContactMessage>();
    this.quotes = new Map<number, any>();
    this.socialMediaAccounts = new Map<number, SocialMediaAccount>();
    this.socialPosts = new Map<number, SocialPost>();
    this.departments = new Map<number, Department>();
    this.employees = new Map<number, Employee>();
    this.payrollPeriods = new Map<number, PayrollPeriod>();
    this.payrollEntries = new Map<number, PayrollEntry>();
    this.timeEntries = new Map<number, TimeEntry>();
    this.droneAnalyticsMap = new Map<number, DroneAnalytics>();
    this.flightLogsMap = new Map<number, FlightLog>();
    this.projectAnalyticsMap = new Map<number, ProjectAnalytics>();
    this.clientAnalyticsMap = new Map<number, ClientAnalytics>();
    this.marketingAnalyticsMap = new Map<number, MarketingAnalytics>();
    this.analyticsReportsMap = new Map<number, AnalyticsReport>();
    this.customers = new Map<number, Customer>();
    this.customerInteractions = new Map<number, CustomerInteraction>();
    this.customerDeals = new Map<number, CustomerDeal>();
    this.customerTasks = new Map<number, CustomerTask>();
    this.clientProjects = new Map<number, ClientProject>();
    this.projectMilestones = new Map<number, ProjectMilestone>();
    this.projectTasks = new Map<number, ProjectTask>();
    this.taskFiles = new Map<number, TaskFile>();
    this.taskMessages = new Map<number, TaskMessage>();
    this.timelapseItems = new Map<number, TimelapseItem>();
    this.notifications = new Map<number, Notification>();
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000
    });
    this.userCounter = 1;
    this.serviceCounter = 1;
    this.bookingCounter = 1;
    this.galleryCounter = 1;
    this.beforeAfterImageCounter = 1;
    this.blogPostCounter = 1;
    this.testimonialCounter = 1;
    this.contactMessageCounter = 1;
    this.quoteCounter = 1;
    this.socialMediaAccountCounter = 1;
    this.socialPostCounter = 1;
    this.departmentCounter = 1;
    this.employeeCounter = 1;
    this.payrollPeriodCounter = 1;
    this.payrollEntryCounter = 1;
    this.timeEntryCounter = 1;
    this.droneAnalyticsCounter = 1;
    this.flightLogsCounter = 1;
    this.projectAnalyticsCounter = 1;
    this.clientAnalyticsCounter = 1;
    this.marketingAnalyticsCounter = 1;
    this.analyticsReportsCounter = 1;
    this.customerCounter = 1;
    this.customerInteractionCounter = 1;
    this.customerDealCounter = 1;
    this.customerTaskCounter = 1;
    this.clientProjectCounter = 1;
    this.projectMilestoneCounter = 1;
    this.projectTaskCounter = 1;
    this.taskFileCounter = 1;
    this.taskMessageCounter = 1;
    this.timelapseItemCounter = 1;
    this.notificationCounter = 1;
    
    // Initialize with default users (admin)
    this.initDefaultUsers();
    
    // Initialize with default services
    this.initDefaultServices();
  }

  private initDefaultUsers() {
    // Create a default admin user for testing
    // Using a pre-hashed password in the format that auth.ts expects:
    // The format is: hashedPassword.salt
    const hashedPassword = "dc3055a194a97aa72a41e31922152ce8d0a00b0a6b11ed1312cb486f2abe9870ac0f81db7eee5c74d6055aa97c9a69ac7e4725a3021711c34c6b816a5d9b9104.b51e7ac11ea3515cc2c27e3b62a55a8c";
    
    this.createUser({
      username: "admin@apollodronesinc.com",
      password: hashedPassword, // Pre-hashed "admin123"
      email: "admin@apollodronesinc.com",
      firstName: "Admin",
      lastName: "User",
      isAdmin: true
    });
    
    // Initialize CRM data after creating users
    this.initDefaultCRMData();
  }
  
  private async initDefaultCRMData() {
    // Create sample customers
    const customer1 = await this.createCustomer({
      name: "Skyview Properties",
      email: "contact@skyviewproperties.com",
      phone: "555-123-4567",
      address: "123 High Rise Blvd, Austin, TX 78701",
      company: "Skyview Properties LLC",
      type: "Real Estate",
      status: "Active",
      assignedTo: 1, // Admin user
      source: "Website",
      notes: "Large real estate development company, interested in regular aerial photography for new developments."
    });
    
    const customer2 = await this.createCustomer({
      name: "Green Earth Construction",
      email: "projects@greenearthconstruction.com",
      phone: "555-987-6543",
      address: "456 Builder Ave, Austin, TX 78702",
      company: "Green Earth Construction Inc.",
      type: "Construction",
      status: "Active",
      assignedTo: 1, // Admin user
      source: "Referral",
      notes: "Eco-friendly construction company, needs weekly progress monitoring of multiple sites."
    });
    
    const customer3 = await this.createCustomer({
      name: "Highland Events",
      email: "bookings@highlandevents.com",
      phone: "555-789-0123",
      address: "789 Festival Road, Austin, TX 78704",
      company: "Highland Events Management",
      type: "Events",
      status: "Prospect",
      assignedTo: 1, // Admin user
      source: "Trade Show",
      notes: "Outdoor event management company, interested in aerial footage of festivals and large gatherings."
    });
    
    // Create interactions for the first customer
    await this.createCustomerInteraction({
      customerId: customer1.id,
      interactionType: "Meeting",
      interactionDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
      notes: "Initial consultation about their new development project in West Austin. They're looking for monthly progress shots and marketing material.",
      outcome: "Positive"
    });
    
    await this.createCustomerInteraction({
      customerId: customer1.id,
      interactionType: "Email",
      interactionDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
      notes: "Sent quote for monthly service package. Awaiting response.",
      outcome: "Pending"
    });
    
    // Create interactions for the second customer
    await this.createCustomerInteraction({
      customerId: customer2.id,
      interactionType: "Call",
      interactionDate: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000), // 14 days ago
      notes: "Discussed their need for weekly construction site monitoring. They have 3 active sites that need documentation.",
      outcome: "Positive"
    });
    
    await this.createCustomerInteraction({
      customerId: customer2.id,
      interactionType: "Meeting",
      interactionDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
      notes: "On-site assessment of their downtown project. Mapped out flight paths and discussed deliverables.",
      outcome: "Positive"
    });
    
    await this.createCustomerInteraction({
      customerId: customer2.id,
      interactionType: "Email",
      interactionDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
      notes: "Confirmed start date for weekly monitoring. First flight scheduled for next Monday.",
      outcome: "Success"
    });
    
    // Create deals
    await this.createCustomerDeal({
      customerId: customer1.id,
      title: "Skyview Quarterly Package",
      value: 12000, // $12,000
      stage: "Proposal",
      expectedCloseDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
      description: "Quarterly aerial photography package for 4 properties, including editing and delivery of high-res images.",
      notes: "Client is also considering adding video service for an additional $4,000."
    });
    
    await this.createCustomerDeal({
      customerId: customer2.id,
      title: "Weekly Construction Monitoring",
      value: 24000, // $24,000
      stage: "Closed Won",
      expectedCloseDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // Yesterday
      closedDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // Yesterday
      description: "Weekly monitoring of 3 construction sites for 6 months. Includes progress photos, site mapping, and monthly reports.",
      notes: "Contract signed and deposit received. Starting next week."
    });
    
    await this.createCustomerDeal({
      customerId: customer3.id,
      title: "Summer Music Festival Coverage",
      value: 8500, // $8,500
      stage: "Negotiation",
      expectedCloseDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000), // 21 days from now
      description: "Aerial photography and videography for their 3-day summer music festival in July.",
      notes: "They're comparing quotes from competitors. Need to follow up next week."
    });
    
    // Create tasks
    await this.createCustomerTask({
      customerId: customer1.id,
      title: "Send Skyview contract",
      description: "Prepare and send the final contract for the quarterly package.",
      dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
      priority: "High",
      status: "To Do",
      assignedTo: 1 // Admin user
    });
    
    await this.createCustomerTask({
      customerId: customer2.id,
      title: "Prepare flight plans",
      description: "Create detailed flight plans for all 3 construction sites.",
      dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
      priority: "High",
      status: "In Progress",
      assignedTo: 1 // Admin user
    });
    
    await this.createCustomerTask({
      customerId: customer3.id,
      title: "Follow up on quote",
      description: "Call Highland Events to discuss their quote and address any questions.",
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      priority: "Medium",
      status: "To Do",
      assignedTo: 1 // Admin user
    });
  }

  private initDefaultServices() {
    const defaultServices: InsertService[] = [
      {
        name: "Real Estate Photography",
        description: "Showcase properties with stunning aerial photos that highlight features, location, and surroundings.",
        price: 29900, // $299.00
        imageUrl: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80"
      },
      {
        name: "Aerial Videography",
        description: "Cinematic aerial footage for real estate, events, or promotional content in 4K resolution.",
        price: 44900, // $449.00
        imageUrl: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80"
      },
      {
        name: "Photogrammetry & 3D Models",
        description: "Create precise 3D models and maps of properties, construction sites, or landscapes.",
        price: 69900, // $699.00
        imageUrl: "https://images.unsplash.com/photo-1563589173576-88d5e8f10177?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80"
      },
      {
        name: "Construction Monitoring",
        description: "Regular progress documentation of construction sites with consistent angles and coverage.",
        price: 54900, // $549.00
        imageUrl: "https://images.unsplash.com/photo-1591588582259-e675bd2e6088?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80"
      },
      {
        name: "Event Coverage",
        description: "Aerial photography and videography for special events, festivals, and gatherings.",
        price: 39900, // $399.00
        imageUrl: "https://images.unsplash.com/photo-1523824086175-92ecba3f1293?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80"
      },
      {
        name: "Timelapse Creation",
        description: "Dynamic timelapse videos documenting construction progress or environmental changes.",
        price: 79900, // $799.00
        imageUrl: "https://images.unsplash.com/photo-1599940824399-b87987ceb72a?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80"
      }
    ];

    defaultServices.forEach(service => this.createService(service));
  }

  // User operations
  async getUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }
  
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username.toLowerCase() === username.toLowerCase()
    );
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.email.toLowerCase() === email.toLowerCase()
    );
  }

  async createUser(userData: InsertUser): Promise<User> {
    const id = this.userCounter++;
    const createdAt = new Date();
    const user: User = { ...userData, id, createdAt };
    this.users.set(id, user);
    return user;
  }

  async updateUser(id: number, userData: Partial<User>): Promise<User | undefined> {
    const user = await this.getUser(id);
    if (!user) return undefined;
    
    const updatedUser = { ...user, ...userData };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  // Service operations
  async getServices(): Promise<Service[]> {
    return Array.from(this.services.values());
  }

  async getService(id: number): Promise<Service | undefined> {
    return this.services.get(id);
  }

  async createService(serviceData: InsertService): Promise<Service> {
    const id = this.serviceCounter++;
    const createdAt = new Date();
    const updatedAt = new Date();
    const service: Service = { ...serviceData, id, createdAt, updatedAt };
    this.services.set(id, service);
    return service;
  }

  async updateService(id: number, serviceData: Partial<Service>): Promise<Service | undefined> {
    const service = await this.getService(id);
    if (!service) return undefined;
    
    const updatedService = { 
      ...service, 
      ...serviceData, 
      updatedAt: new Date() 
    };
    this.services.set(id, updatedService);
    return updatedService;
  }

  async deleteService(id: number): Promise<boolean> {
    const bookingCount = Array.from(this.bookings.values()).filter(
      (b) => b.serviceId === id,
    ).length;
    if (bookingCount > 0) {
      const { ServiceHasBookingsError } = await import("./database-storage");
      throw new ServiceHasBookingsError(id, bookingCount);
    }
    return this.services.delete(id);
  }

  // Service bundle discount operations
  async getServiceBundleDiscounts(): Promise<ServiceBundleDiscount[]> {
    return [];
  }

  // Booking operations
  async getBookings(): Promise<Booking[]> {
    return Array.from(this.bookings.values());
  }

  async getBooking(id: number): Promise<Booking | undefined> {
    return this.bookings.get(id);
  }

  async getUserBookings(userId: number): Promise<Booking[]> {
    return Array.from(this.bookings.values()).filter(
      (booking) => booking.userId === userId
    );
  }

  async createBooking(bookingData: InsertBooking): Promise<Booking> {
    const id = this.bookingCounter++;
    const createdAt = new Date();
    const booking: Booking = { ...bookingData, id, createdAt };
    this.bookings.set(id, booking);
    return booking;
  }

  async updateBooking(id: number, bookingData: Partial<Booking>): Promise<Booking | undefined> {
    const booking = await this.getBooking(id);
    if (!booking) return undefined;
    
    const updatedBooking = { ...booking, ...bookingData };
    this.bookings.set(id, updatedBooking);
    return updatedBooking;
  }

  async deleteBooking(id: number): Promise<boolean> {
    return this.bookings.delete(id);
  }

  // Gallery operations
  async getGalleries(): Promise<Gallery[]> {
    return Array.from(this.galleries.values());
  }

  async getGallery(id: number): Promise<Gallery | undefined> {
    return this.galleries.get(id);
  }

  async getUserGalleries(userId: number): Promise<Gallery[]> {
    return Array.from(this.galleries.values()).filter(
      (gallery) => gallery.userId === userId
    );
  }

  async getPublicGalleries(): Promise<Gallery[]> {
    return Array.from(this.galleries.values()).filter(
      (gallery) => gallery.isPublic
    );
  }

  async createGallery(galleryData: InsertGallery): Promise<Gallery> {
    const id = this.galleryCounter++;
    const createdAt = new Date();
    const gallery: Gallery = { ...galleryData, id, createdAt };
    this.galleries.set(id, gallery);
    return gallery;
  }

  async updateGallery(id: number, galleryData: Partial<Gallery>): Promise<Gallery | undefined> {
    const gallery = await this.getGallery(id);
    if (!gallery) return undefined;
    
    const updatedGallery = { ...gallery, ...galleryData };
    this.galleries.set(id, updatedGallery);
    return updatedGallery;
  }

  async deleteGallery(id: number): Promise<boolean> {
    return this.galleries.delete(id);
  }

  // Before/After Image operations
  async getBeforeAfterImages(): Promise<BeforeAfterImage[]> {
    return Array.from(this.beforeAfterImages.values());
  }

  async getBeforeAfterImage(id: number): Promise<BeforeAfterImage | undefined> {
    return this.beforeAfterImages.get(id);
  }

  async getPublicBeforeAfterImages(): Promise<BeforeAfterImage[]> {
    return Array.from(this.beforeAfterImages.values()).filter(
      (image) => image.isPublic
    );
  }

  async createBeforeAfterImage(imageData: InsertBeforeAfterImage): Promise<BeforeAfterImage> {
    const id = this.beforeAfterImageCounter++;
    const createdAt = new Date();
    const image: BeforeAfterImage = { ...imageData, id, createdAt };
    this.beforeAfterImages.set(id, image);
    return image;
  }

  async updateBeforeAfterImage(id: number, imageData: Partial<BeforeAfterImage>): Promise<BeforeAfterImage | undefined> {
    const image = await this.getBeforeAfterImage(id);
    if (!image) return undefined;
    
    const updatedImage = { ...image, ...imageData };
    this.beforeAfterImages.set(id, updatedImage);
    return updatedImage;
  }

  async deleteBeforeAfterImage(id: number): Promise<boolean> {
    return this.beforeAfterImages.delete(id);
  }

  // Blog Post operations
  async getBlogPosts(): Promise<BlogPost[]> {
    return Array.from(this.blogPosts.values());
  }

  async getBlogPost(id: number): Promise<BlogPost | undefined> {
    return this.blogPosts.get(id);
  }

  async createBlogPost(blogPostData: InsertBlogPost): Promise<BlogPost> {
    const id = this.blogPostCounter++;
    const createdAt = new Date();
    const updatedAt = new Date();
    const blogPost: BlogPost = { ...blogPostData, id, createdAt, updatedAt };
    this.blogPosts.set(id, blogPost);
    return blogPost;
  }

  async updateBlogPost(id: number, blogPostData: Partial<BlogPost>): Promise<BlogPost | undefined> {
    const blogPost = await this.getBlogPost(id);
    if (!blogPost) return undefined;
    
    const updatedBlogPost = { 
      ...blogPost, 
      ...blogPostData, 
      updatedAt: new Date() 
    };
    this.blogPosts.set(id, updatedBlogPost);
    return updatedBlogPost;
  }

  async deleteBlogPost(id: number): Promise<boolean> {
    return this.blogPosts.delete(id);
  }

  // Testimonial operations
  async getTestimonials(): Promise<Testimonial[]> {
    return Array.from(this.testimonials.values());
  }

  async getApprovedTestimonials(): Promise<Testimonial[]> {
    return Array.from(this.testimonials.values()).filter(
      (testimonial) => testimonial.isApproved
    );
  }

  async getTestimonial(id: number): Promise<Testimonial | undefined> {
    return this.testimonials.get(id);
  }

  async createTestimonial(testimonialData: InsertTestimonial): Promise<Testimonial> {
    const id = this.testimonialCounter++;
    const createdAt = new Date();
    const testimonial: Testimonial = { ...testimonialData, id, createdAt };
    this.testimonials.set(id, testimonial);
    return testimonial;
  }

  async updateTestimonial(id: number, testimonialData: Partial<Testimonial>): Promise<Testimonial | undefined> {
    const testimonial = await this.getTestimonial(id);
    if (!testimonial) return undefined;
    
    const updatedTestimonial = { ...testimonial, ...testimonialData };
    this.testimonials.set(id, updatedTestimonial);
    return updatedTestimonial;
  }

  async deleteTestimonial(id: number): Promise<boolean> {
    return this.testimonials.delete(id);
  }

  // Contact Message operations
  async getContactMessages(): Promise<ContactMessage[]> {
    return Array.from(this.contactMessages.values());
  }

  async getContactMessage(id: number): Promise<ContactMessage | undefined> {
    return this.contactMessages.get(id);
  }

  async createContactMessage(messageData: InsertContactMessage): Promise<ContactMessage> {
    const id = this.contactMessageCounter++;
    const createdAt = new Date();
    const message: ContactMessage = { ...messageData, id, createdAt };
    this.contactMessages.set(id, message);
    return message;
  }

  async updateContactMessage(id: number, messageData: Partial<ContactMessage>): Promise<ContactMessage | undefined> {
    const message = await this.getContactMessage(id);
    if (!message) return undefined;
    
    const updatedMessage = { ...message, ...messageData };
    this.contactMessages.set(id, updatedMessage);
    return updatedMessage;
  }

  async deleteContactMessage(id: number): Promise<boolean> {
    return this.contactMessages.delete(id);
  }
  
  // Quote operations
  async getQuotes(userId?: number): Promise<any[]> {
    if (userId) {
      return Array.from(this.quotes.values()).filter(
        (quote) => quote.userId === userId
      );
    }
    return Array.from(this.quotes.values());
  }

  async getQuote(id: number): Promise<any | undefined> {
    return this.quotes.get(id);
  }

  async createQuote(quoteData: any): Promise<any> {
    const id = this.quoteCounter++;
    const createdAt = new Date();
    const updatedAt = new Date();
    const quote = { ...quoteData, id, createdAt, updatedAt };
    this.quotes.set(id, quote);
    return quote;
  }

  async updateQuote(id: number, quoteData: Partial<any>): Promise<any | undefined> {
    const quote = await this.getQuote(id);
    if (!quote) return undefined;
    
    const updatedQuote = { 
      ...quote, 
      ...quoteData, 
      updatedAt: new Date() 
    };
    this.quotes.set(id, updatedQuote);
    return updatedQuote;
  }

  async deleteQuote(id: number): Promise<boolean> {
    return this.quotes.delete(id);
  }
  
  // Business Config operations
  private businessConfig: BusinessConfig | undefined;
  
  async getBusinessConfig(): Promise<BusinessConfig | undefined> {
    return this.businessConfig;
  }
  
  async updateBusinessConfig(configData: Partial<BusinessConfig>): Promise<BusinessConfig> {
    const now = new Date();
    
    if (!this.businessConfig) {
      // Create a default business config if it doesn't exist
      this.businessConfig = {
        id: 1,
        name: 'default',
        depreciableAssets: "10000",
        targetMissionsPerWeek: "3",
        targetReinvestmentYears: "2", 
        yearlyAdvertisementCost: "2000",
        yearlyInsuranceCost: "1500",
        createdAt: now,
        updatedAt: now
      };
    }
    
    // Update with provided data
    this.businessConfig = {
      ...this.businessConfig,
      ...configData,
      updatedAt: now
    };
    
    return this.businessConfig;
  }
  
  // Social Media Account operations
  async getSocialMediaAccounts(userId: number): Promise<SocialMediaAccount[]> {
    return Array.from(this.socialMediaAccounts.values()).filter(
      (account) => account.userId === userId
    );
  }
  
  async getSocialMediaAccount(id: number): Promise<SocialMediaAccount | undefined> {
    return this.socialMediaAccounts.get(id);
  }
  
  async getSocialMediaAccountByPlatform(userId: number, platform: string): Promise<SocialMediaAccount | undefined> {
    return Array.from(this.socialMediaAccounts.values()).find(
      (account) => account.userId === userId && account.platform === platform
    );
  }
  
  async createSocialMediaAccount(accountData: InsertSocialMediaAccount): Promise<SocialMediaAccount> {
    const id = this.socialMediaAccountCounter++;
    const createdAt = new Date();
    const updatedAt = new Date();
    const account: SocialMediaAccount = { ...accountData, id, createdAt, updatedAt };
    this.socialMediaAccounts.set(id, account);
    return account;
  }
  
  async updateSocialMediaAccount(id: number, accountData: Partial<SocialMediaAccount>): Promise<SocialMediaAccount | undefined> {
    const account = await this.getSocialMediaAccount(id);
    if (!account) return undefined;
    
    const updatedAccount = { 
      ...account, 
      ...accountData, 
      updatedAt: new Date() 
    };
    this.socialMediaAccounts.set(id, updatedAccount);
    return updatedAccount;
  }
  
  async deleteSocialMediaAccount(id: number): Promise<boolean> {
    return this.socialMediaAccounts.delete(id);
  }
  
  // Social Post operations
  async getSocialPosts(userId: number): Promise<SocialPost[]> {
    return Array.from(this.socialPosts.values()).filter(
      (post) => post.userId === userId
    );
  }
  
  async getSocialPost(id: number): Promise<SocialPost | undefined> {
    return this.socialPosts.get(id);
  }
  
  async createSocialPost(postData: InsertSocialPost): Promise<SocialPost> {
    const id = this.socialPostCounter++;
    const createdAt = new Date();
    const updatedAt = new Date();
    const post: SocialPost = { ...postData, id, createdAt, updatedAt };
    this.socialPosts.set(id, post);
    return post;
  }
  
  async updateSocialPost(id: number, postData: Partial<SocialPost>): Promise<SocialPost | undefined> {
    const post = await this.getSocialPost(id);
    if (!post) return undefined;
    
    const updatedPost = { 
      ...post, 
      ...postData, 
      updatedAt: new Date() 
    };
    this.socialPosts.set(id, updatedPost);
    return updatedPost;
  }
  
  async deleteSocialPost(id: number): Promise<boolean> {
    return this.socialPosts.delete(id);
  }

  // Drone Analytics operations
  async getDrones(): Promise<DroneAnalytics[]> {
    return Array.from(this.getDronesMap().values());
  }

  async getDrone(id: number): Promise<DroneAnalytics | undefined> {
    return this.getDronesMap().get(id);
  }

  async createDrone(droneData: InsertDroneAnalytics): Promise<DroneAnalytics> {
    const id = this.getDroneCounter();
    const drone: DroneAnalytics = {
      ...droneData,
      id,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.getDronesMap().set(id, drone);
    return drone;
  }

  async updateDrone(id: number, droneData: Partial<DroneAnalytics>): Promise<DroneAnalytics | undefined> {
    const drone = this.getDronesMap().get(id);
    if (!drone) return undefined;
    
    const updatedDrone = {
      ...drone,
      ...droneData,
      updatedAt: new Date()
    };
    this.getDronesMap().set(id, updatedDrone);
    return updatedDrone;
  }

  async deleteDrone(id: number): Promise<boolean> {
    return this.getDronesMap().delete(id);
  }

  // Flight Log operations
  async getFlightLogs(filters?: { droneId?: number, startDate?: string, endDate?: string }): Promise<FlightLog[]> {
    let logs = Array.from(this.getFlightLogsMap().values());
    
    if (filters) {
      if (filters.droneId) {
        logs = logs.filter(log => log.droneId === filters.droneId);
      }
      
      if (filters.startDate) {
        const startDate = new Date(filters.startDate);
        logs = logs.filter(log => new Date(log.flightDate) >= startDate);
      }
      
      if (filters.endDate) {
        const endDate = new Date(filters.endDate);
        logs = logs.filter(log => new Date(log.flightDate) <= endDate);
      }
    }
    
    return logs;
  }

  async getFlightLog(id: number): Promise<FlightLog | undefined> {
    return this.getFlightLogsMap().get(id);
  }

  async createFlightLog(logData: InsertFlightLog): Promise<FlightLog> {
    const id = this.getFlightLogCounter();
    const log: FlightLog = {
      ...logData,
      id,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.getFlightLogsMap().set(id, log);
    return log;
  }

  async updateFlightLog(id: number, logData: Partial<FlightLog>): Promise<FlightLog | undefined> {
    const log = this.getFlightLogsMap().get(id);
    if (!log) return undefined;
    
    const updatedLog = {
      ...log,
      ...logData,
      updatedAt: new Date()
    };
    this.getFlightLogsMap().set(id, updatedLog);
    return updatedLog;
  }

  async deleteFlightLog(id: number): Promise<boolean> {
    return this.getFlightLogsMap().delete(id);
  }

  // Project Analytics operations
  async getProjectAnalytics(filters?: { startDate?: string, endDate?: string, serviceType?: string }): Promise<ProjectAnalytics[]> {
    let projects = Array.from(this.getProjectAnalyticsMap().values());
    
    if (filters) {
      if (filters.serviceType) {
        projects = projects.filter(project => project.serviceType === filters.serviceType);
      }
      
      if (filters.startDate) {
        const startDate = new Date(filters.startDate);
        projects = projects.filter(project => new Date(project.completionDate) >= startDate);
      }
      
      if (filters.endDate) {
        const endDate = new Date(filters.endDate);
        projects = projects.filter(project => new Date(project.completionDate) <= endDate);
      }
    }
    
    return projects;
  }

  async getProjectAnalytic(id: number): Promise<ProjectAnalytics | undefined> {
    return this.getProjectAnalyticsMap().get(id);
  }

  async createProjectAnalytic(projectData: InsertProjectAnalytics): Promise<ProjectAnalytics> {
    const id = this.getProjectAnalyticCounter();
    const project: ProjectAnalytics = {
      ...projectData,
      id,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.getProjectAnalyticsMap().set(id, project);
    return project;
  }

  async updateProjectAnalytic(id: number, projectData: Partial<ProjectAnalytics>): Promise<ProjectAnalytics | undefined> {
    const project = this.getProjectAnalyticsMap().get(id);
    if (!project) return undefined;
    
    const updatedProject = {
      ...project,
      ...projectData,
      updatedAt: new Date()
    };
    this.getProjectAnalyticsMap().set(id, updatedProject);
    return updatedProject;
  }

  async deleteProjectAnalytic(id: number): Promise<boolean> {
    return this.getProjectAnalyticsMap().delete(id);
  }

  // Client Analytics operations
  async getClientAnalytics(filters?: { startDate?: string, endDate?: string }): Promise<ClientAnalytics[]> {
    let clients = Array.from(this.getClientAnalyticsMap().values());
    
    if (filters) {
      if (filters.startDate) {
        const startDate = new Date(filters.startDate);
        clients = clients.filter(client => {
          if (!client.acquisitionDate) return true;
          return new Date(client.acquisitionDate) >= startDate;
        });
      }
      
      if (filters.endDate) {
        const endDate = new Date(filters.endDate);
        clients = clients.filter(client => {
          if (!client.acquisitionDate) return true;
          return new Date(client.acquisitionDate) <= endDate;
        });
      }
    }
    
    return clients;
  }

  async getClientAnalytic(id: number): Promise<ClientAnalytics | undefined> {
    return this.getClientAnalyticsMap().get(id);
  }

  async getClientAnalyticByUserId(userId: number): Promise<ClientAnalytics | undefined> {
    return Array.from(this.getClientAnalyticsMap().values()).find(client => client.clientId === userId);
  }

  async createClientAnalytic(clientData: InsertClientAnalytics): Promise<ClientAnalytics> {
    const id = this.getClientAnalyticCounter();
    const client: ClientAnalytics = {
      ...clientData,
      id,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.getClientAnalyticsMap().set(id, client);
    return client;
  }

  async updateClientAnalytic(id: number, clientData: Partial<ClientAnalytics>): Promise<ClientAnalytics | undefined> {
    const client = this.getClientAnalyticsMap().get(id);
    if (!client) return undefined;
    
    const updatedClient = {
      ...client,
      ...clientData,
      updatedAt: new Date()
    };
    this.getClientAnalyticsMap().set(id, updatedClient);
    return updatedClient;
  }

  async deleteClientAnalytic(id: number): Promise<boolean> {
    return this.getClientAnalyticsMap().delete(id);
  }

  // Marketing Analytics operations
  async getMarketingAnalytics(filters?: { startDate?: string, endDate?: string, channel?: string }): Promise<MarketingAnalytics[]> {
    let marketing = Array.from(this.getMarketingAnalyticsMap().values());
    
    if (filters) {
      if (filters.channel) {
        marketing = marketing.filter(m => m.source === filters.channel);
      }
      
      if (filters.startDate) {
        const startDate = new Date(filters.startDate);
        marketing = marketing.filter(m => new Date(m.date) >= startDate);
      }
      
      if (filters.endDate) {
        const endDate = new Date(filters.endDate);
        marketing = marketing.filter(m => new Date(m.date) <= endDate);
      }
    }
    
    return marketing;
  }

  async getMarketingAnalytic(id: number): Promise<MarketingAnalytics | undefined> {
    return this.getMarketingAnalyticsMap().get(id);
  }

  async createMarketingAnalytic(marketingData: Partial<MarketingAnalytics>): Promise<MarketingAnalytics> {
    const id = this.getMarketingAnalyticCounter();
    const marketing = {
      ...marketingData,
      id,
      createdAt: new Date(),
      updatedAt: new Date()
    } as MarketingAnalytics;
    this.getMarketingAnalyticsMap().set(id, marketing);
    return marketing;
  }

  async updateMarketingAnalytic(id: number, marketingData: Partial<MarketingAnalytics>): Promise<MarketingAnalytics | undefined> {
    const marketing = this.getMarketingAnalyticsMap().get(id);
    if (!marketing) return undefined;
    
    const updatedMarketing = {
      ...marketing,
      ...marketingData,
      updatedAt: new Date()
    };
    this.getMarketingAnalyticsMap().set(id, updatedMarketing);
    return updatedMarketing;
  }

  async deleteMarketingAnalytic(id: number): Promise<boolean> {
    return this.getMarketingAnalyticsMap().delete(id);
  }

  // Analytics Reports operations
  async getAnalyticsReports(): Promise<AnalyticsReport[]> {
    return Array.from(this.getAnalyticsReportsMap().values());
  }

  async getAnalyticsReport(id: number): Promise<AnalyticsReport | undefined> {
    return this.getAnalyticsReportsMap().get(id);
  }

  async createAnalyticsReport(reportData: InsertAnalyticsReport): Promise<AnalyticsReport> {
    const id = this.getAnalyticsReportCounter();
    const report: AnalyticsReport = {
      ...reportData,
      id,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.getAnalyticsReportsMap().set(id, report);
    return report;
  }

  async updateAnalyticsReport(id: number, reportData: Partial<AnalyticsReport>): Promise<AnalyticsReport | undefined> {
    const report = this.getAnalyticsReportsMap().get(id);
    if (!report) return undefined;
    
    const updatedReport = {
      ...report,
      ...reportData,
      updatedAt: new Date()
    };
    this.getAnalyticsReportsMap().set(id, updatedReport);
    return updatedReport;
  }

  async deleteAnalyticsReport(id: number): Promise<boolean> {
    return this.getAnalyticsReportsMap().delete(id);
  }

  // Additional Analytics API Endpoints
  async getRevenueAnalytics(filters: { startDate?: string, endDate?: string, groupBy?: 'day' | 'week' | 'month' | 'year' }): Promise<any[]> {
    // This is a placeholder implementation for revenue analytics
    return [
      { date: '2024-01', revenue: 15000, cost: 5000, profit: 10000 },
      { date: '2024-02', revenue: 17500, cost: 6000, profit: 11500 },
      { date: '2024-03', revenue: 22000, cost: 7500, profit: 14500 }
    ];
  }

  async getConversionAnalytics(filters: { startDate?: string, endDate?: string, channel?: string }): Promise<any[]> {
    // This is a placeholder implementation for conversion analytics
    return [
      { channel: 'Instagram', leads: 30, conversions: 10, rate: 33.3 },
      { channel: 'Google Ads', leads: 45, conversions: 15, rate: 33.3 },
      { channel: 'Facebook', leads: 25, conversions: 8, rate: 32.0 }
    ];
  }

  async getROIAnalytics(filters: { startDate?: string, endDate?: string, channel?: string }): Promise<any[]> {
    // This is a placeholder implementation for ROI analytics
    return [
      { channel: 'Instagram', spent: 500, revenue: 6000, roi: 1100 },
      { channel: 'Google Ads', spent: 750, revenue: 5600, roi: 646.7 },
      { channel: 'Facebook', spent: 400, revenue: 3200, roi: 700 }
    ];
  }

  async getEquipmentUsageAnalytics(filters: { startDate?: string, endDate?: string, droneId?: number }): Promise<any[]> {
    // This is a placeholder implementation for equipment usage analytics
    return [
      { droneName: 'Mavic 3 Pro', flightHours: 45.5, maintenanceCost: 150, jobsCompleted: 18 },
      { droneName: 'Inspire 2', flightHours: 62.2, maintenanceCost: 280, jobsCompleted: 24 }
    ];
  }

  async getMaintenanceHistory(filters: { droneId?: number, startDate?: string, endDate?: string }): Promise<any[]> {
    // This is a placeholder implementation for maintenance history
    return [
      { id: 1, droneId: 1, droneName: 'Mavic 3 Pro', date: '2024-01-20', type: 'Routine', cost: 80, notes: 'Propeller inspection and firmware update' },
      { id: 2, droneId: 2, droneName: 'Inspire 2', date: '2023-12-05', type: 'Major', cost: 250, notes: 'Camera calibration and motor replacement' }
    ];
  }

  async getProjectSuccessMetrics(filters: { startDate?: string, endDate?: string, serviceType?: string }): Promise<any[]> {
    // This is a placeholder implementation for project success metrics
    return [
      { serviceType: 'Real Estate Photography', completionRate: 98, onTimeRate: 95, clientSatisfaction: 4.8 },
      { serviceType: 'Construction Monitoring', completionRate: 100, onTimeRate: 92, clientSatisfaction: 4.6 },
      { serviceType: 'Event Coverage', completionRate: 97, onTimeRate: 94, clientSatisfaction: 4.7 }
    ];
  }

  async getClientRetentionData(filters: { startDate?: string, endDate?: string }): Promise<any[]> {
    // This is a placeholder implementation for client retention data
    return [
      { clientType: 'Real Estate Agency', retentionRate: 92, averageProjects: 8.5, avgLifetimeValue: 12500 },
      { clientType: 'Construction Company', retentionRate: 95, averageProjects: 12.2, avgLifetimeValue: 32000 },
      { clientType: 'Event Organizer', retentionRate: 85, averageProjects: 3.8, avgLifetimeValue: 3600 }
    ];
  }

  async getGeographicDistribution(filters: { startDate?: string, endDate?: string }): Promise<any[]> {
    // This is a placeholder implementation for geographic distribution
    return [
      { region: 'North', projects: 35, revenue: 48500 },
      { region: 'South', projects: 28, revenue: 38200 },
      { region: 'East', projects: 22, revenue: 31000 },
      { region: 'West', projects: 30, revenue: 42800 }
    ];
  }

  async generateCustomReport(params: {
    metrics: string[],
    dimensions: string[],
    filters: { [key: string]: any },
    startDate?: string,
    endDate?: string,
    limit?: number
  }): Promise<any[]> {
    // This is a placeholder implementation for custom reports
    return [
      { month: 'January', serviceType: 'Real Estate Photography', revenue: 15000, profit: 10500, projects: 12 },
      { month: 'February', serviceType: 'Real Estate Photography', revenue: 16800, profit: 11760, projects: 14 },
      { month: 'March', serviceType: 'Real Estate Photography', revenue: 18200, profit: 12740, projects: 15 }
    ];
  }

  // Helper methods for analytics maps
  private droneAnalyticsMap: Map<number, DroneAnalytics> | null = null;
  private droneAnalyticsCounter = 1;
  private flightLogsMap: Map<number, FlightLog> | null = null;
  private flightLogsCounter = 1;
  private projectAnalyticsMap: Map<number, ProjectAnalytics> | null = null;
  private projectAnalyticsCounter = 1;
  private clientAnalyticsMap: Map<number, ClientAnalytics> | null = null;
  private clientAnalyticsCounter = 1;
  private marketingAnalyticsMap: Map<number, MarketingAnalytics> | null = null;
  private marketingAnalyticsCounter = 1;
  private analyticsReportsMap: Map<number, AnalyticsReport> | null = null;
  private analyticsReportsCounter = 1;

  private getDronesMap(): Map<number, DroneAnalytics> {
    if (!this.droneAnalyticsMap) {
      this.droneAnalyticsMap = new Map<number, DroneAnalytics>();
    }
    return this.droneAnalyticsMap;
  }

  private getDroneCounter(): number {
    return this.droneAnalyticsCounter++;
  }

  private getFlightLogsMap(): Map<number, FlightLog> {
    if (!this.flightLogsMap) {
      this.flightLogsMap = new Map<number, FlightLog>();
    }
    return this.flightLogsMap;
  }

  private getFlightLogCounter(): number {
    return this.flightLogsCounter++;
  }

  private getProjectAnalyticsMap(): Map<number, ProjectAnalytics> {
    if (!this.projectAnalyticsMap) {
      this.projectAnalyticsMap = new Map<number, ProjectAnalytics>();
    }
    return this.projectAnalyticsMap;
  }

  private getProjectAnalyticCounter(): number {
    return this.projectAnalyticsCounter++;
  }

  private getClientAnalyticsMap(): Map<number, ClientAnalytics> {
    if (!this.clientAnalyticsMap) {
      this.clientAnalyticsMap = new Map<number, ClientAnalytics>();
    }
    return this.clientAnalyticsMap;
  }

  private getClientAnalyticCounter(): number {
    return this.clientAnalyticsCounter++;
  }

  private getMarketingAnalyticsMap(): Map<number, MarketingAnalytics> {
    if (!this.marketingAnalyticsMap) {
      this.marketingAnalyticsMap = new Map<number, MarketingAnalytics>();
    }
    return this.marketingAnalyticsMap;
  }

  private getMarketingAnalyticCounter(): number {
    return this.marketingAnalyticsCounter++;
  }

  private getAnalyticsReportsMap(): Map<number, AnalyticsReport> {
    if (!this.analyticsReportsMap) {
      this.analyticsReportsMap = new Map<number, AnalyticsReport>();
    }
    return this.analyticsReportsMap;
  }

  private getAnalyticsReportCounter(): number {
    return this.analyticsReportsCounter++;
  }

  // Department operations
  async getDepartments(): Promise<Department[]> {
    return Array.from(this.departments.values());
  }

  async getDepartment(id: number): Promise<Department | undefined> {
    return this.departments.get(id);
  }

  async createDepartment(departmentData: InsertDepartment): Promise<Department> {
    const id = this.departmentCounter++;
    const createdAt = new Date();
    const updatedAt = new Date();
    const department: Department = { ...departmentData, id, createdAt, updatedAt };
    this.departments.set(id, department);
    return department;
  }

  async updateDepartment(id: number, departmentData: Partial<Department>): Promise<Department | undefined> {
    const department = await this.getDepartment(id);
    if (!department) return undefined;
    
    const updatedDepartment = { 
      ...department, 
      ...departmentData, 
      updatedAt: new Date() 
    };
    this.departments.set(id, updatedDepartment);
    return updatedDepartment;
  }

  async deleteDepartment(id: number): Promise<boolean> {
    return this.departments.delete(id);
  }

  async getEmployeesByDepartment(departmentId: number): Promise<Employee[]> {
    return Array.from(this.employees.values()).filter(
      (employee) => employee.departmentId === departmentId
    );
  }

  // Employee operations
  async getEmployees(): Promise<Employee[]> {
    return Array.from(this.employees.values());
  }

  async getEmployee(id: number): Promise<Employee | undefined> {
    return this.employees.get(id);
  }

  async createEmployee(employeeData: InsertEmployee): Promise<Employee> {
    const id = this.employeeCounter++;
    const createdAt = new Date();
    const updatedAt = new Date();
    const employee: Employee = { ...employeeData, id, createdAt, updatedAt };
    this.employees.set(id, employee);
    return employee;
  }

  async updateEmployee(id: number, employeeData: Partial<Employee>): Promise<Employee | undefined> {
    const employee = await this.getEmployee(id);
    if (!employee) return undefined;
    
    const updatedEmployee = { 
      ...employee, 
      ...employeeData, 
      updatedAt: new Date() 
    };
    this.employees.set(id, updatedEmployee);
    return updatedEmployee;
  }

  async deleteEmployee(id: number): Promise<boolean> {
    return this.employees.delete(id);
  }

  // PayrollPeriod operations
  async getPayrollPeriods(): Promise<PayrollPeriod[]> {
    return Array.from(this.payrollPeriods.values());
  }

  async getPayrollPeriod(id: number): Promise<PayrollPeriod | undefined> {
    return this.payrollPeriods.get(id);
  }

  async createPayrollPeriod(periodData: InsertPayrollPeriod): Promise<PayrollPeriod> {
    const id = this.payrollPeriodCounter++;
    const createdAt = new Date();
    const updatedAt = new Date();
    const period: PayrollPeriod = { ...periodData, id, createdAt, updatedAt };
    this.payrollPeriods.set(id, period);
    return period;
  }

  async updatePayrollPeriod(id: number, periodData: Partial<PayrollPeriod>): Promise<PayrollPeriod | undefined> {
    const period = await this.getPayrollPeriod(id);
    if (!period) return undefined;
    
    const updatedPeriod = { 
      ...period, 
      ...periodData, 
      updatedAt: new Date() 
    };
    this.payrollPeriods.set(id, updatedPeriod);
    return updatedPeriod;
  }

  async deletePayrollPeriod(id: number): Promise<boolean> {
    return this.payrollPeriods.delete(id);
  }

  // PayrollEntry operations
  async getPayrollEntries(payrollPeriodId?: number): Promise<PayrollEntry[]> {
    if (payrollPeriodId) {
      return Array.from(this.payrollEntries.values()).filter(
        (entry) => entry.payrollPeriodId === payrollPeriodId
      );
    }
    return Array.from(this.payrollEntries.values());
  }

  async getPayrollEntriesByPeriod(payrollPeriodId: number): Promise<PayrollEntry[]> {
    return Array.from(this.payrollEntries.values()).filter(
      (entry) => entry.payrollPeriodId === payrollPeriodId
    );
  }

  async getPayrollEntry(id: number): Promise<PayrollEntry | undefined> {
    return this.payrollEntries.get(id);
  }

  async createPayrollEntry(entryData: InsertPayrollEntry): Promise<PayrollEntry> {
    const id = this.payrollEntryCounter++;
    const createdAt = new Date();
    const updatedAt = new Date();
    const entry: PayrollEntry = { ...entryData, id, createdAt, updatedAt };
    this.payrollEntries.set(id, entry);
    return entry;
  }

  async updatePayrollEntry(id: number, entryData: Partial<PayrollEntry>): Promise<PayrollEntry | undefined> {
    const entry = await this.getPayrollEntry(id);
    if (!entry) return undefined;
    
    const updatedEntry = { 
      ...entry, 
      ...entryData, 
      updatedAt: new Date() 
    };
    this.payrollEntries.set(id, updatedEntry);
    return updatedEntry;
  }

  async deletePayrollEntry(id: number): Promise<boolean> {
    return this.payrollEntries.delete(id);
  }

  // TimeEntry operations
  async getTimeEntries(employeeId?: number): Promise<TimeEntry[]> {
    if (employeeId) {
      return Array.from(this.timeEntries.values()).filter(
        (entry) => entry.employeeId === employeeId
      );
    }
    return Array.from(this.timeEntries.values());
  }

  async getTimeEntriesByEmployee(employeeId: number): Promise<TimeEntry[]> {
    return Array.from(this.timeEntries.values()).filter(
      (entry) => entry.employeeId === employeeId
    );
  }
  
  async getTimeEntriesByPeriod(periodId: number): Promise<TimeEntry[]> {
    // Get the period dates
    const period = this.payrollPeriods.get(periodId);
    if (!period) {
      return [];
    }
    
    // Ensure period start and end are Date objects
    const periodStart = typeof period.periodStart === 'string' 
      ? new Date(period.periodStart) 
      : period.periodStart;
      
    const periodEnd = typeof period.periodEnd === 'string' 
      ? new Date(period.periodEnd) 
      : period.periodEnd;
    
    // Filter entries by date range
    return Array.from(this.timeEntries.values()).filter(entry => {
      const entryDate = typeof entry.entryDate === 'string' 
        ? new Date(entry.entryDate) 
        : entry.entryDate;
      
      return entryDate >= periodStart && entryDate <= periodEnd;
    });
  }

  async getTimeEntry(id: number): Promise<TimeEntry | undefined> {
    return this.timeEntries.get(id);
  }

  async createTimeEntry(entryData: InsertTimeEntry): Promise<TimeEntry> {
    const id = this.timeEntryCounter++;
    const createdAt = new Date();
    const updatedAt = new Date();
    const entry: TimeEntry = { ...entryData, id, createdAt, updatedAt };
    this.timeEntries.set(id, entry);
    return entry;
  }

  async updateTimeEntry(id: number, entryData: Partial<TimeEntry>): Promise<TimeEntry | undefined> {
    const entry = await this.getTimeEntry(id);
    if (!entry) return undefined;
    
    const updatedEntry = { 
      ...entry, 
      ...entryData, 
      updatedAt: new Date() 
    };
    this.timeEntries.set(id, updatedEntry);
    return updatedEntry;
  }

  async deleteTimeEntry(id: number): Promise<boolean> {
    return this.timeEntries.delete(id);
  }

  // CRM operations
  // Customer operations
  async getCustomers(filters?: { status?: string; assignedTo?: number }): Promise<Customer[]> {
    let customers = Array.from(this.customers.values());
    
    if (filters) {
      if (filters.status) {
        customers = customers.filter(customer => customer.status === filters.status);
      }
      
      if (filters.assignedTo) {
        customers = customers.filter(customer => customer.assignedTo === filters.assignedTo);
      }
    }
    
    return customers.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }
  
  async getCustomer(id: number): Promise<Customer | undefined> {
    return this.customers.get(id);
  }
  
  async getCustomerByEmail(email: string): Promise<Customer | undefined> {
    return Array.from(this.customers.values()).find(
      (customer) => customer.email.toLowerCase() === email.toLowerCase()
    );
  }
  
  async getCustomerByUserId(userId: number, createIfNotExists: boolean = false): Promise<Customer | undefined> {
    // Find a customer that has a related user account with this userId
    const customer = Array.from(this.customers.values()).find(
      (customer) => customer.userId === userId
    );
    
    // If customer exists or we don't want to create one, return result
    if (customer || !createIfNotExists) {
      return customer;
    }
    
    // Customer not found, create one if requested
    try {
      console.log(`Creating customer record for user ID: ${userId}`);
      
      // Get user data
      const user = await this.getUser(userId);
      if (!user) {
        console.log(`Failed to create customer - user ${userId} not found`);
        return undefined;
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
    const id = this.customerCounter++;
    const createdAt = new Date();
    const updatedAt = new Date();
    const customer: Customer = { ...customerData, id, createdAt, updatedAt };
    this.customers.set(id, customer);
    return customer;
  }
  
  async updateCustomer(id: number, customerData: Partial<Customer>): Promise<Customer | undefined> {
    const customer = await this.getCustomer(id);
    if (!customer) return undefined;
    
    const updatedCustomer = { 
      ...customer, 
      ...customerData, 
      updatedAt: new Date() 
    };
    this.customers.set(id, updatedCustomer);
    return updatedCustomer;
  }
  
  async deleteCustomer(id: number): Promise<boolean> {
    return this.customers.delete(id);
  }
  
  // Customer interactions operations
  async getCustomerInteractions(customerId: number): Promise<CustomerInteraction[]> {
    return Array.from(this.customerInteractions.values())
      .filter(interaction => interaction.customerId === customerId)
      .sort((a, b) => b.interactionDate.getTime() - a.interactionDate.getTime());
  }
  
  async getCustomerInteraction(id: number): Promise<CustomerInteraction | undefined> {
    return this.customerInteractions.get(id);
  }
  
  async createCustomerInteraction(interactionData: InsertCustomerInteraction): Promise<CustomerInteraction> {
    const id = this.customerInteractionCounter++;
    const createdAt = new Date();
    const updatedAt = new Date();
    const interaction: CustomerInteraction = { ...interactionData, id, createdAt, updatedAt };
    this.customerInteractions.set(id, interaction);
    return interaction;
  }
  
  async updateCustomerInteraction(id: number, interactionData: Partial<CustomerInteraction>): Promise<CustomerInteraction | undefined> {
    const interaction = await this.getCustomerInteraction(id);
    if (!interaction) return undefined;
    
    const updatedInteraction = { 
      ...interaction, 
      ...interactionData, 
      updatedAt: new Date() 
    };
    this.customerInteractions.set(id, updatedInteraction);
    return updatedInteraction;
  }
  
  async deleteCustomerInteraction(id: number): Promise<boolean> {
    return this.customerInteractions.delete(id);
  }
  
  // Customer deals operations
  async getCustomerDeals(filters?: { customerId?: number; stage?: string }): Promise<CustomerDeal[]> {
    let deals = Array.from(this.customerDeals.values());
    
    if (filters) {
      if (filters.customerId) {
        deals = deals.filter(deal => deal.customerId === filters.customerId);
      }
      
      if (filters.stage) {
        deals = deals.filter(deal => deal.stage === filters.stage);
      }
    }
    
    return deals.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }
  
  async getCustomerDeal(id: number): Promise<CustomerDeal | undefined> {
    return this.customerDeals.get(id);
  }
  
  async createCustomerDeal(dealData: InsertCustomerDeal): Promise<CustomerDeal> {
    const id = this.customerDealCounter++;
    const createdAt = new Date();
    const updatedAt = new Date();
    const deal: CustomerDeal = { ...dealData, id, createdAt, updatedAt };
    this.customerDeals.set(id, deal);
    return deal;
  }
  
  async updateCustomerDeal(id: number, dealData: Partial<CustomerDeal>): Promise<CustomerDeal | undefined> {
    const deal = await this.getCustomerDeal(id);
    if (!deal) return undefined;
    
    const updatedDeal = { 
      ...deal, 
      ...dealData, 
      updatedAt: new Date() 
    };
    this.customerDeals.set(id, updatedDeal);
    return updatedDeal;
  }
  
  async deleteCustomerDeal(id: number): Promise<boolean> {
    return this.customerDeals.delete(id);
  }
  
  // Customer tasks operations
  async getCustomerTasks(filters?: { customerId?: number; assignedTo?: number; status?: string }): Promise<CustomerTask[]> {
    let tasks = Array.from(this.customerTasks.values());
    
    if (filters) {
      if (filters.customerId) {
        tasks = tasks.filter(task => task.customerId === filters.customerId);
      }
      
      if (filters.assignedTo) {
        tasks = tasks.filter(task => task.assignedTo === filters.assignedTo);
      }
      
      if (filters.status) {
        tasks = tasks.filter(task => task.status === filters.status);
      }
    }
    
    return tasks.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }
  
  async getCustomerTask(id: number): Promise<CustomerTask | undefined> {
    return this.customerTasks.get(id);
  }
  
  async createCustomerTask(taskData: InsertCustomerTask): Promise<CustomerTask> {
    const id = this.customerTaskCounter++;
    const createdAt = new Date();
    const updatedAt = new Date();
    const task: CustomerTask = { ...taskData, id, createdAt, updatedAt };
    this.customerTasks.set(id, task);
    return task;
  }
  
  async updateCustomerTask(id: number, taskData: Partial<CustomerTask>): Promise<CustomerTask | undefined> {
    const task = await this.getCustomerTask(id);
    if (!task) return undefined;
    
    const updatedTask = { 
      ...task, 
      ...taskData, 
      updatedAt: new Date() 
    };
    this.customerTasks.set(id, updatedTask);
    return updatedTask;
  }
  
  async deleteCustomerTask(id: number): Promise<boolean> {
    return this.customerTasks.delete(id);
  }
  
  // Booking Feedback operations
  async saveBookingFeedback(bookingId: number, feedbackData: BookingFeedback): Promise<Booking | undefined> {
    const booking = await this.getBooking(bookingId);
    if (!booking) return undefined;
    
    const updatedBooking = { 
      ...booking,
      rating: feedbackData.rating || null,
      feedback: feedbackData.feedback || null,
      feedbackSubmittedAt: feedbackData.submittedAt ? new Date(feedbackData.submittedAt) : null,
      feedbackSubmitted: feedbackData.feedbackSubmitted || false
    };
    
    this.bookings.set(bookingId, updatedBooking);
    return updatedBooking;
  }
  
  // Client Projects operations
  async getAllClientProjects(): Promise<ClientProject[]> {
    return Array.from(this.clientProjects.values());
  }
  
  async getClientProject(id: number): Promise<ClientProject | undefined> {
    return this.clientProjects.get(id);
  }
  
  async getClientProjectsByClientId(clientId: number): Promise<ClientProject[]> {
    return Array.from(this.clientProjects.values()).filter(
      (project) => project.clientId === clientId
    );
  }
  
  async getClientProjectByNameAndClientId(name: string, clientId: number): Promise<ClientProject | undefined> {
    return Array.from(this.clientProjects.values()).find(
      (project) => project.clientId === clientId && project.name.toLowerCase() === name.toLowerCase()
    );
  }
  
  async createClientProject(projectData: InsertClientProject): Promise<ClientProject> {
    const id = this.clientProjectCounter++;
    const createdAt = new Date();
    const updatedAt = new Date();
    const project: ClientProject = { ...projectData, id, createdAt, updatedAt };
    this.clientProjects.set(id, project);
    return project;
  }
  
  async updateClientProject(id: number, projectData: Partial<ClientProject>): Promise<ClientProject | undefined> {
    const project = await this.getClientProject(id);
    if (!project) return undefined;
    
    const updatedProject = { 
      ...project, 
      ...projectData, 
      updatedAt: new Date() 
    };
    this.clientProjects.set(id, updatedProject);
    return updatedProject;
  }
  
  async deleteClientProject(id: number): Promise<boolean> {
    return this.clientProjects.delete(id);
  }
  
  // Project Milestones operations
  async getProjectMilestones(projectId: number): Promise<ProjectMilestone[]> {
    return Array.from(this.projectMilestones.values()).filter(
      (milestone) => milestone.projectId === projectId
    ).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }
  
  async getProjectMilestone(id: number): Promise<ProjectMilestone | undefined> {
    return this.projectMilestones.get(id);
  }
  
  async createProjectMilestone(milestoneData: InsertProjectMilestone): Promise<ProjectMilestone> {
    const id = this.projectMilestoneCounter++;
    const createdAt = new Date();
    const updatedAt = new Date();
    const milestone: ProjectMilestone = { ...milestoneData, id, createdAt, updatedAt };
    this.projectMilestones.set(id, milestone);
    return milestone;
  }
  
  async updateProjectMilestone(id: number, milestoneData: Partial<ProjectMilestone>): Promise<ProjectMilestone | undefined> {
    const milestone = await this.getProjectMilestone(id);
    if (!milestone) return undefined;
    
    const updatedMilestone = { 
      ...milestone, 
      ...milestoneData, 
      updatedAt: new Date() 
    };
    this.projectMilestones.set(id, updatedMilestone);
    return updatedMilestone;
  }
  
  async deleteProjectMilestone(id: number): Promise<boolean> {
    return this.projectMilestones.delete(id);
  }
  
  // Project Tasks operations
  async getProjectTasks(projectId: number): Promise<ProjectTask[]> {
    const tasks = Array.from(this.projectTasks.values()).filter(
      (task) => task.projectId === projectId
    );
    
    // Sort by priority (high, medium, low) and then by due date
    return tasks.sort((a, b) => {
      const priorityWeight = {
        high: 1,
        medium: 2,
        low: 3
      };
      
      const aPriority = a.priority ? priorityWeight[a.priority as keyof typeof priorityWeight] || 4 : 4;
      const bPriority = b.priority ? priorityWeight[b.priority as keyof typeof priorityWeight] || 4 : 4;
      
      if (aPriority !== bPriority) {
        return aPriority - bPriority;
      }
      
      // If same priority, sort by due date (if available)
      if (a.dueDate && b.dueDate) {
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      } else if (a.dueDate) {
        return -1; // a has due date, b doesn't, so a comes first
      } else if (b.dueDate) {
        return 1; // b has due date, a doesn't, so b comes first
      }
      
      // If no due dates to compare, sort by created date
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });
  }
  
  async getProjectTask(id: number): Promise<ProjectTask | undefined> {
    return this.projectTasks.get(id);
  }
  
  async createProjectTask(taskData: InsertProjectTask): Promise<ProjectTask> {
    const id = this.projectTaskCounter++;
    const createdAt = new Date();
    const updatedAt = new Date();
    
    // Default values for status and priority if not provided
    const status = taskData.status || 'todo';
    const priority = taskData.priority || 'medium';
    
    const task: ProjectTask = { 
      ...taskData, 
      id, 
      status, 
      priority,
      createdAt, 
      updatedAt 
    };
    
    this.projectTasks.set(id, task);
    return task;
  }
  
  async updateProjectTask(id: number, taskData: Partial<ProjectTask>): Promise<ProjectTask | undefined> {
    const task = await this.getProjectTask(id);
    if (!task) return undefined;
    
    // If status is being updated to 'completed', set completedAt date
    let updatedData = { ...taskData };
    if (taskData.status === 'completed' && !taskData.completedAt) {
      updatedData.completedAt = new Date();
    }
    
    const updatedTask = { 
      ...task, 
      ...updatedData, 
      updatedAt: new Date() 
    };
    
    this.projectTasks.set(id, updatedTask);
    return updatedTask;
  }
  
  async deleteProjectTask(id: number): Promise<boolean> {
    return this.projectTasks.delete(id);
  }
  
  // Task Files operations
  async getTaskFiles(taskId: number): Promise<TaskFile[]> {
    return Array.from(this.taskFiles.values()).filter(
      (file) => file.taskId === taskId
    );
  }
  
  async createTaskFile(fileData: InsertTaskFile): Promise<TaskFile> {
    const id = this.taskFileCounter++;
    const uploadedAt = new Date();
    
    const file: TaskFile = {
      ...fileData,
      id,
      uploadedAt
    };
    
    this.taskFiles.set(id, file);
    return file;
  }
  
  async deleteTaskFile(id: number): Promise<boolean> {
    return this.taskFiles.delete(id);
  }
  
  // Task Messages operations
  async getTaskMessages(taskId: number): Promise<TaskMessage[]> {
    return Array.from(this.taskMessages.values())
      .filter(message => message.taskId === taskId)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }
  
  async getTaskMessage(id: number): Promise<TaskMessage | undefined> {
    return this.taskMessages.get(id);
  }
  
  async createTaskMessage(messageData: InsertTaskMessage): Promise<TaskMessage> {
    const id = this.taskMessageCounter++;
    const createdAt = new Date();
    const status = messageData.status || "sent"; // Default status is 'sent'
    
    const message: TaskMessage = {
      ...messageData,
      id,
      createdAt,
      status
    };
    
    this.taskMessages.set(id, message);
    return message;
  }
  
  async updateTaskMessageStatus(id: number, status: string): Promise<TaskMessage | undefined> {
    const message = await this.getTaskMessage(id);
    if (!message) return undefined;
    
    const updatedMessage = {
      ...message,
      status
    };
    
    this.taskMessages.set(id, updatedMessage);
    return updatedMessage;
  }

  // Timelapse Items operations
  async getTimelapseItems(taskId: number): Promise<TimelapseItem[]> {
    return Array.from(this.timelapseItems.values())
      .filter(item => item.taskId === taskId)
      .sort((a, b) => new Date(a.captureDate).getTime() - new Date(b.captureDate).getTime());
  }

  async getTimelapseItemsByType(taskId: number, mediaType: string): Promise<TimelapseItem[]> {
    return Array.from(this.timelapseItems.values())
      .filter(item => item.taskId === taskId && item.mediaType === mediaType)
      .sort((a, b) => new Date(a.captureDate).getTime() - new Date(b.captureDate).getTime());
  }

  async getProjectTimelapseItems(projectId: number): Promise<TimelapseItem[]> {
    return Array.from(this.timelapseItems.values())
      .filter(item => item.projectId === projectId)
      .sort((a, b) => new Date(a.captureDate).getTime() - new Date(b.captureDate).getTime());
  }

  async getTimelapseItem(id: number): Promise<TimelapseItem | undefined> {
    return this.timelapseItems.get(id);
  }

  async createTimelapseItem(itemData: InsertTimelapseItem): Promise<TimelapseItem> {
    const id = this.timelapseItemCounter++;
    const createdAt = new Date();
    
    const timelapseItem: TimelapseItem = {
      ...itemData,
      id,
      createdAt
    };
    
    this.timelapseItems.set(id, timelapseItem);
    return timelapseItem;
  }

  async updateTimelapseItem(id: number, itemData: Partial<TimelapseItem>): Promise<TimelapseItem | undefined> {
    const item = await this.getTimelapseItem(id);
    if (!item) return undefined;
    
    const updatedItem = {
      ...item,
      ...itemData
    };
    
    this.timelapseItems.set(id, updatedItem);
    return updatedItem;
  }

  async deleteTimelapseItem(id: number): Promise<boolean> {
    return this.timelapseItems.delete(id);
  }

  // Notification operations
  async getUserNotifications(userId: number): Promise<Notification[]> {
    return Array.from(this.notifications.values())
      .filter(notification => notification.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async getUserUnreadNotificationsCount(userId: number): Promise<number> {
    return Array.from(this.notifications.values())
      .filter(notification => notification.userId === userId && !notification.isRead)
      .length;
  }

  async getNotification(id: number): Promise<Notification | undefined> {
    return this.notifications.get(id);
  }

  async createNotification(notification: InsertNotification): Promise<Notification> {
    const id = this.notificationCounter++;
    const createdAt = new Date();
    const newNotification: Notification = { ...notification, id, createdAt };
    this.notifications.set(id, newNotification);
    return newNotification;
  }

  async markNotificationAsRead(id: number): Promise<Notification | undefined> {
    const notification = await this.getNotification(id);
    if (!notification) return undefined;
    
    const updatedNotification = { ...notification, isRead: true };
    this.notifications.set(id, updatedNotification);
    return updatedNotification;
  }

  async markAllNotificationsAsRead(userId: number): Promise<boolean> {
    const userNotifications = await this.getUserNotifications(userId);
    for (const notification of userNotifications) {
      if (!notification.isRead) {
        await this.markNotificationAsRead(notification.id);
      }
    }
    return true;
  }

  async deleteNotification(id: number): Promise<boolean> {
    return this.notifications.delete(id);
  }

  // Email Campaign operations (stub implementations for MemStorage)
  async getEmailCampaigns(): Promise<EmailCampaign[]> {
    return [];
  }

  async getEmailCampaign(id: number): Promise<EmailCampaign | undefined> {
    return undefined;
  }

  async createEmailCampaign(campaign: InsertEmailCampaign): Promise<EmailCampaign> {
    throw new Error("Not implemented in MemStorage");
  }

  async updateEmailCampaign(id: number, campaign: Partial<InsertEmailCampaign>): Promise<EmailCampaign | undefined> {
    return undefined;
  }

  async deleteEmailCampaign(id: number): Promise<boolean> {
    return false;
  }

  // Lead Score operations (stub implementations for MemStorage)
  async getLeadScores(): Promise<LeadScore[]> {
    return [];
  }

  async getLeadScore(customerId: number): Promise<LeadScore | undefined> {
    return undefined;
  }

  async createLeadScore(leadScore: InsertLeadScore): Promise<LeadScore> {
    throw new Error("Not implemented in MemStorage");
  }

  async updateLeadScore(id: number, leadScore: Partial<InsertLeadScore>): Promise<LeadScore | undefined> {
    return undefined;
  }

  async calculateLeadScore(customerId: number): Promise<LeadScore> {
    throw new Error("Not implemented in MemStorage");
  }

  // Industry Tiles operations (stub implementations for MemStorage)
  async getIndustryTiles(): Promise<IndustryTile[]> {
    return [];
  }

  async getIndustryTile(id: number): Promise<IndustryTile | undefined> {
    return undefined;
  }

  async getIndustryTileBySlug(slug: string): Promise<IndustryTile | undefined> {
    return undefined;
  }

  async createIndustryTile(tileData: InsertIndustryTile): Promise<IndustryTile> {
    throw new Error("Not implemented in MemStorage");
  }

  async updateIndustryTile(id: number, tileData: Partial<IndustryTile>): Promise<IndustryTile | undefined> {
    return undefined;
  }

  async deleteIndustryTile(id: number): Promise<boolean> {
    return false;
  }

  async getIndustryTileServices(tileId: number): Promise<IndustryTileService[]> {
    return [];
  }

  async getServicesForTile(tileId: number): Promise<Service[]> {
    return [];
  }

  async addServiceToTile(tileId: number, serviceId: number, displayOrder?: number): Promise<IndustryTileService> {
    throw new Error("Not implemented in MemStorage");
  }

  async removeServiceFromTile(tileId: number, serviceId: number): Promise<boolean> {
    return false;
  }

  async updateTileServiceOrder(tileId: number, serviceId: number, displayOrder: number): Promise<IndustryTileService | undefined> {
    return undefined;
  }

  // Hero carousel slide operations (MemStorage)
  private heroSlidesMap: Map<number, HeroSlide> = new Map();
  private heroSlideCounter: number = 1;

  async getHeroSlides(includeInactive: boolean = false): Promise<HeroSlide[]> {
    const slides = Array.from(this.heroSlidesMap.values());
    const filtered = includeInactive ? slides : slides.filter(s => s.isActive);
    return filtered.sort((a, b) => (a.displayOrder ?? 100) - (b.displayOrder ?? 100));
  }

  async getHeroSlide(id: number): Promise<HeroSlide | undefined> {
    return this.heroSlidesMap.get(id);
  }

  async createHeroSlide(slide: InsertHeroSlide): Promise<HeroSlide> {
    const id = this.heroSlideCounter++;
    const now = new Date();
    const newSlide: HeroSlide = {
      id,
      type: slide.type,
      title: slide.title,
      url: slide.url,
      displayOrder: slide.displayOrder ?? 100,
      isActive: slide.isActive ?? true,
      createdAt: now,
      updatedAt: now,
    };
    this.heroSlidesMap.set(id, newSlide);
    return newSlide;
  }

  async updateHeroSlide(id: number, slide: Partial<InsertHeroSlide>): Promise<HeroSlide | undefined> {
    const existing = this.heroSlidesMap.get(id);
    if (!existing) return undefined;
    const updated: HeroSlide = { ...existing, ...slide, updatedAt: new Date() };
    this.heroSlidesMap.set(id, updated);
    return updated;
  }

  async deleteHeroSlide(id: number): Promise<boolean> {
    return this.heroSlidesMap.delete(id);
  }
}

// For now, use MemStorage instead of DatabaseStorage for payroll storage until we update DatabaseStorage implementation
import { DatabaseStorage } from './database-storage';
// Use DatabaseStorage for the project, which accesses PostgreSQL database
export const storage = new DatabaseStorage();
