import { db } from "../db";

export async function addF2fDiscounts() {
  // 1. Add three per-entry-point F2F discount columns to business_config
  const colResult = await db.execute(
    `SELECT column_name FROM information_schema.columns WHERE table_name = 'business_config'`
  );
  const existing = new Set((colResult.rows as any[]).map((r: any) => r.column_name));

  const newCols: { col: string; def: number }[] = [
    { col: "f2f_discount_framing",    def: 15 },
    { col: "f2f_discount_completion", def: 8  },
    { col: "f2f_discount_finish",     def: 0  },
  ];
  for (const { col, def } of newCols) {
    if (!existing.has(col)) {
      await db.execute(
        `ALTER TABLE business_config ADD COLUMN IF NOT EXISTS ${col} INTEGER DEFAULT ${def}`
      );
    }
  }

  // 2. Update Rough-In Digital Twin: description and per-tier descriptions
  //    "your home" → "your property"; tier copy genericized
  await db.execute(`
    UPDATE services
    SET
      description = 'A complete 3D digital record of your property at the one moment that matters most — right before drywall goes up, when every pipe, wire, and duct is still visible.',
      pricing_tiers = '[
        {"name":"Standard","priceType":"fixed","price":70000,"description":"Single property rough-in capture"},
        {"name":"Premium","priceType":"fixed","price":115000,"description":"Larger property or multiple structures"}
      ]'::jsonb
    WHERE slug = 'rough-in-digital-twin'
  `);

  // 3. Update Foundation to Finish:
  //    - pricingTiers: rename "Phase 2B" → "Phase 2", update all phase titles
  //    - features: remove two stale bullets, update discount bullet
  await db.execute(`
    UPDATE services
    SET
      pricing_tiers = '[
        {"name":"Phase 1 — Initial Aerial Mapping of the Bare Ground Site","phase":1,"priceType":"fixed","price":50000,"premiumPrice":80000,"description":"Initial aerial mapping of the bare-ground site"},
        {"name":"Phase 2 — Full Digital Twin at the Rough-In / Pre-Drywall Stage","phase":2,"priceType":"fixed","price":70000,"premiumPrice":115000,"description":"Full Digital Twin captured at rough-in / pre-drywall stage"},
        {"name":"Phase 3 — Aerial Photography & Video at Project Completion","phase":3,"priceType":"fixed","price":30000,"premiumPrice":45000,"description":"Aerial photography and video at project completion"},
        {"name":"Phase 4 — Full Exterior Digital Twin of the Finished Property","phase":4,"priceType":"fixed","price":90000,"premiumPrice":150000,"description":"Full exterior Digital Twin of the finished property"},
        {"name":"Phase 5 — Full Interior Digital Twin of the Finished Property","phase":5,"priceType":"fixed","price":50000,"premiumPrice":75000,"description":"Full interior Digital Twin of the finished property"},
        {"name":"Phase 6 — Full Project Archive including Combined Digital Twin","phase":6,"priceType":"fixed","price":40000,"premiumPrice":60000,"description":"Assembly of the full project archive and combined twin"}
      ]'::jsonb,
      features = '[
        "Phase 1: Initial Aerial Mapping of the Bare Ground Site",
        "Phase 2: Full Digital Twin at the Rough-In / Pre-Drywall Stage",
        "Phase 3: Aerial Photography & Video at Project Completion",
        "Phase 4: Full Exterior Digital Twin of the Finished Property",
        "Phase 5: Full Interior Digital Twin of the Finished Property",
        "Phase 6: Full Project Archive including Combined Digital Twin",
        "Save up to 25% — the discount scales with how early you start."
      ]'::jsonb
    WHERE slug = 'foundation-to-finish'
  `);

  console.log("[add-f2f-discounts] Migration complete");
}
