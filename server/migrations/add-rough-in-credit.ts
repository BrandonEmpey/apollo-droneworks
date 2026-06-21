/**
 * Adds credit tracking columns to the bookings table:
 *   credit_amount            — cents of Rough-In Digital Twin credit applied to this booking
 *   credit_source_booking_id — the Rough-In booking that granted this credit
 *
 * These fields are non-null-safe: NULL means no credit was applied / granted.
 * A completed Rough-In booking where no subsequent F2F or 3DT booking references
 * it as credit_source_booking_id represents an outstanding (unredeemed) credit.
 */

import { db } from "../db";

export async function addRoughInCredit() {
  const existing = await db.execute(`
    SELECT column_name FROM information_schema.columns
    WHERE table_name = 'bookings'
    AND column_name IN ('credit_amount', 'credit_source_booking_id')
  `);
  const cols = new Set((existing.rows as any[]).map((r: any) => r.column_name));

  if (!cols.has('credit_amount')) {
    await db.execute(`ALTER TABLE bookings ADD COLUMN credit_amount INTEGER DEFAULT 0`);
    console.log("[add-rough-in-credit] Added bookings.credit_amount");
  }
  if (!cols.has('credit_source_booking_id')) {
    await db.execute(`ALTER TABLE bookings ADD COLUMN credit_source_booking_id INTEGER REFERENCES bookings(id) ON DELETE SET NULL`);
    console.log("[add-rough-in-credit] Added bookings.credit_source_booking_id");
  }
  if (cols.has('credit_amount') && cols.has('credit_source_booking_id')) {
    console.log("[add-rough-in-credit] Columns already present — skipping.");
  }
}
