import { sql } from "drizzle-orm";
import { db } from "../db";

export async function addServiceDeliverables(): Promise<void> {
  const exists = await db.execute(sql`
    SELECT EXISTS (
      SELECT FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'service_deliverables'
    )
  `);

  if ((exists.rows[0] as any).exists) {
    return;
  }

  await db.execute(sql`
    CREATE TABLE "service_deliverables" (
      "id" SERIAL PRIMARY KEY,
      "service_id" INTEGER NOT NULL REFERENCES "services"("id") ON DELETE CASCADE,
      "name" VARCHAR(255) NOT NULL,
      "description" TEXT,
      "default_days_to_complete" INTEGER DEFAULT 7,
      "display_order" INTEGER DEFAULT 0,
      "is_required" BOOLEAN DEFAULT true,
      "default_external_url_label" VARCHAR(255),
      "created_at" TIMESTAMPTZ DEFAULT NOW(),
      "updated_at" TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await db.execute(sql`
    CREATE INDEX "service_deliverables_service_id_idx"
    ON "service_deliverables" ("service_id")
  `);

  console.log("service_deliverables table created");
}
