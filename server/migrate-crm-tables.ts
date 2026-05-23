import { db } from "./db";
import { sql } from "drizzle-orm";
import { customers, customerInteractions, customerDeals, customerTasks } from "@shared/schema";

export async function createCRMTables() {
  console.log("Creating CRM tables...");

  try {
    // Create customers table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS customers (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        first_name TEXT NOT NULL,
        last_name TEXT NOT NULL,
        email TEXT NOT NULL,
        phone TEXT,
        company TEXT,
        address TEXT,
        city TEXT,
        state TEXT,
        postal_code TEXT,
        country TEXT,
        status TEXT DEFAULT 'active',
        source TEXT,
        assigned_to INTEGER REFERENCES users(id),
        lifetime_value DECIMAL DEFAULT 0,
        last_interaction TIMESTAMP,
        acquisition_date TIMESTAMP DEFAULT NOW(),
        tags TEXT[],
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log("Customers table created successfully");

    // Create customer_interactions table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS customer_interactions (
        id SERIAL PRIMARY KEY,
        customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES users(id),
        interaction_type TEXT NOT NULL,
        subject TEXT NOT NULL,
        details TEXT,
        outcome TEXT,
        follow_up_needed BOOLEAN DEFAULT FALSE,
        follow_up_date TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log("Customer interactions table created successfully");

    // Create customer_deals table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS customer_deals (
        id SERIAL PRIMARY KEY,
        customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES users(id),
        name TEXT NOT NULL,
        description TEXT,
        amount DECIMAL NOT NULL,
        stage TEXT NOT NULL,
        probability INTEGER DEFAULT 0,
        expected_close_date TIMESTAMP,
        actual_close_date TIMESTAMP,
        reason TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log("Customer deals table created successfully");

    // Create customer_tasks table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS customer_tasks (
        id SERIAL PRIMARY KEY,
        customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
        assigned_to INTEGER NOT NULL REFERENCES users(id),
        title TEXT NOT NULL,
        description TEXT,
        due_date TIMESTAMP,
        priority TEXT DEFAULT 'medium',
        status TEXT DEFAULT 'pending',
        completed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log("Customer tasks table created successfully");

    console.log("CRM tables created successfully");
    return true;
  } catch (error) {
    console.error("Error creating CRM tables:", error);
    return false;
  }
}

// Seed some sample data for testing the CRM
export async function seedCRMData() {
  console.log("Seeding CRM data...");

  try {
    // Check if we already have customers to avoid duplicates
    const existingCustomers = await db.select().from(customers).limit(1);
    
    if (existingCustomers.length > 0) {
      console.log("CRM data already exists, skipping seeding");
      return true;
    }

    // Seed customers
    const customerData = [
      {
        userId: 1, // Admin user
        firstName: "John",
        lastName: "Smith",
        email: "john.smith@example.com",
        phone: "435-555-1234",
        company: "Smith Ventures",
        address: "123 Main St",
        city: "St. George",
        state: "Utah",
        postalCode: "84770",
        country: "USA",
        status: "active",
        source: "website",
        assignedTo: 1,
        lifetimeValue: "1500",
        tags: ["premium", "real-estate"],
        notes: "Interested in regular monthly aerial photography for real estate listings"
      },
      {
        userId: 1,
        firstName: "Sarah",
        lastName: "Johnson",
        email: "sarah@johnsonconstruction.com",
        phone: "435-555-6789",
        company: "Johnson Construction",
        address: "456 Builder Ave",
        city: "St. George",
        state: "Utah",
        postalCode: "84770",
        country: "USA",
        status: "active",
        source: "referral",
        assignedTo: 1,
        lifetimeValue: "5000",
        tags: ["construction", "high-value"],
        notes: "Needs regular progress tracking for construction sites"
      },
      {
        userId: 1,
        firstName: "Michael",
        lastName: "Davis",
        email: "michael@davisrealty.com",
        phone: "435-555-4321",
        company: "Davis Realty",
        address: "789 Property Ln",
        city: "Cedar City",
        state: "Utah",
        postalCode: "84720",
        country: "USA",
        status: "lead",
        source: "website",
        assignedTo: 1,
        lifetimeValue: "0",
        tags: ["real-estate", "new-lead"],
        notes: "Requested information about drone photography packages for luxury listings"
      }
    ];

    for (const customer of customerData) {
      await db.insert(customers).values(customer);
    }
    console.log("Sample customers added successfully");

    // Get the inserted customers to reference their IDs
    const insertedCustomers = await db.select().from(customers);
    
    // Seed customer interactions
    if (insertedCustomers.length > 0) {
      const interactions = [
        {
          customerId: insertedCustomers[0].id,
          userId: 1,
          interactionType: "call",
          subject: "Initial consultation",
          details: "Discussed monthly aerial photography package for real estate listings",
          outcome: "Client requested a quote",
          followUpNeeded: true,
          followUpDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000) // 2 days from now
        },
        {
          customerId: insertedCustomers[1].id,
          userId: 1,
          interactionType: "meeting",
          subject: "Site visit",
          details: "Met at the construction site to discuss optimal drone flight paths",
          outcome: "Agreed on weekly site documentation",
          followUpNeeded: false
        },
        {
          customerId: insertedCustomers[2].id,
          userId: 1,
          interactionType: "email",
          subject: "Information request",
          details: "Sent package details and pricing information",
          outcome: "Awaiting response",
          followUpNeeded: true,
          followUpDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) // 3 days from now
        }
      ];

      for (const interaction of interactions) {
        await db.insert(customerInteractions).values(interaction);
      }
      console.log("Sample customer interactions added successfully");

      // Seed customer deals
      const deals = [
        {
          customerId: insertedCustomers[0].id,
          userId: 1,
          name: "Monthly Real Estate Package",
          description: "Monthly aerial photography for listings",
          amount: "500",
          stage: "proposal",
          probability: 70,
          expectedCloseDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 1 week from now
        },
        {
          customerId: insertedCustomers[1].id,
          userId: 1,
          name: "Construction Progress Tracking",
          description: "Weekly aerial surveys and 3D modeling",
          amount: "1200",
          stage: "closed-won",
          probability: 100,
          expectedCloseDate: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000), // 2 weeks ago
          actualCloseDate: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) // 2 weeks ago
        },
        {
          customerId: insertedCustomers[2].id,
          userId: 1,
          name: "Luxury Property Package",
          description: "Premium aerial photography for high-end listings",
          amount: "800",
          stage: "negotiation",
          probability: 50,
          expectedCloseDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000) // 10 days from now
        }
      ];

      for (const deal of deals) {
        await db.insert(customerDeals).values(deal);
      }
      console.log("Sample customer deals added successfully");

      // Seed customer tasks
      const tasks = [
        {
          customerId: insertedCustomers[0].id,
          assignedTo: 1,
          title: "Prepare quote",
          description: "Create a detailed quote for monthly real estate package",
          dueDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000), // 1 day from now
          priority: "high",
          status: "pending"
        },
        {
          customerId: insertedCustomers[1].id,
          assignedTo: 1,
          title: "Schedule first flight",
          description: "Coordinate with site manager for first construction site documentation",
          dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
          priority: "medium",
          status: "in-progress"
        },
        {
          customerId: insertedCustomers[2].id,
          assignedTo: 1,
          title: "Follow-up call",
          description: "Call to discuss the luxury property package proposal",
          dueDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000), // 4 days from now
          priority: "medium",
          status: "pending"
        }
      ];

      for (const task of tasks) {
        await db.insert(customerTasks).values(task);
      }
      console.log("Sample customer tasks added successfully");
    }

    console.log("CRM data seeded successfully");
    return true;
  } catch (error) {
    console.error("Error seeding CRM data:", error);
    return false;
  }
}

