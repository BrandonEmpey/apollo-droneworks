import { db } from './db';
import { 
  expenseCategories, 
  expenses, 
  income, 
  financialAccounts, 
  financialReports, 
  financialDocuments, 
  budgets, 
  budgetAllocations, 
  projectAnalytics, 
  droneAnalytics, 
  flightLogs, 
  marketingAnalytics, 
  clientAnalytics, 
  analyticsReports 
} from '../shared/schema';
import { sql } from 'drizzle-orm';

export async function createFinancialTables() {
  console.log('Creating financial tables...');
  
  // Create expense categories table
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS expense_categories (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      icon TEXT,
      color TEXT,
      is_default BOOLEAN DEFAULT FALSE,
      is_active BOOLEAN DEFAULT TRUE NOT NULL,
      created_at TIMESTAMP DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMP DEFAULT NOW() NOT NULL
    )
  `);
  console.log('Expense categories table created');

  // Create expenses table
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS expenses (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      category_id INTEGER REFERENCES expense_categories(id),
      amount NUMERIC NOT NULL,
      description TEXT,
      vendor TEXT,
      date DATE NOT NULL,
      receipt_url TEXT,
      receipt_data JSONB,
      payment_method TEXT,
      is_deductible BOOLEAN DEFAULT TRUE,
      is_recurring BOOLEAN DEFAULT FALSE,
      recurring_period TEXT,
      notes TEXT,
      tags JSONB DEFAULT '[]',
      project_id INTEGER,
      status TEXT DEFAULT 'active' NOT NULL,
      created_at TIMESTAMP DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMP DEFAULT NOW() NOT NULL
    )
  `);
  console.log('Expenses table created');

  // Create income table
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS income (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      amount NUMERIC NOT NULL,
      description TEXT,
      client TEXT,
      date DATE NOT NULL,
      invoice_id TEXT,
      invoice_url TEXT,
      payment_method TEXT,
      project_id INTEGER,
      booking_id INTEGER REFERENCES bookings(id),
      quote_id INTEGER REFERENCES quotes(id),
      category TEXT DEFAULT 'service',
      tax_withheld NUMERIC DEFAULT '0',
      status TEXT DEFAULT 'received' NOT NULL,
      notes TEXT,
      tags JSONB DEFAULT '[]',
      created_at TIMESTAMP DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMP DEFAULT NOW() NOT NULL
    )
  `);
  console.log('Income table created');
  
  // Create financial accounts table
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS financial_accounts (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      institution TEXT,
      account_number TEXT,
      routing_number TEXT,
      balance NUMERIC DEFAULT '0',
      is_active BOOLEAN DEFAULT TRUE,
      last_synced_at TIMESTAMP,
      sync_token TEXT,
      credentials JSONB,
      created_at TIMESTAMP DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMP DEFAULT NOW() NOT NULL
    )
  `);
  console.log('Financial accounts table created');

  // Create financial reports table
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS financial_reports (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      configuration JSONB,
      last_generated_at TIMESTAMP,
      last_generated_url TEXT,
      scheduled_generation BOOLEAN DEFAULT FALSE,
      generation_period TEXT,
      created_at TIMESTAMP DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMP DEFAULT NOW() NOT NULL
    )
  `);
  console.log('Financial reports table created');

  // Create financial documents table
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS financial_documents (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      filename TEXT NOT NULL,
      original_filename TEXT,
      file_url TEXT NOT NULL,
      file_type TEXT NOT NULL,
      file_size INTEGER,
      mime_type TEXT,
      metadata JSONB,
      is_processed BOOLEAN DEFAULT FALSE,
      processing_errors TEXT,
      uploaded_at TIMESTAMP DEFAULT NOW() NOT NULL,
      created_at TIMESTAMP DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMP DEFAULT NOW() NOT NULL
    )
  `);
  console.log('Financial documents table created');

  // Create budgets table
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS budgets (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      start_date DATE NOT NULL,
      end_date DATE NOT NULL,
      total_budget NUMERIC NOT NULL,
      is_active BOOLEAN DEFAULT TRUE,
      description TEXT,
      created_at TIMESTAMP DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMP DEFAULT NOW() NOT NULL
    )
  `);
  console.log('Budgets table created');

  // Create budget allocations table
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS budget_allocations (
      id SERIAL PRIMARY KEY,
      budget_id INTEGER NOT NULL REFERENCES budgets(id) ON DELETE CASCADE,
      category_id INTEGER REFERENCES expense_categories(id),
      amount NUMERIC NOT NULL,
      notes TEXT,
      created_at TIMESTAMP DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMP DEFAULT NOW() NOT NULL
    )
  `);
  console.log('Budget allocations table created');

  console.log('Financial tables created successfully');
}

