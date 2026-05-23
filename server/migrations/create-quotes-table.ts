import { pool } from "../db";

export async function createQuotesTable() {
  try {
    console.log("Creating quotes table...");
    await pool.query(`
      CREATE TABLE IF NOT EXISTS quotes (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        client_name TEXT NOT NULL,
        client_email TEXT,
        project_name TEXT NOT NULL,
        project_description TEXT,
        date_created TIMESTAMP NOT NULL DEFAULT NOW(),
        expiry_date TIMESTAMP NOT NULL,
        status TEXT NOT NULL DEFAULT 'Draft',
        business_info JSONB NOT NULL,
        time_estimates JSONB NOT NULL,
        personnel JSONB NOT NULL,
        equipment JSONB NOT NULL,
        expenses JSONB NOT NULL,
        third_party_products JSONB NOT NULL,
        delivery_time_hours INTEGER NOT NULL DEFAULT 48,
        total_amount NUMERIC(10, 2) NOT NULL,
        notes TEXT,
        business_costs JSONB,
        profitability_metrics JSONB,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);
    console.log("Quotes table created successfully");
    return true;
  } catch (error) {
    console.error("Error creating quotes table:", error);
    return false;
  }
}