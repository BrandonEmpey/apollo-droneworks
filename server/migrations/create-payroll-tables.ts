import { db } from "../db";
import { sql } from "drizzle-orm";
import { 
  departments, 
  employees, 
  payrollPeriods, 
  payrollEntries, 
  timeEntries 
} from "@shared/schema";

export async function createPayrollTables() {
  console.log("Creating payroll tables...");

  try {
    // Create departments table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS departments (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `);
    console.log("Departments table created successfully");

    // Create employees table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS employees (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        first_name TEXT NOT NULL,
        last_name TEXT NOT NULL,
        email TEXT NOT NULL,
        phone TEXT,
        position TEXT NOT NULL,
        department_id INTEGER REFERENCES departments(id),
        hire_date DATE NOT NULL,
        termination_date DATE,
        is_active BOOLEAN DEFAULT TRUE NOT NULL,
        pay_type TEXT NOT NULL,
        pay_rate NUMERIC(10, 2) NOT NULL,
        tax_withholding_percentage NUMERIC(5, 2) DEFAULT 20,
        bank_account_name TEXT,
        bank_account_number TEXT,
        bank_routing_number TEXT,
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `);
    console.log("Employees table created successfully");

    // Create payroll_periods table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS payroll_periods (
        id SERIAL PRIMARY KEY,
        period_start DATE NOT NULL,
        period_end DATE NOT NULL,
        payment_date DATE NOT NULL,
        status TEXT DEFAULT 'pending' NOT NULL,
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `);
    console.log("Payroll periods table created successfully");

    // Create payroll_entries table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS payroll_entries (
        id SERIAL PRIMARY KEY,
        payroll_period_id INTEGER REFERENCES payroll_periods(id) ON DELETE CASCADE,
        employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
        regular_hours NUMERIC(6, 2) DEFAULT 0,
        overtime_hours NUMERIC(6, 2) DEFAULT 0,
        bonus_amount NUMERIC(10, 2) DEFAULT 0,
        commission_amount NUMERIC(10, 2) DEFAULT 0,
        deduction_amount NUMERIC(10, 2) DEFAULT 0,
        deduction_reason TEXT,
        gross_pay NUMERIC(10, 2) NOT NULL,
        tax_amount NUMERIC(10, 2) NOT NULL,
        net_pay NUMERIC(10, 2) NOT NULL,
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `);
    console.log("Payroll entries table created successfully");

    // Create time_entries table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS time_entries (
        id SERIAL PRIMARY KEY,
        employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
        project_analytics_id INTEGER REFERENCES project_analytics(id) ON DELETE SET NULL,
        entry_date DATE NOT NULL,
        hours_worked NUMERIC(6, 2) NOT NULL,
        description TEXT,
        billable BOOLEAN DEFAULT TRUE NOT NULL,
        approved BOOLEAN DEFAULT FALSE NOT NULL,
        approved_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        approved_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `);
    console.log("Time entries table created successfully");

    // Insert default department
    const existingDepartments = await db.select().from(departments);
    if (existingDepartments.length === 0) {
      await db.insert(departments).values([
        {
          name: "Drone Operations",
          description: "Main department for drone pilots and field technicians"
        },
        {
          name: "Post-Production",
          description: "Photo and video editing team"
        },
        {
          name: "Administration",
          description: "Office and administrative personnel"
        }
      ]);
      console.log("Created default departments");
    }

    // Insert sample employee (Administrator)
    const existingEmployees = await db.select().from(employees);
    if (existingEmployees.length === 0) {
      await db.execute(sql`
        INSERT INTO employees (
          user_id, first_name, last_name, email, position, 
          department_id, hire_date, pay_type, pay_rate, is_active
        ) VALUES (
          1, 'Admin', 'User', 'admin@apollodronesinc.com', 'Administrator',
          3, '2023-01-01', 'salary', 85000, true
        )
      `);
      console.log("Created default administrator employee record");
    }

    console.log("Payroll tables created and initialized successfully");
    return true;
  } catch (error) {
    console.error("Error creating payroll tables:", error);
    throw error;
  }
}