export async function createAnalyticsTables() {
  console.log('Creating analytics tables...');

  // Create project analytics table
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS project_analytics (
      id SERIAL PRIMARY KEY,
      project_id INTEGER,
      quote_id INTEGER REFERENCES quotes(id),
      booking_id INTEGER REFERENCES bookings(id),
      service_type TEXT NOT NULL,
      flight_hours REAL,
      processing_hours REAL,
      total_hours REAL,
      revenue NUMERIC,
      costs NUMERIC,
      profit NUMERIC,
      profit_margin REAL,
      client_id INTEGER REFERENCES users(id),
      client_type TEXT,
      location TEXT,
      completion_date DATE,
      quality_score REAL,
      feedback TEXT,
      tags JSONB DEFAULT '[]',
      notes TEXT,
      created_at TIMESTAMP DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMP DEFAULT NOW() NOT NULL
    )
  `);
  console.log('Project analytics table created');

  // Create drone analytics table
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS drone_analytics (
      id SERIAL PRIMARY KEY,
      drone_id SERIAL,
      drone_name TEXT NOT NULL,
      drone_model TEXT NOT NULL,
      serial_number TEXT,
      flight_hours REAL DEFAULT 0,
      battery_cycles INTEGER DEFAULT 0,
      battery_health REAL,
      last_maintenance DATE,
      next_maintenance_due DATE,
      camera_shutter_count INTEGER DEFAULT 0,
      motor_wear JSONB,
      error_codes JSONB DEFAULT '[]',
      last_flight TIMESTAMP,
      calibration_date DATE,
      firmware_version TEXT,
      status TEXT DEFAULT 'active',
      notes TEXT,
      created_at TIMESTAMP DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMP DEFAULT NOW() NOT NULL
    )
  `);
  console.log('Drone analytics table created');

  // Create flight logs table
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS flight_logs (
      id SERIAL PRIMARY KEY,
      drone_id INTEGER REFERENCES drone_analytics(id) ON DELETE CASCADE,
      project_id INTEGER,
      pilot_id INTEGER REFERENCES users(id),
      flight_date DATE NOT NULL,
      start_time TIMESTAMP NOT NULL,
      end_time TIMESTAMP,
      duration REAL,
      distance REAL,
      max_altitude REAL,
      avg_speed REAL,
      battery_used REAL,
      start_battery_level REAL,
      end_battery_level REAL,
      wind_speed REAL,
      temperature REAL,
      humidity REAL,
      location TEXT,
      coordinates JSONB,
      flight_path JSONB,
      purpose TEXT,
      successful BOOLEAN DEFAULT TRUE,
      notes TEXT,
      created_at TIMESTAMP DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMP DEFAULT NOW() NOT NULL
    )
  `);
  console.log('Flight logs table created');

  // Create marketing analytics table
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS marketing_analytics (
      id SERIAL PRIMARY KEY,
      source TEXT NOT NULL,
      medium TEXT,
      campaign TEXT,
      keyword TEXT,
      landing_page TEXT,
      visitors INTEGER DEFAULT 0,
      unique_visitors INTEGER DEFAULT 0,
      page_views INTEGER DEFAULT 0,
      bounce_rate REAL,
      time_on_site REAL,
      conversion_rate REAL,
      leads INTEGER DEFAULT 0,
      cost_per_lead NUMERIC,
      sales INTEGER DEFAULT 0,
      revenue NUMERIC DEFAULT '0',
      cost NUMERIC DEFAULT '0',
      roi REAL,
      date DATE NOT NULL,
      notes TEXT,
      created_at TIMESTAMP DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMP DEFAULT NOW() NOT NULL
    )
  `);
  console.log('Marketing analytics table created');

  // Create client analytics table
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS client_analytics (
      id SERIAL PRIMARY KEY,
      client_id INTEGER REFERENCES users(id),
      client_type TEXT,
      acquisition_source TEXT,
      acquisition_date DATE,
      project_count INTEGER DEFAULT 0,
      total_spend NUMERIC DEFAULT '0',
      average_project_value NUMERIC DEFAULT '0',
      last_project_date DATE,
      engagement_score REAL,
      lifetime_value NUMERIC DEFAULT '0',
      preferred_services JSONB DEFAULT '[]',
      contact_frequency JSONB,
      satisfaction_score REAL,
      retention_rate REAL,
      notes TEXT,
      created_at TIMESTAMP DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMP DEFAULT NOW() NOT NULL
    )
  `);
  console.log('Client analytics table created');

  // Create analytics reports table
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS analytics_reports (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      description TEXT,
      type TEXT NOT NULL,
      configuration JSONB NOT NULL,
      is_default BOOLEAN DEFAULT FALSE,
      schedule JSONB,
      last_generated_at TIMESTAMP,
      last_generated_data JSONB,
      created_at TIMESTAMP DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMP DEFAULT NOW() NOT NULL
    )
  `);
  console.log('Analytics reports table created');

  console.log('Analytics tables created successfully');
}

