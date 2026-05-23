import { db } from "../server/db";
import { 
  expenses, 
  income, 
  projectAnalytics, 
  clientAnalytics, 
  marketingAnalytics,
  droneAnalytics,
  flightLogs
} from "../shared/schema";
import { desc, eq } from "drizzle-orm";

/**
 * This script generates a full year of financial and analytics data
 * for testing the analytics dashboards and endpoints
 */

const YEAR = 2024;
const userId = 1; // Admin user ID for data association

// Marketing channels and campaigns
const marketingSources = ['google', 'facebook', 'instagram', 'referral', 'direct', 'organic'];
const marketingMediums = ['cpc', 'social', 'email', 'organic'];
const marketingCampaigns = ['spring_promo', 'summer_discount', 'holiday_special', 'real_estate_focus'];

// Client types and acquisition sources
const clientTypes = ['residential', 'commercial', 'real_estate', 'construction', 'event'];
const acquisitionSources = ['website', 'referral', 'social_media', 'paid_ad', 'email_campaign'];

// Project types
const serviceTypes = ['real_estate_photo', 'construction_progress', 'aerial_video', 'photogrammetry', 'event_coverage'];
const locations = ['Miami, FL', 'Tampa, FL', 'Orlando, FL', 'Jacksonville, FL', 'Fort Lauderdale, FL'];

// Expense categories
const expenseCategories = [1, 2, 3, 4, 5]; // Assuming these IDs exist in your system
const expenseVendors = ['Amazon', 'Home Depot', 'DJI Store', 'B&H Photo', 'Adorama', 'Apple Store', 'Gas Station'];

// Income sources
const incomeClients = ['Luxury Homes Realty', 'BuildRight Construction', 'Miami Events Co.', 'Coastal Properties', 'Urban Development Inc.'];
const paymentMethods = ['credit_card', 'bank_transfer', 'paypal', 'stripe', 'cash'];

// Helper functions
function getRandomItem<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function getRandomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomFloat(min: number, max: number, decimals: number = 2): number {
  const value = Math.random() * (max - min) + min;
  return parseFloat(value.toFixed(decimals));
}

