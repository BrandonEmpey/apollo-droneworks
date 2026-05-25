import { Express } from "express";
import { storage } from "./storage";
import { db } from "./db";
import { expenses, income, projectAnalytics, clientAnalytics, marketingAnalytics, payrollEntries, timeEntries } from "@shared/schema";
import { eq, and, gte, lte, between, sum } from "drizzle-orm";

/**
 * Targeted sync: when an income record linked to a booking is created/updated/deleted,
 * re-sum all income for that booking and write the total into the corresponding
 * project_analytics row. Only touches revenue, profit, and profit_margin — costs
 * are managed separately (via seeding or manual entry).
 */
export async function syncIncomeToProjectAnalytics(bookingId: number | null): Promise<void> {
  if (!bookingId) return;

  try {
    const [analyticsRow] = await db.select().from(projectAnalytics)
      .where(eq(projectAnalytics.bookingId, bookingId));
    if (!analyticsRow) return;

    const incomeRows = await db.select({ amount: income.amount }).from(income)
      .where(eq(income.bookingId, bookingId));

    const totalRevenue = incomeRows.reduce(
      (acc, r) => acc + parseFloat(r.amount ?? "0"), 0
    );
    const costs = parseFloat(analyticsRow.costs ?? "0");
    const profit = totalRevenue - costs;
    const profitMargin = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0;

    await db.update(projectAnalytics)
      .set({
        revenue: totalRevenue.toString(),
        profit: profit.toString(),
        profitMargin,
        updatedAt: new Date(),
      })
      .where(eq(projectAnalytics.id, analyticsRow.id));
  } catch (err) {
    console.error("syncIncomeToProjectAnalytics error:", err);
  }
}

/**
 * Synchronizes financial data with analytics data
 * This function ensures permanent integration between financial and analytics systems
 */
export async function synchronizeFinancialWithAnalytics() {
  try {
    // Get all expenses and update project analytics
    const expenseData = await db.select().from(expenses);
    for (const expense of expenseData) {
      if (expense.projectId) {
        // Update project analytics with expense data
        const projectData = await db.select().from(projectAnalytics)
          .where(eq(projectAnalytics.id, expense.projectId));
        
        if (projectData.length > 0) {
          const project = projectData[0];
          // Update project costs
          const updatedCosts = parseFloat(project.costs || "0") + parseFloat(expense.amount);
          // Recalculate profit
          const revenue = parseFloat(project.revenue || "0");
          const profit = revenue - updatedCosts;
          
          await db.update(projectAnalytics)
            .set({ 
              costs: updatedCosts.toString(),
              profit: profit.toString(),
              updatedAt: new Date()
            })
            .where(eq(projectAnalytics.id, project.id));
        }
      }
      
      // Update marketing analytics if expense is related to marketing
      if (expense.category?.toLowerCase().includes('marketing') || 
          expense.category?.toLowerCase().includes('advertising')) {
        const marketingData = await db.select().from(marketingAnalytics)
          .where(
            and(
              expense.date ? gte(marketingAnalytics.date, expense.date) : undefined,
              expense.date ? lte(marketingAnalytics.date, expense.date) : undefined
            )
          );
          
        for (const marketing of marketingData) {
          // Update marketing costs
          const updatedCosts = parseFloat(marketing.cost || "0") + parseFloat(expense.amount);
          
          await db.update(marketingAnalytics)
            .set({ 
              cost: updatedCosts.toString(),
              updatedAt: new Date()
            })
            .where(eq(marketingAnalytics.id, marketing.id));
        }
      }
      
      // Update client analytics if expense is related to a specific client
      if (expense.clientId) {
        const clientData = await db.select().from(clientAnalytics)
          .where(eq(clientAnalytics.clientId, expense.clientId));
          
        if (clientData.length > 0) {
          const client = clientData[0];
          // Update client-related expenses
          const updatedExpenses = parseFloat(client.totalExpenses || "0") + parseFloat(expense.amount);
          
          await db.update(clientAnalytics)
            .set({ 
              totalExpenses: updatedExpenses.toString(),
              updatedAt: new Date()
            })
            .where(eq(clientAnalytics.id, client.id));
        }
      }
    }
    
    // Get all income and update project analytics
    const incomeData = await db.select().from(income);
    for (const incomeItem of incomeData) {
      if (incomeItem.projectId) {
        // Update project analytics with income data
        const projectData = await db.select().from(projectAnalytics)
          .where(eq(projectAnalytics.id, incomeItem.projectId));
        
        if (projectData.length > 0) {
          const project = projectData[0];
          // Update project revenue
          const updatedRevenue = parseFloat(project.revenue || "0") + parseFloat(incomeItem.amount);
          // Recalculate profit
          const costs = parseFloat(project.costs || "0");
          const profit = updatedRevenue - costs;
          
          await db.update(projectAnalytics)
            .set({ 
              revenue: updatedRevenue.toString(),
              profit: profit.toString(),
              updatedAt: new Date()
            })
            .where(eq(projectAnalytics.id, project.id));
        }
      }
      
      // Update client analytics if income is related to a specific client
      if (incomeItem.clientId) {
        const clientData = await db.select().from(clientAnalytics)
          .where(eq(clientAnalytics.clientId, incomeItem.clientId));
          
        if (clientData.length > 0) {
          const client = clientData[0];
          // Update client-related revenue
          const updatedRevenue = parseFloat(client.totalRevenue || "0") + parseFloat(incomeItem.amount);
          
          await db.update(clientAnalytics)
            .set({ 
              totalRevenue: updatedRevenue.toString(),
              updatedAt: new Date()
            })
            .where(eq(clientAnalytics.id, client.id));
        }
      }
    }
    
    console.log('Successfully synchronized financial data with analytics data');
    return true;
  } catch (error) {
    console.error('Error synchronizing financial data with analytics:', error);
    return false;
  }
}