// Function to integrate CRM with analytics system
export async function linkCRMWithAnalytics() {
  console.log("Integrating CRM with analytics system...");

  try {
    // Update client analytics with customer data based on status
    await db.execute(sql`
      UPDATE client_analytics 
      SET 
        retention_rate = CASE 
          WHEN c.status = 'active' THEN GREATEST(retention_rate, 90)
          WHEN c.status = 'inactive' THEN LEAST(retention_rate, 40)
          ELSE retention_rate
        END
      FROM customers c
      WHERE client_analytics.client_id = c.user_id AND c.user_id IS NOT NULL
    `);

    // Ensure each customer has a corresponding analytics entry
    await db.execute(sql`
      INSERT INTO client_analytics 
        (client_id, acquisition_source, acquisition_date, lifetime_value, 
        project_count, retention_rate, satisfaction_score)
      SELECT 
        c.user_id, 
        'Website',
        c.created_at, 
        0,
        0,
        CASE 
          WHEN c.status = 'active' THEN 90
          WHEN c.status = 'inactive' THEN 40
          ELSE 60
        END,
        80
      FROM customers c
      LEFT JOIN client_analytics ca ON c.user_id = ca.client_id
      WHERE ca.id IS NULL AND c.user_id IS NOT NULL
    `);

    console.log("CRM successfully integrated with analytics system");
    return true;
  } catch (error) {
    console.error("Error integrating CRM with analytics:", error);
    return false;
  }
}

// Function to add client portal fields to customers table
export async function addClientPortalFields() {
  console.log("Adding client portal fields to customers table...");
  try {
    // Check if the columns exist first to avoid errors if they've already been added
    const checkColumnSQL = `
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'customers' AND column_name = 'username'
    `;
    
    const result = await db.execute(sql.raw(checkColumnSQL));
    const rows = result.rows;
    
    if (rows.length === 0) {
      // Columns don't exist, so add them
      await db.execute(sql`
        ALTER TABLE customers 
        ADD COLUMN username TEXT,
        ADD COLUMN password TEXT,
        ADD COLUMN logo_url TEXT
      `);
      console.log("Client portal fields added successfully");
    } else {
      console.log("Client portal fields already exist, skipping");
    }
    
    return true;
  } catch (error) {
    console.error("Error adding client portal fields:", error);
    return false;
  }
}

export async function migrateCRM() {
  console.log("Starting CRM migration...");
  
  // Create the CRM tables
  const tablesCreated = await createCRMTables();
  if (!tablesCreated) {
    console.error("Failed to create CRM tables");
    return false;
  }
  
  // Add client portal fields to the customers table
  const fieldsAdded = await addClientPortalFields();
  if (!fieldsAdded) {
    console.error("Failed to add client portal fields");
    return false;
  }
  
  // Seed CRM data
  const dataSeeded = await seedCRMData();
  if (!dataSeeded) {
    console.error("Failed to seed CRM data");
    return false;
  }
  
  // Integrate with analytics
  const analyticsLinked = await linkCRMWithAnalytics();
  if (!analyticsLinked) {
    console.error("Failed to integrate CRM with analytics");
    return false;
  }
  
  console.log("CRM migration completed successfully");
  return true;
}