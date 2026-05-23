import { sql } from "drizzle-orm";
import { db } from "../db";

/**
 * Migration: Create Trust Administration Tables
 * Creates all tables needed for trust administration with proper foreign key relationships
 */
export async function createTrustAdministrationTables() {
  console.log("Creating trust administration tables...");

  try {
    // Create trust_entities table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS trust_entities (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT NOT NULL, -- living, testamentary, revocable, irrevocable, charitable, etc.
        establishment_date DATE NOT NULL,
        jurisdiction TEXT NOT NULL, -- State/country where trust is established
        tax_id TEXT, -- Federal Tax ID (EIN)
        status TEXT DEFAULT 'active' NOT NULL, -- active, terminated, pending, suspended
        purpose TEXT, -- Purpose/objective of the trust
        termination_conditions TEXT, -- Conditions for trust termination
        governing_law TEXT, -- State/jurisdiction law governing the trust
        business_config_id INTEGER REFERENCES business_config(id),
        trust_agreement_url TEXT, -- URL to the trust agreement document
        amendments_url JSONB DEFAULT '[]', -- Array of amendment document URLs
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `);

    // Create trust_beneficiaries table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS trust_beneficiaries (
        id SERIAL PRIMARY KEY,
        trust_id INTEGER NOT NULL REFERENCES trust_entities(id) ON DELETE CASCADE,
        customer_id INTEGER REFERENCES customers(id), -- Link to existing customer record
        first_name TEXT,
        last_name TEXT,
        email TEXT,
        phone TEXT,
        address TEXT,
        city TEXT,
        state TEXT,
        postal_code TEXT,
        country TEXT,
        date_of_birth DATE,
        beneficiary_type TEXT NOT NULL, -- income, remainder, discretionary, mandatory
        relationship_to_trustor TEXT, -- spouse, child, charity, etc.
        distribution_rights JSONB DEFAULT '{}', -- Distribution preferences and restrictions
        vesting_schedule JSONB DEFAULT '{}', -- When benefits vest
        is_active BOOLEAN DEFAULT true NOT NULL,
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `);

    // Create trust_trustees table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS trust_trustees (
        id SERIAL PRIMARY KEY,
        trust_id INTEGER NOT NULL REFERENCES trust_entities(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id), -- Link to existing user record
        first_name TEXT,
        last_name TEXT,
        email TEXT,
        phone TEXT,
        address TEXT,
        city TEXT,
        state TEXT,
        postal_code TEXT,
        country TEXT,
        trustee_type TEXT NOT NULL, -- individual, corporate, successor
        role TEXT NOT NULL, -- primary, co-trustee, successor, advisory
        appointment_date DATE,
        resignation_date DATE,
        compensation_structure JSONB DEFAULT '{}', -- How trustee is compensated
        powers JSONB DEFAULT '[]', -- Array of trustee powers and limitations
        is_active BOOLEAN DEFAULT true NOT NULL,
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `);

    // Create trust_assets table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS trust_assets (
        id SERIAL PRIMARY KEY,
        trust_id INTEGER NOT NULL REFERENCES trust_entities(id) ON DELETE CASCADE,
        financial_account_id INTEGER REFERENCES financial_accounts(id),
        income_record_id INTEGER REFERENCES income(id),
        expense_record_id INTEGER REFERENCES expenses(id),
        asset_type TEXT NOT NULL, -- cash, securities, real_estate, business_interest, etc.
        asset_name TEXT NOT NULL,
        description TEXT,
        current_value NUMERIC DEFAULT 0,
        acquisition_date DATE,
        acquisition_cost NUMERIC DEFAULT 0,
        valuation_date DATE,
        valuation_method TEXT, -- market, appraisal, cost_basis, etc.
        income_producing BOOLEAN DEFAULT false,
        annual_income NUMERIC DEFAULT 0,
        location TEXT, -- Physical location if applicable
        custodian TEXT, -- Who holds/manages the asset
        account_number TEXT,
        is_active BOOLEAN DEFAULT true NOT NULL,
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `);

    // Create trust_distributions table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS trust_distributions (
        id SERIAL PRIMARY KEY,
        trust_id INTEGER NOT NULL REFERENCES trust_entities(id) ON DELETE CASCADE,
        beneficiary_id INTEGER NOT NULL REFERENCES trust_beneficiaries(id) ON DELETE CASCADE,
        expense_record_id INTEGER REFERENCES expenses(id), -- Link to expense record
        distribution_date DATE NOT NULL,
        distribution_type TEXT NOT NULL, -- income, principal, required, discretionary
        amount NUMERIC NOT NULL,
        description TEXT,
        purpose TEXT, -- education, health, maintenance, support, etc.
        tax_year INTEGER,
        tax_character TEXT, -- ordinary_income, capital_gains, tax_free, etc.
        check_number TEXT,
        payment_method TEXT, -- check, wire, ach, etc.
        is_taxable BOOLEAN DEFAULT true,
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `);

    // Create trust_documents table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS trust_documents (
        id SERIAL PRIMARY KEY,
        trust_id INTEGER NOT NULL REFERENCES trust_entities(id) ON DELETE CASCADE,
        financial_document_id INTEGER REFERENCES financial_documents(id),
        document_type TEXT NOT NULL, -- trust_agreement, amendment, annual_report, tax_return, etc.
        title TEXT NOT NULL,
        description TEXT,
        document_url TEXT NOT NULL,
        file_name TEXT,
        file_size INTEGER,
        mime_type TEXT,
        document_date DATE,
        filing_deadline DATE,
        retention_period INTEGER, -- Years to retain
        confidentiality_level TEXT DEFAULT 'standard', -- public, confidential, restricted
        access_permissions JSONB DEFAULT '{}', -- Who can access this document
        version_number TEXT DEFAULT '1.0',
        is_current BOOLEAN DEFAULT true,
        tags JSONB DEFAULT '[]',
        uploaded_by INTEGER REFERENCES users(id),
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `);

    // Create trust_compliance table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS trust_compliance (
        id SERIAL PRIMARY KEY,
        trust_id INTEGER NOT NULL REFERENCES trust_entities(id) ON DELETE CASCADE,
        requirement_type TEXT NOT NULL, -- tax_filing, regulatory_report, audit, etc.
        title TEXT NOT NULL,
        description TEXT,
        jurisdiction TEXT NOT NULL,
        filing_authority TEXT, -- IRS, state_agency, court, etc.
        frequency TEXT NOT NULL, -- annual, quarterly, monthly, one_time
        due_date DATE NOT NULL,
        completion_date DATE,
        status TEXT DEFAULT 'pending' NOT NULL, -- pending, in_progress, completed, overdue
        responsible_party INTEGER REFERENCES trust_trustees(id),
        estimated_hours NUMERIC DEFAULT 0,
        actual_hours NUMERIC DEFAULT 0,
        cost_estimate NUMERIC DEFAULT 0,
        actual_cost NUMERIC DEFAULT 0,
        penalty_risk TEXT, -- low, medium, high
        priority TEXT DEFAULT 'medium', -- low, medium, high, critical
        reminder_days INTEGER DEFAULT 30, -- Days before due date to send reminder
        completion_notes TEXT,
        attachments JSONB DEFAULT '[]', -- Array of document URLs
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `);

    // Create trust_meetings table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS trust_meetings (
        id SERIAL PRIMARY KEY,
        trust_id INTEGER NOT NULL REFERENCES trust_entities(id) ON DELETE CASCADE,
        meeting_type TEXT NOT NULL, -- trustee, beneficiary, administrative, emergency
        title TEXT NOT NULL,
        description TEXT,
        meeting_date TIMESTAMP NOT NULL,
        location TEXT, -- Physical address or "Virtual"
        called_by INTEGER REFERENCES trust_trustees(id),
        attendees JSONB DEFAULT '[]', -- Array of attendee objects with names and roles
        agenda JSONB DEFAULT '[]', -- Array of agenda items
        meeting_minutes TEXT,
        resolutions JSONB DEFAULT '[]', -- Array of resolutions passed
        action_items JSONB DEFAULT '[]', -- Array of action items with assignments
        status TEXT DEFAULT 'scheduled' NOT NULL, -- scheduled, in_progress, completed, cancelled
        duration_minutes INTEGER,
        follow_up_required BOOLEAN DEFAULT false,
        next_meeting_date TIMESTAMP,
        attachments JSONB DEFAULT '[]', -- Array of document URLs
        meeting_notes TEXT,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `);

    // Create indexes for better performance
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_trust_beneficiaries_trust_id ON trust_beneficiaries(trust_id);`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_trust_trustees_trust_id ON trust_trustees(trust_id);`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_trust_assets_trust_id ON trust_assets(trust_id);`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_trust_distributions_trust_id ON trust_distributions(trust_id);`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_trust_documents_trust_id ON trust_documents(trust_id);`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_trust_compliance_trust_id ON trust_compliance(trust_id);`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_trust_meetings_trust_id ON trust_meetings(trust_id);`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_trust_entities_status ON trust_entities(status);`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_trust_compliance_due_date ON trust_compliance(due_date);`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_trust_meetings_date ON trust_meetings(meeting_date);`);

    console.log("✅ Trust administration tables created successfully");
  } catch (error) {
    console.error("❌ Error creating trust administration tables:", error);
    throw error;
  }
}

// Run migration if this file is executed directly
if (require.main === module) {
  createTrustAdministrationTables()
    .then(() => {
      console.log("Migration completed successfully");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Migration failed:", error);
      process.exit(1);
    });
}