/**
 * Synchronizes payroll data with analytics system
 * This function ensures proper integration of payroll data into the analytics system
 */
export async function synchronizePayrollWithAnalytics() {
  try {
    // Get all time entries and integrate with project analytics
    const timeEntryData = await db.select().from(timeEntries);
    
    // Create a map to aggregate hours per project
    const projectHoursMap = new Map<number, {hours: number, billableHours: number}>();
    
    for (const entry of timeEntryData) {
      // Only process entries with associated projects
      if (entry.projectAnalyticsId) {
        const projectId = entry.projectAnalyticsId;
        const hours = parseFloat(entry.hoursWorked);
        
        // Initialize or update project in the map
        if (!projectHoursMap.has(projectId)) {
          projectHoursMap.set(projectId, {
            hours: 0,
            billableHours: 0
          });
        }
        
        const projectData = projectHoursMap.get(projectId)!;
        projectData.hours += hours;
        
        // Track billable hours separately
        if (entry.billable) {
          projectData.billableHours += hours;
        }
      }
    }
    
    // Update the project analytics with aggregated time entries
    for (const [projectId, data] of projectHoursMap.entries()) {
      const projectData = await db.select().from(projectAnalytics)
        .where(eq(projectAnalytics.id, projectId));
      
      if (projectData.length > 0) {
        const project = projectData[0];
        
        await db.update(projectAnalytics)
          .set({ 
            totalHours: data.hours.toString(),
            billableHours: data.billableHours.toString(),
            updatedAt: new Date()
          })
          .where(eq(projectAnalytics.id, projectId));
      }
    }
    
    // Get payroll entries data and integrate with project cost analysis
    const payrollEntryData = await db.select().from(payrollEntries);
    
    // Process payroll entries as labor costs
    for (const entry of payrollEntryData) {
      if (entry.employeeId) {
        // Get associated time entries for this employee in this payroll period
        const employeeTimeEntries = await db.select().from(timeEntries)
          .where(eq(timeEntries.employeeId, entry.employeeId));
          
        // Calculate labor costs per project
        const projectCostsMap = new Map<number, number>();
        
        // Calculate total hours worked by this employee
        const totalHours = employeeTimeEntries.reduce((sum, timeEntry) => {
          return sum + parseFloat(timeEntry.hoursWorked);
        }, 0);
        
        if (totalHours > 0) {
          // Calculate cost per hour for this payroll entry
          const grossPay = parseFloat(entry.grossPay);
          const costPerHour = grossPay / totalHours;
          
          // Distribute labor costs to projects
          for (const timeEntry of employeeTimeEntries) {
            if (timeEntry.projectAnalyticsId) {
              const projectId = timeEntry.projectAnalyticsId;
              const hours = parseFloat(timeEntry.hoursWorked);
              const cost = hours * costPerHour;
              
              // Add to project cost map
              const currentCost = projectCostsMap.get(projectId) || 0;
              projectCostsMap.set(projectId, currentCost + cost);
            }
          }
          
          // Update project costs
          for (const [projectId, laborCost] of projectCostsMap.entries()) {
            const projectData = await db.select().from(projectAnalytics)
              .where(eq(projectAnalytics.id, projectId));
            
            if (projectData.length > 0) {
              const project = projectData[0];
              const currentCosts = parseFloat(project.costs || "0");
              const currentLaborCosts = parseFloat(project.laborCosts || "0");
              
              // Update with new labor costs
              await db.update(projectAnalytics)
                .set({ 
                  laborCosts: (currentLaborCosts + laborCost).toString(),
                  costs: (currentCosts + laborCost).toString(),
                  updatedAt: new Date()
                })
                .where(eq(projectAnalytics.id, projectId));
            }
          }
        }
      }
    }
    
    console.log('Successfully synchronized payroll data with analytics system');
    return true;
  } catch (error) {
    console.error('Error synchronizing payroll data with analytics:', error);
    return false;
  }
}