function getRandomDate(start: Date, end: Date): Date {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

// Generate a date for each month with some randomization within the month
function getDatesForYear(year: number): Date[] {
  const dates: Date[] = [];
  for (let month = 0; month < 12; month++) {
    // Generate 5-15 dates per month for more realistic data distribution
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const numEntries = getRandomInt(5, 15);
    
    for (let i = 0; i < numEntries; i++) {
      const day = getRandomInt(1, daysInMonth);
      dates.push(new Date(year, month, day));
    }
  }
  return dates.sort((a, b) => a.getTime() - b.getTime());
}

// Generate expenses data
async function generateExpenses(dates: Date[]) {
  console.log("Generating expenses data...");
  
  const expensesData = dates.map(date => {
    // Some days might have multiple expenses
    const entries = getRandomInt(1, 3);
    const result = [];
    
    for (let i = 0; i < entries; i++) {
      const amount = getRandomFloat(25, 1500).toFixed(2);
      const categoryId = getRandomItem(expenseCategories);
      const vendor = getRandomItem(expenseVendors);
      
      result.push({
        userId,
        categoryId,
        amount,
        vendor,
        date: formatDate(date),
        description: `Expense for ${vendor} - ${formatDate(date)}`,
        receiptData: { extractedAmount: parseFloat(amount) }
      });
    }
    
    return result;
  }).flat();
  
  // Batch insert expenses
  const chunks = [];
  const chunkSize = 50;
  
  for (let i = 0; i < expensesData.length; i += chunkSize) {
    chunks.push(expensesData.slice(i, i + chunkSize));
  }
  
  for (const chunk of chunks) {
    await db.insert(expenses).values(chunk);
  }
  
  console.log(`Generated ${expensesData.length} expenses`);
}

// Generate income data
async function generateIncome(dates: Date[]) {
  console.log("Generating income data...");
  
  const incomeData = dates.map(date => {
    // Some days might have income entries
    if (Math.random() > 0.3) { // 70% chance of having income on a date
      const amount = getRandomFloat(500, 5000).toFixed(2);
      const client = getRandomItem(incomeClients);
      const paymentMethod = getRandomItem(paymentMethods);
      
      return {
        userId,
        amount,
        client,
        date: formatDate(date),
        description: `Payment from ${client}`,
        paymentMethod,
        status: 'completed',
        category: getRandomItem(serviceTypes)
      };
    }
    return null;
  }).filter(Boolean);
  
  // Batch insert income
  const chunks = [];
  const chunkSize = 50;
  
  for (let i = 0; i < incomeData.length; i += chunkSize) {
    chunks.push(incomeData.slice(i, i + chunkSize));
  }
  
  for (const chunk of chunks) {
    await db.insert(income).values(chunk);
  }
  
  console.log(`Generated ${incomeData.length} income entries`);
}

// Generate project analytics data
async function generateProjectAnalytics(dates: Date[]) {
  console.log("Generating project analytics data...");
  
  const projectData = dates.filter(() => Math.random() > 0.5).map((date, index) => {
    const serviceType = getRandomItem(serviceTypes);
    const location = getRandomItem(locations);
    const budget = getRandomFloat(800, 3000).toFixed(2);
    const actualCost = getRandomFloat(700, parseFloat(budget) * 1.1).toFixed(2);
    const revenue = getRandomFloat(parseFloat(budget) * 1.2, parseFloat(budget) * 2).toFixed(2);
    const profit = (parseFloat(revenue) - parseFloat(actualCost)).toFixed(2);
    
    // Some projects are completed, some are in progress
    const completionPercentage = Math.random() > 0.2 ? 100 : getRandomInt(10, 95);
    const completionDate = completionPercentage === 100 ? formatDate(date) : null;
    
    return {
      projectId: index + 100, // Just a placeholder ID
      serviceType,
      location,
      startDate: formatDate(date),
      completionDate,
      budget,
      actualCost,
      revenue,
      profit,
      completionPercentage,
      clientSatisfaction: getRandomInt(3, 5),
      notes: `Project for ${serviceType} in ${location}`
    };
  });
  
  // Batch insert project analytics
  const chunks = [];
  const chunkSize = 50;
  
  for (let i = 0; i < projectData.length; i += chunkSize) {
    chunks.push(projectData.slice(i, i + chunkSize));
  }
  
  for (const chunk of chunks) {
    await db.insert(projectAnalytics).values(chunk);
  }
  
  console.log(`Generated ${projectData.length} project analytics entries`);
}

// Generate client analytics data
async function generateClientAnalytics() {
  console.log("Generating client analytics data...");
  
  const numClients = getRandomInt(15, 30);
  const clientData = [];
  
  for (let i = 0; i < numClients; i++) {
    const clientType = getRandomItem(clientTypes);
    const acquisitionSource = getRandomItem(acquisitionSources);
    const acquisitionDate = formatDate(getRandomDate(new Date(YEAR, 0, 1), new Date(YEAR, 11, 31)));
    const projectCount = getRandomInt(1, 8);
    const totalSpend = getRandomFloat(projectCount * 800, projectCount * 3000).toFixed(2);
    
    clientData.push({
      clientId: i + 100, // Placeholder ID
      clientType,
      acquisitionSource,
      acquisitionDate,
      projectCount,
      totalSpend,
      lifetime: getRandomInt(1, 24),
      retention: Math.random() > 0.7,
      cac: getRandomFloat(200, 800).toFixed(2),
      clv: getRandomFloat(1000, 10000).toFixed(2),
      roi: getRandomFloat(1.2, 5.0).toFixed(2),
      referrals: getRandomInt(0, 3),
      retentionRate: getRandomFloat(0.6, 0.95)
    });
  }
  
  // Insert client analytics
  await db.insert(clientAnalytics).values(clientData);
  
  console.log(`Generated ${clientData.length} client analytics entries`);
}

// Generate marketing analytics data
async function generateMarketingAnalytics() {
  console.log("Generating marketing analytics data...");
  
  const marketingData = [];
  
  // Generate data for each month
  for (let month = 0; month < 12; month++) {
    // Generate multiple campaigns/sources per month
    const entriesPerMonth = getRandomInt(5, 10);
    
    for (let i = 0; i < entriesPerMonth; i++) {
      const source = getRandomItem(marketingSources);
      const medium = getRandomItem(marketingMediums);
      const campaign = Math.random() > 0.5 ? getRandomItem(marketingCampaigns) : null;
      
      const visitors = getRandomInt(100, 2000);
      const uniqueVisitors = getRandomInt(Math.floor(visitors * 0.7), visitors);
      const pageViews = getRandomInt(visitors, visitors * 5);
      const bounceRate = getRandomFloat(0.2, 0.7);
      const timeOnSite = getRandomFloat(30, 300); // seconds
      
      const leads = getRandomInt(0, Math.floor(visitors * 0.1));
      const sales = getRandomInt(0, leads);
      
      const cost = getRandomFloat(50, 1000).toFixed(2);
      const revenue = getRandomFloat(sales * 200, sales * 2000).toFixed(2);
      
      // Calculate derived metrics
      const costPerLead = leads > 0 ? (parseFloat(cost) / leads).toFixed(2) : "0";
      const conversionRate = visitors > 0 ? (sales / visitors) : 0;
      const roi = parseFloat(cost) > 0 ? ((parseFloat(revenue) - parseFloat(cost)) / parseFloat(cost)) : 0;
      
      // Random date within the month
      const day = getRandomInt(1, new Date(YEAR, month + 1, 0).getDate());
      const date = formatDate(new Date(YEAR, month, day));
      
      marketingData.push({
        source,
        medium,
        campaign,
        visitors,
        uniqueVisitors,
        pageViews,
        bounceRate,
        timeOnSite,
        conversionRate,
        leads,
        costPerLead,
        sales,
        revenue,
        cost,
        roi,
        date,
        notes: `${source} ${medium} campaign for ${date}`
      });
    }
  }
  
  // Batch insert marketing analytics
  const chunks = [];
  const chunkSize = 50;
  
  for (let i = 0; i < marketingData.length; i += chunkSize) {
    chunks.push(marketingData.slice(i, i + chunkSize));
  }
  
  for (const chunk of chunks) {
    await db.insert(marketingAnalytics).values(chunk);
  }
  
  console.log(`Generated ${marketingData.length} marketing analytics entries`);
}

// Generate drone analytics and flight logs
async function generateDroneAnalytics() {
  console.log("Generating drone analytics and flight logs...");
  
  // First generate some drones
  const droneModels = [
    { name: 'Mavic 3 Pro', model: 'DJI-M3P' },
    { name: 'Phantom 4 RTK', model: 'DJI-P4RTK' },
    { name: 'Inspire 2', model: 'DJI-I2' },
    { name: 'Matrice 300 RTK', model: 'DJI-M300' },
    { name: 'Air 2S', model: 'DJI-A2S' }
  ];
  
  const drones = droneModels.map((drone, index) => {
    return {
      droneName: drone.name,
      droneModel: drone.model,
      serialNumber: `SN${getRandomInt(10000000, 99999999)}`,
      purchaseDate: formatDate(getRandomDate(new Date(YEAR-2, 0, 1), new Date(YEAR-1, 11, 31))),
      flightHours: getRandomFloat(10, 200, 1),
      batteryCycles: getRandomInt(10, 100),
      batteryHealth: getRandomFloat(70, 98, 1),
      lastMaintenance: formatDate(getRandomDate(new Date(YEAR, 0, 1), new Date(YEAR, 11, 31))),
      nextMaintenanceDue: formatDate(getRandomDate(new Date(YEAR+1, 0, 1), new Date(YEAR+1, 3, 30))),
      cameraShutterCount: getRandomInt(500, 5000),
      motorWear: JSON.stringify({
        frontLeft: getRandomFloat(0, 30, 1),
        frontRight: getRandomFloat(0, 30, 1),
        backLeft: getRandomFloat(0, 30, 1),
        backRight: getRandomFloat(0, 30, 1)
      }),
      errorCodes: Math.random() > 0.8 ? JSON.stringify(['E001', 'E045']) : null,
      lastFlight: formatDate(getRandomDate(new Date(YEAR, 10, 1), new Date(YEAR, 11, 31))),
      calibrationDate: formatDate(getRandomDate(new Date(YEAR, 6, 1), new Date(YEAR, 8, 30))),
      firmwareVersion: `v${getRandomInt(1, 3)}.${getRandomInt(0, 9)}.${getRandomInt(0, 9)}`,
      status: Math.random() > 0.8 ? 'maintenance' : 'active',
      notes: Math.random() > 0.7 ? 'Regular check recommended' : null
    };
  });
  
  // Insert drone data
  const droneInsertResult = await db.insert(droneAnalytics).values(drones).returning({ id: droneAnalytics.id });
  const droneIds = droneInsertResult.map(d => d.id);
  
  // Generate flight logs for each drone
  const flightLogData = [];
  const dates = getDatesForYear(YEAR);
  
  droneIds.forEach(droneId => {
    // Each drone has multiple flights
    const flightDates = dates.filter(() => Math.random() > 0.7);
    
    flightDates.forEach(date => {
      // Create proper Date objects and keep them as Date objects (not strings)
      const flightStartTime = new Date(date);
      flightStartTime.setHours(getRandomInt(7, 17), getRandomInt(0, 59));
      
      const duration = getRandomInt(10, 40); // minutes
      const flightEndTime = new Date(flightStartTime);
      flightEndTime.setMinutes(flightEndTime.getMinutes() + duration);
      
      // These must be proper Date objects to work with PgTimestamp
      const startTime = flightStartTime;
      const endTime = flightEndTime;
      
      const distance = getRandomFloat(0.5, 5, 1); // km
      const maxAltitude = getRandomFloat(30, 120, 1); // meters
      const avgSpeed = getRandomFloat(3, 12, 1); // m/s
      
      const batteryUsed = getRandomFloat(30, 90, 1); // percentage
      const startBatteryLevel = getRandomInt(85, 100);
      const endBatteryLevel = startBatteryLevel - batteryUsed;
      
      const windSpeed = getRandomFloat(0, 15, 1); // km/h
      const temperature = getRandomFloat(10, 35, 1); // degrees C
      const humidity = getRandomFloat(40, 90, 1); // percentage
      
      const location = getRandomItem(locations);
      
      flightLogData.push({
        droneId,
        projectId: Math.random() > 0.7 ? getRandomInt(1, 50) : null,
        pilotId: getRandomInt(1, 3),
        flightDate: formatDate(date),
        startTime, // Using the string we created above
        endTime, // Using the string we created above
        duration,
        distance,
        maxAltitude,
        avgSpeed,
        batteryUsed,
        startBatteryLevel,
        endBatteryLevel,
        windSpeed,
        temperature,
        humidity,
        location,
        coordinates: {
          latitude: 25.761681 + (Math.random() - 0.5) * 0.1,
          longitude: -80.191788 + (Math.random() - 0.5) * 0.1
        },
        flightPath: {
          points: Array(getRandomInt(5, 20)).fill(0).map(() => ({
            latitude: 25.761681 + (Math.random() - 0.5) * 0.1,
            longitude: -80.191788 + (Math.random() - 0.5) * 0.1,
            altitude: getRandomFloat(10, 100, 1),
            timestamp: date.getTime() + getRandomInt(0, duration * 60 * 1000)
          }))
        },
        purpose: getRandomItem(serviceTypes),
        successful: Math.random() > 0.1, // 90% successful flights
        notes: Math.random() > 0.7 ? 'Some turbulence encountered' : null
      });
    });
  });
  
  // Debug the first few flight logs
  console.log("Sample flight log data:", flightLogData[0]);
  
  // Make sure all Date objects are properly converted to ISO strings for PgTimestamp
  const processedFlightLogData = flightLogData.map(log => ({
    ...log,
    startTime: log.startTime instanceof Date ? log.startTime.toISOString() : log.startTime,
    endTime: log.endTime instanceof Date ? log.endTime.toISOString() : log.endTime
  }));
  
  // Batch insert flight logs
  const chunks = [];
  const chunkSize = 50;
  
  for (let i = 0; i < processedFlightLogData.length; i += chunkSize) {
    chunks.push(processedFlightLogData.slice(i, i + chunkSize));
  }
  
  for (const chunk of chunks) {
    console.log("Inserting chunk with first item:", chunk[0]);
    try {
      await db.insert(flightLogs).values(chunk);
    } catch (error) {
      console.error("Error inserting flight logs:", error);
      console.error("First record in problematic chunk:", chunk[0]);
      throw error;
    }
  }
  
  console.log(`Generated ${drones.length} drones and ${flightLogData.length} flight logs`);
}

async function main() {
  console.log(`Generating annual data for year ${YEAR}...`);
  
  // Clear existing data first
  console.log("Clearing existing data...");
  
  await db.delete(marketingAnalytics);
  await db.delete(clientAnalytics);
  await db.delete(flightLogs);
  await db.delete(droneAnalytics);
  await db.delete(projectAnalytics);
  
  // Get all existing expenses and income
  const existingExpenses = await db.select().from(expenses).orderBy(desc(expenses.date));
  const existingIncome = await db.select().from(income).orderBy(desc(income.date));
  
  console.log(`Found ${existingExpenses.length} existing expenses and ${existingIncome.length} existing income entries`);
  
  // Delete all income and expenses if requested
  if (process.argv.includes('--all')) {
    console.log("Deleting all existing financial data...");
    await db.delete(expenses);
    await db.delete(income);
  }
  
  // Generate data points for the entire year
  const dates = getDatesForYear(YEAR);
  console.log(`Generated ${dates.length} dates for data generation`);
  
  // Generate all data types
  await generateDroneAnalytics();
  await generateProjectAnalytics(dates);
  await generateClientAnalytics();
  await generateMarketingAnalytics();
  
  // Only generate financial data if requested or there's none
  if (process.argv.includes('--all') || existingExpenses.length === 0) {
    await generateExpenses(dates);
  }
  
  if (process.argv.includes('--all') || existingIncome.length === 0) {
    await generateIncome(dates);
  }
  
  console.log("Data generation complete!");
}

main()
  .then(() => {
    console.log("Successfully generated annual data");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Error generating annual data:", error);
    process.exit(1);
  });