// Create default expense categories
export async function createDefaultExpenseCategories() {
  const defaultCategories = [
    { name: 'Equipment', description: 'Drone equipment and accessories', icon: 'drone', color: '#4CAF50', isDefault: true },
    { name: 'Software', description: 'Software subscriptions and licenses', icon: 'code', color: '#2196F3', isDefault: true },
    { name: 'Travel', description: 'Mileage, fuel and travel expenses', icon: 'car', color: '#FF9800', isDefault: true },
    { name: 'Insurance', description: 'Drone and business insurance', icon: 'shield', color: '#9C27B0', isDefault: true },
    { name: 'Training', description: 'Courses and professional development', icon: 'graduation-cap', color: '#3F51B5', isDefault: true },
    { name: 'Marketing', description: 'Advertising and marketing expenses', icon: 'megaphone', color: '#E91E63', isDefault: true },
    { name: 'Office', description: 'Office supplies and rent', icon: 'building', color: '#795548', isDefault: true },
    { name: 'Utilities', description: 'Internet, phone, and utilities', icon: 'wifi', color: '#607D8B', isDefault: true },
    { name: 'Maintenance', description: 'Drone repairs and maintenance', icon: 'tool', color: '#F44336', isDefault: true },
    { name: 'Taxes', description: 'Business taxes and filing fees', icon: 'file-text', color: '#9E9E9E', isDefault: true },
  ];

  // Check if categories already exist
  const existingCategories = await db.select({ count: sql`count(*)` }).from(expenseCategories);
  if (parseInt(existingCategories[0].count.toString()) > 0) {
    console.log('Default expense categories already exist, skipping creation');
    return;
  }

  for (const category of defaultCategories) {
    await db.insert(expenseCategories).values({
      name: category.name,
      description: category.description,
      icon: category.icon,
      color: category.color,
      isDefault: category.isDefault,
      isActive: true
    });
  }
  console.log('Default expense categories created successfully');
}

// Main migration function to create all tables
export async function migrateFinancialAnalytics() {
  console.log('Starting financial and analytics tables migration...');
  
  try {
    await createFinancialTables();
    await createAnalyticsTables();
    await createDefaultExpenseCategories();
    
    console.log('Financial and analytics tables migration completed successfully!');
  } catch (error) {
    console.error('Error during financial and analytics tables migration:', error);
    throw error;
  }
}

// This will only be used when imported by other modules
// Direct execution isn't needed for ESM