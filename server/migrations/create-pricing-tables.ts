import { sql } from "drizzle-orm";
import { db } from "../db";

export async function createPricingTables() {
  console.log("Creating pricing optimization tables...");
  
  try {
    // AI Pricing Suggestions table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS ai_pricing_suggestions (
        id SERIAL PRIMARY KEY,
        service_id INTEGER NOT NULL REFERENCES services(id) ON DELETE CASCADE,
        suggested_price DECIMAL(10,2) NOT NULL,
        current_price DECIMAL(10,2) NOT NULL,
        confidence DECIMAL(3,2) NOT NULL,
        reasoning TEXT NOT NULL,
        market_factors JSONB,
        is_applied BOOLEAN DEFAULT false,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
      )
    `);

    // Subscription Plans table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS subscription_plans (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        monthly_price DECIMAL(10,2) NOT NULL,
        yearly_price DECIMAL(10,2),
        features JSONB DEFAULT '[]',
        services_included JSONB DEFAULT '[]',
        monthly_quota INTEGER,
        is_active BOOLEAN DEFAULT true,
        display_order INTEGER DEFAULT 999,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
      )
    `);

    // Expedited Slots table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS expedited_slots (
        id SERIAL PRIMARY KEY,
        week_start_date VARCHAR(10) NOT NULL,
        is_blocked BOOLEAN DEFAULT false,
        block_reason TEXT,
        is_booked BOOLEAN DEFAULT false,
        project_id INTEGER,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
      )
    `);

    // Rush Order Pricing table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS rush_order_pricing (
        id SERIAL PRIMARY KEY,
        service_id INTEGER NOT NULL REFERENCES services(id) ON DELETE CASCADE,
        rush_multiplier DECIMAL(3,2) DEFAULT 1.50,
        minimum_rush_fee DECIMAL(10,2) DEFAULT 200.00,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
      )
    `);

    // Geographic Pricing Zones table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS pricing_zones (
        id SERIAL PRIMARY KEY,
        zone_name VARCHAR(100) NOT NULL,
        description TEXT,
        zip_codes JSONB DEFAULT '[]',
        cities JSONB DEFAULT '[]',
        base_price_multiplier DECIMAL(3,2) DEFAULT 1.00,
        travel_fee_per_mile DECIMAL(5,2) DEFAULT 0.50,
        minimum_travel_fee DECIMAL(10,2) DEFAULT 0.00,
        max_travel_distance INTEGER DEFAULT 50,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
      )
    `);

    // Bulk Discounts table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS bulk_discounts (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        minimum_quantity INTEGER NOT NULL,
        discount_type VARCHAR(20) NOT NULL,
        discount_value DECIMAL(10,2) NOT NULL,
        applicable_services JSONB DEFAULT '[]',
        valid_until TIMESTAMP WITH TIME ZONE,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
      )
    `);

    // Insert default subscription plans
    await db.execute(sql`
      INSERT INTO subscription_plans (name, description, monthly_price, yearly_price, features, services_included, monthly_quota)
      VALUES 
        ('Basic Maintenance', 'Monthly aerial monitoring and basic reporting', 299.00, 3000.00, '["Monthly aerial photos", "Basic condition report", "Email delivery"]', '[3]', 1),
        ('Professional Package', 'Comprehensive monthly monitoring with detailed analytics', 499.00, 5000.00, '["Monthly aerial photos", "Detailed analytics report", "Priority support", "Cloud storage"]', '[3, 4]', 2),
        ('Enterprise Solution', 'Full-service monthly monitoring with custom reporting', 899.00, 9000.00, '["Monthly aerial photos", "Custom reports", "Dedicated support", "API access", "Unlimited storage"]', '[3, 4, 5]', 4)
      ON CONFLICT DO NOTHING
    `);

    // Insert default pricing zones
    await db.execute(sql`
      INSERT INTO pricing_zones (zone_name, description, cities, base_price_multiplier, travel_fee_per_mile, minimum_travel_fee)
      VALUES 
        ('Local Zone', 'Within 15 miles of base', '["Downtown", "Midtown", "Suburbs"]', 1.00, 0.00, 0.00),
        ('Extended Zone', '15-30 miles from base', '["Outer suburbs", "Nearby towns"]', 1.15, 0.75, 25.00),
        ('Remote Zone', '30+ miles from base', '["Rural areas", "Distant cities"]', 1.35, 1.00, 50.00)
      ON CONFLICT DO NOTHING
    `);

    // Insert default bulk discounts
    await db.execute(sql`
      INSERT INTO bulk_discounts (name, description, minimum_quantity, discount_type, discount_value, applicable_services)
      VALUES 
        ('Volume Discount - 5 Properties', '10% discount for 5 or more properties', 5, 'percentage', 10.00, '[3, 4, 5]'),
        ('Volume Discount - 10 Properties', '15% discount for 10 or more properties', 10, 'percentage', 15.00, '[3, 4, 5]'),
        ('Corporate Package', '20% discount for 20+ properties', 20, 'percentage', 20.00, '[3, 4, 5]')
      ON CONFLICT DO NOTHING
    `);

    // Insert default rush order pricing for all services
    const services = await db.execute(sql`SELECT id FROM services`);
    for (const service of services.rows) {
      await db.execute(sql`
        INSERT INTO rush_order_pricing (service_id, rush_multiplier, minimum_rush_fee)
        VALUES (${service.id}, 1.50, 200.00)
        ON CONFLICT DO NOTHING
      `);
    }

    console.log("Pricing optimization tables created successfully");
    return true;
  } catch (error) {
    console.error("Error creating pricing tables:", error);
    return false;
  }
}