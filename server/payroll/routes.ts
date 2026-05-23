import type { Express } from "express";
import { z } from "zod";
import { storage } from "../storage";
import {
  insertDepartmentSchema,
  insertEmployeeSchema,
  insertPayrollPeriodSchema,
  insertPayrollEntrySchema,
  insertTimeEntrySchema,
} from "@shared/schema";

// Middleware to check if user is authenticated
const isAuthenticated = (req: any, res: any, next: any) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: "Unauthorized" });
};

// Middleware to check if user is admin
const isAdmin = (req: any, res: any, next: any) => {
  if (req.isAuthenticated() && req.user.isAdmin) {
    return next();
  }
  res.status(403).json({ message: "Forbidden" });
};

export function registerPayrollRoutes(app: Express) {
  // Department Routes
  app.get("/api/payroll/departments", isAdmin, async (req, res) => {
    try {
      const departments = await storage.getDepartments();
      res.json(departments);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/payroll/departments/:id", isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const department = await storage.getDepartment(id);
      
      if (!department) {
        return res.status(404).json({ message: "Department not found" });
      }
      
      res.json(department);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/payroll/departments", isAdmin, async (req, res) => {
    try {
      const validatedData = insertDepartmentSchema.parse(req.body);
      const department = await storage.createDepartment(validatedData);
      res.status(201).json(department);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.patch("/api/payroll/departments/:id", isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertDepartmentSchema.partial().parse(req.body);
      const department = await storage.updateDepartment(id, validatedData);
      
      if (!department) {
        return res.status(404).json({ message: "Department not found" });
      }
      
      res.json(department);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/payroll/departments/:id", isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteDepartment(id);
      
      if (!success) {
        return res.status(404).json({ message: "Department not found" });
      }
      
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Employee Routes
  app.get("/api/payroll/employees", isAdmin, async (req, res) => {
    try {
      const employees = await storage.getEmployees();
      res.json(employees);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/payroll/employees/:id", isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const employee = await storage.getEmployee(id);
      
      if (!employee) {
        return res.status(404).json({ message: "Employee not found" });
      }
      
      res.json(employee);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/payroll/employees", isAdmin, async (req, res) => {
    try {
      const validatedData = insertEmployeeSchema.parse(req.body);
      const employee = await storage.createEmployee(validatedData);
      res.status(201).json(employee);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.patch("/api/payroll/employees/:id", isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertEmployeeSchema.partial().parse(req.body);
      const employee = await storage.updateEmployee(id, validatedData);
      
      if (!employee) {
        return res.status(404).json({ message: "Employee not found" });
      }
      
      res.json(employee);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/payroll/employees/:id", isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteEmployee(id);
      
      if (!success) {
        return res.status(404).json({ message: "Employee not found" });
      }
      
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Payroll Period Routes
  app.get("/api/payroll/periods", isAdmin, async (req, res) => {
    try {
      const periods = await storage.getPayrollPeriods();
      res.json(periods);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/payroll/periods/:id", isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const period = await storage.getPayrollPeriod(id);
      
      if (!period) {
        return res.status(404).json({ message: "Payroll period not found" });
      }
      
      res.json(period);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/payroll/periods", isAdmin, async (req, res) => {
    try {
      const validatedData = insertPayrollPeriodSchema.parse({
        ...req.body,
        status: req.body.status || "draft", // Default status
      });
      const period = await storage.createPayrollPeriod(validatedData);
      res.status(201).json(period);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.post("/api/payroll/periods/:id/process", isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const period = await storage.getPayrollPeriod(id);
      
      if (!period) {
        return res.status(404).json({ message: "Payroll period not found" });
      }
      
      if (period.status !== "draft") {
        return res.status(400).json({ 
          message: "Only periods in draft status can be processed" 
        });
      }
      
      // Update period status to processing
      const updatedPeriod = await storage.updatePayrollPeriod(id, {
        status: "processing",
      });
      
      // Calculate and create payroll entries
      // This would normally be a more complex process involving gathering time entries
      // and calculating pay, taxes, etc.
      const employees = await storage.getEmployees();
      const timeEntries = await storage.getTimeEntriesByPeriod(id);
      
      // Group time entries by employee
      const entriesByEmployee: {[key: number]: any[]} = {};
      timeEntries.forEach(entry => {
        if (entry.employeeId) {
          if (!entriesByEmployee[entry.employeeId]) {
            entriesByEmployee[entry.employeeId] = [];
          }
          entriesByEmployee[entry.employeeId].push(entry);
        }
      });
      
      // Create payroll entries for each employee
      for (const employeeId in entriesByEmployee) {
        const employee = employees.find(e => e.id === parseInt(employeeId));
        if (!employee) continue;
        
        const entries = entriesByEmployee[parseInt(employeeId)];
        const totalHours = entries.reduce((sum, entry) => sum + parseFloat(entry.hoursWorked), 0);
        
        // Simple payroll calculation for example
        const regularHoursStr = totalHours.toString();
        const payRate = parseFloat(employee.payRate);
        const grossPay = (totalHours * payRate).toFixed(2);
        const taxRate = 0.2; // 20% tax rate for example
        const taxAmount = (parseFloat(grossPay) * taxRate).toFixed(2);
        const netPay = (parseFloat(grossPay) - parseFloat(taxAmount)).toFixed(2);
        
        await storage.createPayrollEntry({
          payrollPeriodId: id,
          employeeId: parseInt(employeeId),
          regularHours: regularHoursStr,
          overtimeHours: "0",
          grossPay,
          taxAmount,
          netPay,
          payRate: employee.payRate,
        });
      }
      
      res.json(updatedPeriod);
    } catch (error: any) {
      console.error("Payroll processing error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/payroll/periods/:id/complete", isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const period = await storage.getPayrollPeriod(id);
      
      if (!period) {
        return res.status(404).json({ message: "Payroll period not found" });
      }
      
      if (period.status !== "processing") {
        return res.status(400).json({ 
          message: "Only periods in processing status can be completed" 
        });
      }
      
      // Update period status to completed
      const updatedPeriod = await storage.updatePayrollPeriod(id, {
        status: "completed",
      });
      
      res.json(updatedPeriod);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/payroll/periods/:id", isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const period = await storage.getPayrollPeriod(id);
      
      if (!period) {
        return res.status(404).json({ message: "Payroll period not found" });
      }
      
      if (period.status !== "draft" && req.body.status === undefined) {
        return res.status(400).json({ 
          message: "Only periods in draft status can be modified" 
        });
      }
      
      const validatedData = insertPayrollPeriodSchema.partial().parse(req.body);
      const updatedPeriod = await storage.updatePayrollPeriod(id, validatedData);
      
      res.json(updatedPeriod);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/payroll/periods/:id", isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const period = await storage.getPayrollPeriod(id);
      
      if (!period) {
        return res.status(404).json({ message: "Payroll period not found" });
      }
      
      if (period.status !== "draft") {
        return res.status(400).json({ 
          message: "Only periods in draft status can be deleted" 
        });
      }
      
      const success = await storage.deletePayrollPeriod(id);
      
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get entries for a specific payroll period
  app.get("/api/payroll/periods/:id/entries", isAdmin, async (req, res) => {
    try {
      const periodId = parseInt(req.params.id);
      const entries = await storage.getPayrollEntriesByPeriod(periodId);
      res.json(entries);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Payroll Entry Routes
  app.get("/api/payroll/entries", isAdmin, async (req, res) => {
    try {
      const entries = await storage.getPayrollEntries();
      res.json(entries);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/payroll/entries/:id", isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const entry = await storage.getPayrollEntry(id);
      
      if (!entry) {
        return res.status(404).json({ message: "Payroll entry not found" });
      }
      
      res.json(entry);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/payroll/entries", isAdmin, async (req, res) => {
    try {
      const validatedData = insertPayrollEntrySchema.parse(req.body);
      const entry = await storage.createPayrollEntry(validatedData);
      res.status(201).json(entry);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.patch("/api/payroll/entries/:id", isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      // First check if period is completed
      const entry = await storage.getPayrollEntry(id);
      
      if (!entry) {
        return res.status(404).json({ message: "Payroll entry not found" });
      }
      
      if (entry.payrollPeriodId) {
        const period = await storage.getPayrollPeriod(entry.payrollPeriodId);
        if (period && period.status === "completed") {
          return res.status(400).json({ 
            message: "Cannot modify entries in completed payroll periods" 
          });
        }
      }
      
      const validatedData = insertPayrollEntrySchema.partial().parse(req.body);
      const updatedEntry = await storage.updatePayrollEntry(id, validatedData);
      
      res.json(updatedEntry);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/payroll/entries/:id", isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      // First check if period is completed
      const entry = await storage.getPayrollEntry(id);
      
      if (!entry) {
        return res.status(404).json({ message: "Payroll entry not found" });
      }
      
      if (entry.payrollPeriodId) {
        const period = await storage.getPayrollPeriod(entry.payrollPeriodId);
        if (period && period.status === "completed") {
          return res.status(400).json({ 
            message: "Cannot delete entries in completed payroll periods" 
          });
        }
      }
      
      const success = await storage.deletePayrollEntry(id);
      
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Time Entry Routes
  app.get("/api/payroll/time-entries", isAdmin, async (req, res) => {
    try {
      const timeEntries = await storage.getTimeEntries();
      res.json(timeEntries);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/payroll/employees/:id/time-entries", isAdmin, async (req, res) => {
    try {
      const employeeId = parseInt(req.params.id);
      const timeEntries = await storage.getTimeEntriesByEmployee(employeeId);
      res.json(timeEntries);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  app.get("/api/payroll/periods/:id/time-entries", isAdmin, async (req, res) => {
    try {
      const periodId = parseInt(req.params.id);
      
      if (!periodId || isNaN(periodId)) {
        return res.status(400).json({ message: "Invalid period ID" });
      }
      
      const period = await storage.getPayrollPeriod(periodId);
      if (!period) {
        return res.status(404).json({ message: "Payroll period not found" });
      }
      
      const entries = await storage.getTimeEntriesByPeriod(periodId);
      
      // Format the entries for consistent response
      const formattedEntries = entries.map(entry => ({
        ...entry,
        // Ensure dates are in string format for API response if they're Date objects
        entryDate: entry.entryDate instanceof Date 
          ? entry.entryDate.toISOString().split('T')[0]
          : entry.entryDate,
        approvedAt: entry.approvedAt instanceof Date 
          ? entry.approvedAt.toISOString()
          : entry.approvedAt
      }));
      
      res.json(formattedEntries);
    } catch (error: any) {
      console.error("Error fetching time entries by period:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/payroll/time-entries/:id", isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const timeEntry = await storage.getTimeEntry(id);
      
      if (!timeEntry) {
        return res.status(404).json({ message: "Time entry not found" });
      }
      
      res.json(timeEntry);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/payroll/time-entries", isAdmin, async (req, res) => {
    try {
      // Process entryDate if it's a string
      let timeEntryData = {
        ...req.body,
        billable: req.body.billable !== undefined ? req.body.billable : false,
        approved: req.body.approved !== undefined ? req.body.approved : false,
      };
      
      const validatedData = insertTimeEntrySchema.parse(timeEntryData);
      
      // If entry is approved, set approvedBy and approvedAt
      if (validatedData.approved && req.user) {
        validatedData.approvedBy = req.user.id;
        validatedData.approvedAt = new Date();
      }
      
      const timeEntry = await storage.createTimeEntry(validatedData);
      res.status(201).json(timeEntry);
    } catch (error: any) {
      console.error("Time entry creation error:", error);
      res.status(400).json({ message: error.message });
    }
  });

  app.patch("/api/payroll/time-entries/:id", isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const timeEntry = await storage.getTimeEntry(id);
      
      if (!timeEntry) {
        return res.status(404).json({ message: "Time entry not found" });
      }
      
      const validatedData = insertTimeEntrySchema.partial().parse(req.body);
      
      // If changing approved status
      if (validatedData.approved !== undefined && 
          validatedData.approved !== timeEntry.approved) {
        if (validatedData.approved) {
          // If approving, set approvedBy and approvedAt
          validatedData.approvedBy = req.user.id;
          validatedData.approvedAt = new Date();
        } else {
          // If revoking approval, clear approvedBy and approvedAt
          validatedData.approvedBy = null;
          validatedData.approvedAt = null;
        }
      }
      
      const updatedTimeEntry = await storage.updateTimeEntry(id, validatedData);
      
      res.json(updatedTimeEntry);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/payroll/time-entries/:id", isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const timeEntry = await storage.getTimeEntry(id);
      
      if (!timeEntry) {
        return res.status(404).json({ message: "Time entry not found" });
      }
      
      const success = await storage.deleteTimeEntry(id);
      
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
}