import { db } from "../db";
import { sql } from "drizzle-orm";

/**
 * Task #158: Align FK ON DELETE rules in the live database with the declared
 * rules in `shared/schema.ts`. During Task #155 we discovered drift on:
 *   - service_bundle_discounts.primary_service_id   (was NO ACTION; schema: CASCADE)
 *   - service_bundle_discounts.secondary_service_id (was NO ACTION; schema: CASCADE)
 *   - bookings.service_id                           (was NO ACTION; schema: RESTRICT)
 *
 * This migration is idempotent: it inspects pg_constraint and only re-creates
 * the FK if its confdeltype does not already match the desired rule. Re-running
 * after a successful pass is a no-op.
 */
export async function alignServiceFkRules() {
  type FkSpec = {
    constraintName: string;
    table: string;
    column: string;
    referencedTable: string;
    referencedColumn: string;
    /** 'c' = CASCADE, 'r' = RESTRICT, 'a' = NO ACTION, 'n' = SET NULL, 'd' = SET DEFAULT */
    desiredDeleteType: "c" | "r" | "a" | "n" | "d";
    onDeleteSql: string;
  };

  const targets: FkSpec[] = [
    {
      constraintName: "service_bundle_discounts_primary_service_id_fkey",
      table: "service_bundle_discounts",
      column: "primary_service_id",
      referencedTable: "services",
      referencedColumn: "id",
      desiredDeleteType: "c",
      onDeleteSql: "ON DELETE CASCADE",
    },
    {
      constraintName: "service_bundle_discounts_secondary_service_id_fkey",
      table: "service_bundle_discounts",
      column: "secondary_service_id",
      referencedTable: "services",
      referencedColumn: "id",
      desiredDeleteType: "c",
      onDeleteSql: "ON DELETE CASCADE",
    },
    {
      constraintName: "bookings_service_id_fkey",
      table: "bookings",
      column: "service_id",
      referencedTable: "services",
      referencedColumn: "id",
      desiredDeleteType: "r",
      onDeleteSql: "ON DELETE RESTRICT",
    },
  ];

  try {
    for (const t of targets) {
      const tableExists = await db.execute(sql`
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = ${t.table}
      `);
      if ((tableExists.rowCount ?? 0) === 0) {
        console.log(`[align-service-fk-rules] Table ${t.table} not present, skipping ${t.constraintName}`);
        continue;
      }

      const existing = await db.execute(sql`
        SELECT conname, confdeltype
        FROM pg_constraint
        WHERE conrelid = ${`public.${t.table}`}::regclass
          AND conname = ${t.constraintName}
      `);

      const currentDeleteType =
        (existing.rows[0] as { confdeltype?: string } | undefined)?.confdeltype;

      if (currentDeleteType === t.desiredDeleteType) {
        console.log(
          `[align-service-fk-rules] ${t.constraintName} already has desired ON DELETE rule, skipping`
        );
        continue;
      }

      console.log(
        `[align-service-fk-rules] Updating ${t.constraintName} (current=${currentDeleteType ?? "missing"}, desired=${t.desiredDeleteType})`
      );

      if (currentDeleteType) {
        await db.execute(
          sql.raw(`ALTER TABLE "${t.table}" DROP CONSTRAINT "${t.constraintName}"`)
        );
      }

      await db.execute(
        sql.raw(
          `ALTER TABLE "${t.table}" ADD CONSTRAINT "${t.constraintName}" ` +
            `FOREIGN KEY ("${t.column}") REFERENCES "${t.referencedTable}"("${t.referencedColumn}") ` +
            t.onDeleteSql
        )
      );
    }

    console.log("[align-service-fk-rules] FK alignment complete");
  } catch (error) {
    console.error("[align-service-fk-rules] Error aligning FK rules:", error);
    throw error;
  }
}