export function registerAnalyticsRoutes(app: Express) {
  // Get payroll analytics
  app.get("/api/analytics/payroll", async (req, res) => {
    try {
      const { startDate, endDate, groupBy } = req.query;
      
      // Validate authenticated admin user
      if (!req.isAuthenticated || !req.isAuthenticated() || !req.user?.isAdmin) {
        return res.status(403).json({ error: "Unauthorized access" });
      }
      
      // Get all payroll entries from the database
      const payrollEntriesData = await db.select({
        id: payrollEntries.id,
        employeeId: payrollEntries.employeeId,
        payrollPeriodId: payrollEntries.payrollPeriodId,
        grossPay: payrollEntries.grossPay,
        taxAmount: payrollEntries.taxAmount,
        netPay: payrollEntries.netPay,
        regularHours: payrollEntries.regularHours,
        overtimeHours: payrollEntries.overtimeHours,
        createdAt: payrollEntries.createdAt
      }).from(payrollEntries);
      
      // If no data is found, return empty array
      if (payrollEntriesData.length === 0) {
        return res.json([]);
      }
      
      // Transform the data based on groupBy parameter
      let aggregatedData: any[] = [];
      
      if (groupBy === 'employee') {
        // Group by employee
        const employeeMap = new Map<number, {
          employeeId: number,
          totalGrossPay: number,
          totalTaxAmount: number,
          totalNetPay: number,
          totalRegularHours: number,
          totalOvertimeHours: number,
          count: number
        }>();
        
        for (const entry of payrollEntriesData) {
          if (entry.employeeId) {
            const employeeId = entry.employeeId;
            
            if (!employeeMap.has(employeeId)) {
              employeeMap.set(employeeId, {
                employeeId,
                totalGrossPay: 0,
                totalTaxAmount: 0,
                totalNetPay: 0,
                totalRegularHours: 0,
                totalOvertimeHours: 0,
                count: 0
              });
            }
            
            const employeeData = employeeMap.get(employeeId)!;
            employeeData.totalGrossPay += parseFloat(entry.grossPay || "0");
            employeeData.totalTaxAmount += parseFloat(entry.taxAmount || "0");
            employeeData.totalNetPay += parseFloat(entry.netPay || "0");
            employeeData.totalRegularHours += parseFloat(entry.regularHours || "0");
            employeeData.totalOvertimeHours += parseFloat(entry.overtimeHours || "0");
            employeeData.count += 1;
          }
        }
        
        // Convert map to array and add employee details
        for (const [employeeId, data] of employeeMap.entries()) {
          const employee = await storage.getEmployee(employeeId);
          
          if (employee) {
            aggregatedData.push({
              employeeId,
              employeeName: `${employee.firstName} ${employee.lastName}`,
              position: employee.position,
              totalGrossPay: data.totalGrossPay.toFixed(2),
              totalTaxAmount: data.totalTaxAmount.toFixed(2),
              totalNetPay: data.totalNetPay.toFixed(2),
              totalRegularHours: data.totalRegularHours.toFixed(2),
              totalOvertimeHours: data.totalOvertimeHours.toFixed(2),
              averageGrossPay: (data.totalGrossPay / data.count).toFixed(2),
              periodCount: data.count
            });
          }
        }
      } else if (groupBy === 'period') {
        // Group by payroll period
        const periodMap = new Map<number, {
          periodId: number,
          totalGrossPay: number,
          totalTaxAmount: number, 
          totalNetPay: number,
          totalRegularHours: number,
          totalOvertimeHours: number,
          employeeCount: number
        }>();
        
        for (const entry of payrollEntriesData) {
          if (entry.payrollPeriodId) {
            const periodId = entry.payrollPeriodId;
            
            if (!periodMap.has(periodId)) {
              periodMap.set(periodId, {
                periodId,
                totalGrossPay: 0,
                totalTaxAmount: 0,
                totalNetPay: 0,
                totalRegularHours: 0,
                totalOvertimeHours: 0,
                employeeCount: 0
              });
            }
            
            const periodData = periodMap.get(periodId)!;
            periodData.totalGrossPay += parseFloat(entry.grossPay || "0");
            periodData.totalTaxAmount += parseFloat(entry.taxAmount || "0");
            periodData.totalNetPay += parseFloat(entry.netPay || "0");
            periodData.totalRegularHours += parseFloat(entry.regularHours || "0");
            periodData.totalOvertimeHours += parseFloat(entry.overtimeHours || "0");
            periodData.employeeCount += 1;
          }
        }
        
        // Convert map to array and add period details
        for (const [periodId, data] of periodMap.entries()) {
          const period = await storage.getPayrollPeriod(periodId);
          
          if (period) {
            aggregatedData.push({
              periodId,
              periodStart: period.periodStart,
              periodEnd: period.periodEnd,
              status: period.status,
              totalGrossPay: data.totalGrossPay.toFixed(2),
              totalTaxAmount: data.totalTaxAmount.toFixed(2),
              totalNetPay: data.totalNetPay.toFixed(2),
              totalRegularHours: data.totalRegularHours.toFixed(2),
              totalOvertimeHours: data.totalOvertimeHours.toFixed(2),
              employeeCount: data.employeeCount
            });
          }
        }
      } else {
        // Default: monthly aggregation
        const monthlyMap = new Map<string, {
          month: string,
          totalGrossPay: number,
          totalTaxAmount: number,
          totalNetPay: number,
          totalRegularHours: number,
          totalOvertimeHours: number,
          entryCount: number
        }>();
        
        for (const entry of payrollEntriesData) {
          // Format date as YYYY-MM
          const monthKey = entry.createdAt 
            ? entry.createdAt.toISOString().substring(0, 7) 
            : new Date().toISOString().substring(0, 7);
          
          if (!monthlyMap.has(monthKey)) {
            monthlyMap.set(monthKey, {
              month: monthKey,
              totalGrossPay: 0,
              totalTaxAmount: 0,
              totalNetPay: 0,
              totalRegularHours: 0,
              totalOvertimeHours: 0,
              entryCount: 0
            });
          }
          
          const monthData = monthlyMap.get(monthKey)!;
          monthData.totalGrossPay += parseFloat(entry.grossPay || "0");
          monthData.totalTaxAmount += parseFloat(entry.taxAmount || "0");
          monthData.totalNetPay += parseFloat(entry.netPay || "0");
          monthData.totalRegularHours += parseFloat(entry.regularHours || "0");
          monthData.totalOvertimeHours += parseFloat(entry.overtimeHours || "0");
          monthData.entryCount += 1;
        }
        
        // Convert map to array with additional metrics
        for (const [_, data] of monthlyMap.entries()) {
          aggregatedData.push({
            month: data.month,
            totalGrossPay: data.totalGrossPay.toFixed(2),
            totalTaxAmount: data.totalTaxAmount.toFixed(2),
            totalNetPay: data.totalNetPay.toFixed(2),
            totalRegularHours: data.totalRegularHours.toFixed(2),
            totalOvertimeHours: data.totalOvertimeHours.toFixed(2),
            entryCount: data.entryCount,
            averagePayPerEntry: (data.totalGrossPay / data.entryCount).toFixed(2)
          });
        }
        
        // Sort by month in descending order
        aggregatedData.sort((a, b) => b.month.localeCompare(a.month));
      }
      
      res.json(aggregatedData);
    } catch (error: any) {
      console.error("Error fetching payroll analytics:", error);
      res.status(500).json({ error: error.message });
    }
  });
  
  // Get billable hours analytics
  app.get("/api/analytics/billable-hours", async (req, res) => {
    try {
      const { startDate, endDate, projectId } = req.query;
      
      // Validate authenticated admin user
      if (!req.isAuthenticated || !req.isAuthenticated() || !req.user?.isAdmin) {
        return res.status(403).json({ error: "Unauthorized access" });
      }
      
      // Get all time entries from the database
      let query = db.select({
        id: timeEntries.id,
        description: timeEntries.description,
        employeeId: timeEntries.employeeId,
        projectAnalyticsId: timeEntries.projectAnalyticsId, 
        entryDate: timeEntries.entryDate,
        hoursWorked: timeEntries.hoursWorked,
        billable: timeEntries.billable
      }).from(timeEntries);
      
      // Apply filters
      if (projectId) {
        query = query.where(eq(timeEntries.projectAnalyticsId, Number(projectId)));
      }
      
      // Note: More filters like date ranges would be applied here
      
      const entries = await query;
      
      // If no entries, return empty results
      if (entries.length === 0) {
        return res.json({
          totalHours: 0,
          billableHours: 0,
          nonBillableHours: 0,
          billablePercentage: 0,
          entriesByProject: []
        });
      }
      
      // Calculate summary metrics
      const totalHours = entries.reduce((sum, entry) => sum + parseFloat(entry.hoursWorked), 0);
      const billableHours = entries
        .filter(entry => entry.billable)
        .reduce((sum, entry) => sum + parseFloat(entry.hoursWorked), 0);
      
      const nonBillableHours = totalHours - billableHours;
      const billablePercentage = totalHours > 0 
        ? (billableHours / totalHours * 100).toFixed(2) 
        : "0.00";
      
      // Group entries by project
      const projectMap = new Map<number, {
        projectId: number,
        totalHours: number,
        billableHours: number,
        nonBillableHours: number
      }>();
      
      for (const entry of entries) {
        if (entry.projectAnalyticsId) {
          const projectId = entry.projectAnalyticsId;
          
          if (!projectMap.has(projectId)) {
            projectMap.set(projectId, {
              projectId,
              totalHours: 0,
              billableHours: 0,
              nonBillableHours: 0
            });
          }
          
          const projectData = projectMap.get(projectId)!;
          const hours = parseFloat(entry.hoursWorked);
          
          projectData.totalHours += hours;
          
          if (entry.billable) {
            projectData.billableHours += hours;
          } else {
            projectData.nonBillableHours += hours;
          }
        }
      }
      
      // Convert map to array and enrich with project details
      const entriesByProject = [];
      
      for (const [projectId, data] of projectMap.entries()) {
        const project = await storage.getProjectAnalytic(projectId);
        
        entriesByProject.push({
          projectId,
          projectName: project?.name || `Project #${projectId}`,
          serviceType: project?.serviceType || "Unknown",
          totalHours: data.totalHours.toFixed(2),
          billableHours: data.billableHours.toFixed(2),
          nonBillableHours: data.nonBillableHours.toFixed(2),
          billablePercentage: data.totalHours > 0 
            ? (data.billableHours / data.totalHours * 100).toFixed(2) 
            : "0.00"
        });
      }
      
      res.json({
        totalHours: totalHours.toFixed(2),
        billableHours: billableHours.toFixed(2),
        nonBillableHours: nonBillableHours.toFixed(2),
        billablePercentage,
        entriesByProject
      });
    } catch (error: any) {
      console.error("Error fetching billable hours analytics:", error);
      res.status(500).json({ error: error.message });
    }
  });
  
  // Get drones and equipment
  app.get("/api/analytics/drones", async (req, res) => {
    try {
      const drones = await storage.getDrones();
      console.log("Getting drones data:", drones);
      res.json(drones);
    } catch (error: any) {
      console.error("Error getting drones data:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get flight logs with date range filter
  app.get("/api/analytics/flight-logs", async (req, res) => {
    try {
      const { startDate, endDate, droneId } = req.query;
      const flightLogs = await storage.getFlightLogs({
        startDate: startDate as string | undefined,
        endDate: endDate as string | undefined,
        droneId: droneId ? parseInt(droneId as string) : undefined
      });
      console.log("Getting flight logs:", flightLogs);
      res.json(flightLogs);
    } catch (error: any) {
      console.error("Error getting flight logs:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get project analytics data with date range filter
  app.get("/api/analytics/projects", async (req, res) => {
    try {
      const { startDate, endDate, serviceType } = req.query;
      const projects = await storage.getProjectAnalytics({
        startDate: startDate as string | undefined,
        endDate: endDate as string | undefined,
        serviceType: serviceType as string | undefined
      });
      res.json(projects);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get clients analytics data
  app.get("/api/analytics/clients", async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      const clients = await storage.getClientAnalytics({
        startDate: startDate as string | undefined,
        endDate: endDate as string | undefined
      });
      res.json(clients);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get marketing analytics data
  app.get("/api/analytics/marketing", async (req, res) => {
    try {
      const { startDate, endDate, channel } = req.query;
      const marketingData = await storage.getMarketingAnalytics({
        startDate: startDate as string | undefined,
        endDate: endDate as string | undefined,
        channel: channel as string | undefined
      });
      console.log("Getting marketing data:", marketingData);
      res.json(marketingData);
    } catch (error: any) {
      console.error("Error getting marketing data:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get revenue analytics data
  app.get("/api/analytics/revenue", async (req, res) => {
    try {
      const { startDate, endDate, groupBy } = req.query;
      const revenueData = await storage.getRevenueAnalytics({
        startDate: startDate as string | undefined,
        endDate: endDate as string | undefined,
        groupBy: groupBy as 'day' | 'week' | 'month' | 'year' | undefined
      });
      console.log("Getting revenue data:", revenueData);
      res.json(revenueData);
    } catch (error: any) {
      console.error("Error getting revenue data:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get conversion analytics data
  app.get("/api/analytics/conversions", async (req, res) => {
    try {
      const { startDate, endDate, channel } = req.query;
      const conversionData = await storage.getConversionAnalytics({
        startDate: startDate as string | undefined,
        endDate: endDate as string | undefined,
        channel: channel as string | undefined
      });
      console.log("Getting conversion data:", conversionData);
      res.json(conversionData);
    } catch (error: any) {
      console.error("Error getting conversion data:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get ROI analytics data
  app.get("/api/analytics/roi", async (req, res) => {
    try {
      const { startDate, endDate, channel } = req.query;
      const roiData = await storage.getROIAnalytics({
        startDate: startDate as string | undefined,
        endDate: endDate as string | undefined,
        channel: channel as string | undefined
      });
      console.log("Getting ROI data:", roiData);
      res.json(roiData);
    } catch (error: any) {
      console.error("Error getting ROI data:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get equipment usage data
  app.get("/api/analytics/equipment-usage", async (req, res) => {
    try {
      const { startDate, endDate, droneId } = req.query;
      const equipmentUsage = await storage.getEquipmentUsageAnalytics({
        startDate: startDate as string | undefined,
        endDate: endDate as string | undefined,
        droneId: droneId ? parseInt(droneId as string) : undefined
      });
      console.log("Getting equipment usage data:", equipmentUsage);
      res.json(equipmentUsage);
    } catch (error: any) {
      console.error("Error getting equipment usage data:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get maintenance history
  app.get("/api/analytics/maintenance-history", async (req, res) => {
    try {
      const { droneId, startDate, endDate } = req.query;
      const maintenanceHistory = await storage.getMaintenanceHistory({
        droneId: droneId ? parseInt(droneId as string) : undefined,
        startDate: startDate as string | undefined,
        endDate: endDate as string | undefined
      });
      console.log("Getting maintenance history:", maintenanceHistory);
      res.json(maintenanceHistory);
    } catch (error: any) {
      console.error("Error getting maintenance history:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get project success metrics
  app.get("/api/analytics/project-success", async (req, res) => {
    try {
      const { startDate, endDate, serviceType } = req.query;
      const successMetrics = await storage.getProjectSuccessMetrics({
        startDate: startDate as string | undefined,
        endDate: endDate as string | undefined,
        serviceType: serviceType as string | undefined
      });
      console.log("Getting project success metrics:", successMetrics);
      res.json(successMetrics);
    } catch (error: any) {
      console.error("Error getting project success metrics:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get client retention data
  app.get("/api/analytics/client-retention", async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      const retentionData = await storage.getClientRetentionData({
        startDate: startDate as string | undefined,
        endDate: endDate as string | undefined
      });
      console.log("Getting client retention data:", retentionData);
      res.json(retentionData);
    } catch (error: any) {
      console.error("Error getting client retention data:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get geographic distribution of projects
  app.get("/api/analytics/geographic-distribution", async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      const geoData = await storage.getGeographicDistribution({
        startDate: startDate as string | undefined,
        endDate: endDate as string | undefined
      });
      console.log("Getting geographic distribution data:", geoData);
      res.json(geoData);
    } catch (error: any) {
      console.error("Error getting geographic distribution data:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get custom report data
  app.post("/api/analytics/custom-report", async (req, res) => {
    try {
      const { metrics, dimensions, filters, startDate, endDate } = req.body;
      const reportData = await storage.generateCustomReport({
        metrics,
        dimensions,
        filters,
        startDate,
        endDate
      });
      console.log("Generated custom report with params:", { metrics, dimensions, filters, startDate, endDate });
      res.json(reportData);
    } catch (error: any) {
      console.error("Error generating custom report:", error);
      res.status(500).json({ error: error.message });
    }
  });
  
  // Get business costs analytics data for the auto calculation feature
  app.get("/api/analytics/business-costs", async (req, res) => {
    try {
      // Generate placeholder data for now, this would normally come from actual analytics
      // In a real implementation, this data would be calculated from various analytics sources
      const businessCostsData = {
        // Main business config auto values
        depreciableAssets: 15000,
        targetMissionsPerWeek: 5,
        targetReinvestmentYears: 3,
        yearlyAdvertisementCost: 2800,
        yearlyInsuranceCost: 2200,
        yearlySoftwareSubscriptionsCost: 1500,
        taxPercentage: 8.5,
        
        // Per-mission overhead costs auto values
        equipmentDepreciation: 45,
        batteryUsage: 22,
        insurance: 35,
        transportation: 48
      };
      
      res.json(businessCostsData);
    } catch (error: any) {
      console.error("Error getting business costs analytics data:", error);
      res.status(500).json({ error: error.message });
    }
  });
  
  // Sync analytics data from financial and payroll systems
  app.post("/api/analytics/sync", async (req, res) => {
    try {
      // Validate authenticated admin user
      if (!req.isAuthenticated || !req.isAuthenticated() || !req.user?.isAdmin) {
        return res.status(403).json({ error: "Unauthorized access" });
      }
      
      // Synchronize financial data with analytics
      const financialResult = await synchronizeFinancialWithAnalytics();
      
      // Synchronize payroll data with analytics
      const payrollResult = await synchronizePayrollWithAnalytics();
      
      if (financialResult && payrollResult) {
        return res.status(200).json({ 
          success: true,
          message: "Analytics data synchronized successfully"
        });
      } else {
        return res.status(500).json({ 
          success: false,
          error: "Some synchronization operations failed"
        });
      }
    } catch (error: any) {
      console.error("Error in analytics sync:", error);
      res.status(500).json({ error: error.message });
    }
  });
}