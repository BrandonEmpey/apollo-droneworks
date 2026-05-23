import { db } from './db';
import { 
  droneAnalytics, 
  flightLogs, 
  projectAnalytics, 
  clientAnalytics, 
  marketingAnalytics, 
  analyticsReports,
  users
} from '@shared/schema';
import { eq } from 'drizzle-orm';
import { storage } from './storage';

// Utility function to safely format date objects or strings for database insertion
function formatDate(date: Date | string | null | undefined): string | null {
  if (!date) return null;
  
  if (typeof date === 'string') {
    // If it's already a string, parse it first to standardize
    return new Date(date).toISOString();
  }
  
  if (date instanceof Date) {
    return date.toISOString();
  }
  
  return null;
}

async function populateAnalyticsData() {
  console.log('Populating analytics data...');

  try {
    // Short-circuit if no admin user exists (e.g. fresh deploy) to avoid FK violations
    const [adminUser] = await db.select({ id: users.id }).from(users).where(eq(users.isAdmin, true));
    if (!adminUser) {
      console.log('No admin user found; skipping analytics seed to avoid FK violations.');
      return 'skipped_no_admin' as const;
    }

    // Delete existing data to repopulate
    console.log('Cleaning existing analytics data before population...');
    
    // ALWAYS clear and repopulate for consistent testing
    // Clear existing data from all analytics tables to ensure clean state
    await db.delete(analyticsReports);
    await db.delete(marketingAnalytics);
    await db.delete(clientAnalytics);
    await db.delete(projectAnalytics);
    await db.delete(flightLogs);
    await db.delete(droneAnalytics);
    

    // Add drone analytics data using direct db queries instead of storage.createDrone
    // since that method might not be implemented in MemStorage
    const [drone1] = await db.insert(droneAnalytics).values({
      droneName: "Mavic 3 Pro",
      droneModel: "DJI Mavic 3 Pro",
      status: "Active",
      flightHours: 87.5,
      serialNumber: "MAV3PR0123456",
      batteryCycles: 42,
      lastMaintenance: new Date("2024-01-20"),
      nextMaintenanceDue: new Date("2024-04-20"),
      motorWear: {
        frontLeft: 92,
        frontRight: 94,
        backLeft: 90,
        backRight: 93
      },
      errorCodes: [
        { code: "E001", date: new Date("2023-06-15"), description: "Firmware update" },
        { code: "E002", date: new Date("2023-09-25"), description: "Propeller replacement" }
      ],
      batteryHealth: 89,
      notes: "Primary drone for real estate photography",
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();

    // Add second drone using direct db queries 
    const [drone2] = await db.insert(droneAnalytics).values({
      droneName: "Inspire 2",
      droneModel: "DJI Inspire 2",
      status: "Active",
      flightHours: 156.2,
      serialNumber: "INP2123789",
      batteryCycles: 78,
      lastMaintenance: new Date("2023-12-05"),
      nextMaintenanceDue: new Date("2024-03-05"),
      motorWear: {
        frontLeft: 87,
        frontRight: 88,
        backLeft: 85,
        backRight: 86
      },
      errorCodes: [
        { code: "E003", date: new Date("2022-08-22"), description: "Camera calibration" },
        { code: "E004", date: new Date("2023-02-18"), description: "Motor replacement" },
        { code: "E005", date: new Date("2023-12-05"), description: "Full maintenance check" }
      ],
      batteryHealth: 76,
      notes: "Used for high-end video productions",
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();

    // Add flight logs
    const today = new Date();
    const oneWeekAgo = new Date(today);
    oneWeekAgo.setDate(today.getDate() - 7);
    
    const twoWeeksAgo = new Date(today);
    twoWeeksAgo.setDate(today.getDate() - 14);
    
    const threeWeeksAgo = new Date(today);
    threeWeeksAgo.setDate(today.getDate() - 21);

    // Add flight logs using direct db operations
    await db.insert(flightLogs).values({
      flightDate: new Date(today),
      startTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 10, 0, 0),
      endTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 11, 30, 0),
      location: "Sunnyvale Estates",
      droneId: drone1.id,
      pilotId: adminUser.id,
      purpose: "Real Estate Photography",
      batteryUsed: 2,
      duration: 90,
      distance: 3.2,
      maxAltitude: 120,
      avgSpeed: 22,
      notes: "Completed shoot for 3-bedroom luxury home listing",
      flightPath: {
        points: [
          { latitude: 37.4115, longitude: -122.0272, altitude: 82, timestamp: 1682521200 },
          { latitude: 37.4118, longitude: -122.0274, altitude: 110, timestamp: 1682521260 },
          { latitude: 37.4120, longitude: -122.0278, altitude: 118, timestamp: 1682521320 }
        ]
      },
      projectId: 1,
      successful: true,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // Add second flight log using direct db operations
    await db.insert(flightLogs).values({
      flightDate: new Date(oneWeekAgo),
      startTime: new Date(oneWeekAgo.getFullYear(), oneWeekAgo.getMonth(), oneWeekAgo.getDate(), 14, 0, 0),
      endTime: new Date(oneWeekAgo.getFullYear(), oneWeekAgo.getMonth(), oneWeekAgo.getDate(), 16, 45, 0),
      location: "Oakridge Construction Site",
      droneId: drone2.id,
      pilotId: adminUser.id,
      purpose: "Construction Progress Monitoring",
      batteryUsed: 4,
      duration: 165,
      distance: 5.8,
      maxAltitude: 180,
      avgSpeed: 18,
      notes: "Completed monthly progress documentation for phase 2",
      flightPath: {
        points: [
          { latitude: 37.3881, longitude: -122.0485, altitude: 95, timestamp: 1682607600 },
          { latitude: 37.3884, longitude: -122.0489, altitude: 145, timestamp: 1682607660 },
          { latitude: 37.3888, longitude: -122.0492, altitude: 175, timestamp: 1682607720 }
        ]
      },
      projectId: 2,
      successful: true,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // Add third flight log using direct db operations
    await db.insert(flightLogs).values({
      flightDate: new Date(threeWeeksAgo),
      startTime: new Date(threeWeeksAgo.getFullYear(), threeWeeksAgo.getMonth(), threeWeeksAgo.getDate(), 9, 30, 0),
      endTime: new Date(threeWeeksAgo.getFullYear(), threeWeeksAgo.getMonth(), threeWeeksAgo.getDate(), 10, 45, 0),
      location: "Highland Park",
      droneId: drone1.id,
      pilotId: adminUser.id,
      purpose: "Event Coverage",
      batteryUsed: 2,
      duration: 75,
      distance: 2.4,
      maxAltitude: 90,
      avgSpeed: 15,
      notes: "Captured aerial footage of community festival",
      flightPath: {
        points: [
          { latitude: 37.4015, longitude: -122.0172, altitude: 60, timestamp: 1681312200 },
          { latitude: 37.4018, longitude: -122.0174, altitude: 85, timestamp: 1681312260 },
          { latitude: 37.4022, longitude: -122.0178, altitude: 88, timestamp: 1681312320 }
        ]
      },
      projectId: 3,
      successful: true,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // Add project analytics using direct db operations
    await db.insert(projectAnalytics).values({
      serviceType: "Real Estate Photography",
      location: "Sunnyvale Estates",
      completionDate: new Date(today),
      flightHours: 4.5,
      totalHours: 9.2,
      revenue: 1500.00,
      costs: 350.00,
      profit: 1150.00,
      clientId: 1,
      qualityScore: 5,
      projectId: 1,
      notes: "Successful high-end property shoot",
      tags: ["Luxury", "Residential", "Quick Turnaround"],
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // Add second project analytics using direct db operations
    await db.insert(projectAnalytics).values({
      serviceType: "Construction Monitoring",
      location: "Oakridge Construction Site",
      completionDate: new Date(oneWeekAgo),
      flightHours: 8.2,
      totalHours: 16.5,
      revenue: 2800.00,
      costs: 620.00,
      profit: 2180.00,
      clientId: adminUser.id,
      qualityScore: 4.8,
      projectId: 2,
      notes: "Monthly monitoring of large construction project",
      tags: ["Commercial", "Construction", "Recurring"],
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // Add third project analytics using direct db operations
    await db.insert(projectAnalytics).values({
      serviceType: "Event Coverage",
      location: "Highland Park",
      completionDate: new Date(threeWeeksAgo),
      flightHours: 2.8,
      totalHours: 7.5,
      revenue: 950.00,
      costs: 220.00,
      profit: 730.00,
      clientId: 1, // Using admin user ID as client
      qualityScore: 4.7,
      projectId: 3,
      notes: "Community festival aerial coverage",
      tags: ["Event", "Community", "Same-day Delivery"],
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // Add first client analytics using direct db operations
    await db.insert(clientAnalytics).values({
      clientId: 1,
      clientType: "Real Estate Agency",
      acquisitionSource: "Referral",
      acquisitionDate: new Date("2023-01-15"),
      projectCount: 12,
      totalSpend: 18500.00,
      averageProjectValue: 1541.67,
      lastProjectDate: new Date(today),
      lifetimeValue: 18500.00,
      retentionRate: 100,
      notes: "Key account, high-end properties",
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // Add second client analytics using direct db operations
    await db.insert(clientAnalytics).values({
      clientId: adminUser.id,
      clientType: "Construction Company",
      acquisitionSource: "Website",
      acquisitionDate: new Date("2023-02-28"),
      projectCount: 8,
      totalSpend: 22400.00,
      averageProjectValue: 2800.00,
      lastProjectDate: new Date(oneWeekAgo),
      lifetimeValue: 22400.00,
      retentionRate: 100,
      notes: "Monthly monitoring contract, reliable client",
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // Add third client analytics using direct db operations
    await db.insert(clientAnalytics).values({
      clientId: adminUser.id,
      clientType: "Event Organizer",
      acquisitionSource: "Instagram Ad",
      acquisitionDate: new Date("2023-04-10"),
      projectCount: 3,
      totalSpend: 2850.00,
      averageProjectValue: 950.00,
      lastProjectDate: new Date(threeWeeksAgo),
      lifetimeValue: 2850.00,
      retentionRate: 100,
      notes: "Seasonal events, potential for growth",
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // Add first marketing analytics using direct db operations
    await db.insert(marketingAnalytics).values({
      source: "Instagram", // Required field
      medium: "social",
      campaign: "Summer Real Estate Promo",
      date: new Date(threeWeeksAgo),
      leads: 18,
      revenue: 6000.00,
      cost: 500.00, // Budget as cost
      roi: 1100,
      conversionRate: 1.25,
      notes: "Successful campaign targeting luxury real estate",
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // Add second marketing analytics using direct db operations
    await db.insert(marketingAnalytics).values({
      source: "Google Ads", // Required field
      medium: "cpc",
      campaign: "Construction Services",
      date: new Date(twoWeeksAgo),
      leads: 15,
      revenue: 5600.00,
      cost: 750.00, // Budget as cost
      roi: 646.67,
      conversionRate: 0.47, 
      notes: "Performing well for commercial construction clients",
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // Add first analytics report using direct db operations
    await db.insert(analyticsReports).values({
      name: "Q1 Performance Report",
      type: "Quarterly Performance",
      userId: adminUser.id,
      configuration: {
        metrics: ["revenue", "profit", "qualityScore"],
        groupBy: ["serviceType", "month"],
        filters: {},
        startDate: new Date("2024-01-01"),
        endDate: new Date("2024-03-31"),
        sortBy: "revenue"
      },
      schedule: { frequency: "quarterly" },
      lastGeneratedAt: twoWeeksAgo,
      lastGeneratedData: {
        totalRevenue: 45250,
        totalProfit: 31675,
        averageClientSatisfaction: 4.85,
        topPerformingService: "Real Estate Photography",
        growthRate: 12.3
      },
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // Add second analytics report using direct db operations
    await db.insert(analyticsReports).values({
      name: "Equipment Utilization",
      type: "Resource Management",
      userId: adminUser.id,
      configuration: {
        metrics: ["flightHours", "maintenanceCosts", "batteryHealth"],
        groupBy: ["drone", "month"],
        filters: {},
        startDate: new Date("2024-01-01"),
        endDate: new Date(today),
        sortBy: "flightHours"
      },
      schedule: { frequency: "monthly" },
      lastGeneratedAt: oneWeekAgo,
      lastGeneratedData: {
        totalFlightHours: 243.7,
        maintenanceCostsTotal: 785,
        droneUtilization: [
          { droneName: "Mavic 3 Pro", utilizationPercentage: 68, batteryHealthAverage: 89 },
          { droneName: "Inspire 2", utilizationPercentage: 84, batteryHealthAverage: 76 }
        ]
      },
      createdAt: new Date(),
      updatedAt: new Date()
    });

    console.log('Successfully populated analytics data');
    return 'ok' as const;
  } catch (error) {
    console.error('Error populating analytics data:', error);
    throw error;
  }
}

// Execute if this file is run directly (ES module compatible)
// In ES modules, we check if the import.meta.url is the main entry point
import { fileURLToPath } from 'url';
const isMainModule = import.meta.url === `file://${process.argv[1]}`;

if (isMainModule) {
  populateAnalyticsData()
    .then(() => {
      console.log('Done.');
      process.exit(0);
    })
    .catch(err => {
      console.error('Failed to populate analytics data:', err);
      process.exit(1);
    });
}

export { populateAnalyticsData };