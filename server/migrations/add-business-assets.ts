import { db } from "../db";
import { sql } from "drizzle-orm";
import { businessAssets } from "@shared/schema";

export async function runBusinessAssetsMigration() {
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS business_assets (
        id                       SERIAL PRIMARY KEY,
        name                     VARCHAR(255) NOT NULL,
        type                     VARCHAR(50)  NOT NULL DEFAULT 'other',
        description              TEXT,
        serial_number            VARCHAR(255),
        purchase_price           NUMERIC(12,2) NOT NULL,
        purchase_date            DATE NOT NULL,
        salvage_value            NUMERIC(12,2) DEFAULT 0,
        useful_life_years        INTEGER NOT NULL DEFAULT 5,
        expected_replacement_date DATE,
        depreciation_method      VARCHAR(30) NOT NULL DEFAULT 'straight-line',
        vehicle_mileage_method   VARCHAR(20),
        total_miles_at_purchase  INTEGER,
        current_miles            INTEGER,
        monthly_insurance_cost   NUMERIC(10,2) DEFAULT 0,
        is_active                BOOLEAN NOT NULL DEFAULT TRUE,
        notes                    TEXT,
        created_at               TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        updated_at               TIMESTAMPTZ DEFAULT NOW() NOT NULL
      );
    `);

    // Pre-seed business assets if none exist yet
    const existing = await db.select().from(businessAssets).limit(1);
    if (existing.length === 0) {
      await db.execute(sql`
        INSERT INTO business_assets
          (name, type, description, purchase_price, purchase_date, salvage_value,
           useful_life_years, expected_replacement_date, depreciation_method,
           monthly_insurance_cost, is_active, notes)
        VALUES
          ('DJI Matrice 4E', 'drone',
           'Enterprise mapping drone with RTK and multispectral capabilities',
           9999.00, '2024-01-01', 500.00, 5, '2029-01-01', 'macrs-5',
           0, TRUE, 'Primary mapping drone'),

          ('DJI Air 3S', 'drone',
           'Consumer-grade aerial photography drone',
           1099.00, '2024-01-01', 100.00, 3, '2027-01-01', 'macrs-5',
           0, TRUE, 'Real estate and promotional video drone'),

          ('2020 Tesla Model Y', 'vehicle',
           'Business vehicle for site visits and equipment transport',
           42000.00, '2020-01-01', 5000.00, 5, '2027-01-01', 'straight-line',
           150.00, TRUE, 'Current miles: 126,000. Use standard mileage rate or actual expenses.')
        ON CONFLICT DO NOTHING;
      `);

      // Update the Tesla with mileage data
      await db.execute(sql`
        UPDATE business_assets
        SET vehicle_mileage_method = 'standard',
            total_miles_at_purchase = 0,
            current_miles = 126000
        WHERE name = '2020 Tesla Model Y';
      `);

      console.log("  Pre-seeded 3 business assets");
    }

    console.log("Business assets migration completed successfully");
  } catch (err) {
    console.error("Business assets migration failed:", err);
    throw err;
  }
}
