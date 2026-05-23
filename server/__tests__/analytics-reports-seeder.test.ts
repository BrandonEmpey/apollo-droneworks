// @vitest-environment node
/**
 * Task #220 – Verify the analytics_reports seeder and schema migration.
 *
 * The seeder (populate-analytics-data.ts) previously hit:
 *   "column 'configuration' of relation 'analytics_reports' does not exist"
 * on every startup because the `CREATE TABLE IF NOT EXISTS` in
 * migrate-financial-analytics.ts skips when the table already exists, leaving
 * legacy deployments without the `configuration` JSONB column.
 *
 * The fix is a two-part contract tested here:
 *   1. fixAnalyticsReportsSchema() issues an ADD COLUMN IF NOT EXISTS SQL
 *      statement for `configuration` (idempotent, safe on fresh DBs).
 *   2. populateAnalyticsData() short-circuits and returns 'skipped_no_admin'
 *      when no admin user exists, preventing FK violations.
 *   3. populateAnalyticsData() inserts analyticsReports rows that include a
 *      `configuration` object when an admin user is present.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ---------------------------------------------------------------------------
// Mock ../db before importing modules under test.
// ---------------------------------------------------------------------------
vi.mock("../db", () => ({
  db: {
    execute: vi.fn(),
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  pool: {
    query: vi.fn().mockResolvedValue({ rows: [] }),
  },
}));

import { db } from "../db";
import { fixAnalyticsReportsSchema } from "../migrations/fix-analytics-reports-schema";
import { populateAnalyticsData } from "../populate-analytics-data";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Extract the SQL text from a Drizzle sql`` template object.
 * Drizzle stores template literal chunks as StringChunk objects in queryChunks.
 */
function getSqlText(sqlObj: unknown): string {
  if (!sqlObj || typeof sqlObj !== "object") return "";
  const chunks: unknown[] =
    (sqlObj as Record<string, unknown>)["queryChunks"] as unknown[] ?? [];
  return chunks
    .map((c) => {
      if (typeof c === "string") return c;
      if (c && typeof c === "object") {
        const v = (c as Record<string, unknown>)["value"];
        if (typeof v === "string") return v;
        if (Array.isArray(v)) return (v as string[]).join("");
      }
      return "";
    })
    .join("");
}

/**
 * Build a Drizzle-like select() chain that resolves to the given rows and
 * also supports .where(...) chaining.
 */
function selectResult(rows: unknown[]) {
  const withClause = {
    where: vi.fn().mockResolvedValue(rows),
    orderBy: vi.fn().mockResolvedValue(rows),
    limit: vi.fn().mockReturnThis(),
  };
  const fromResult = Object.assign(Promise.resolve(rows), withClause);
  return { from: vi.fn().mockReturnValue(fromResult) };
}

// ---------------------------------------------------------------------------
// Tests: fixAnalyticsReportsSchema
// ---------------------------------------------------------------------------
describe("fixAnalyticsReportsSchema – idempotent migration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (db.execute as ReturnType<typeof vi.fn>).mockResolvedValue({ rows: [] });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("executes at least one SQL statement", async () => {
    await fixAnalyticsReportsSchema();
    expect(db.execute).toHaveBeenCalled();
  });

  it("includes ADD COLUMN IF NOT EXISTS for the configuration column", async () => {
    await fixAnalyticsReportsSchema();

    const calls = (db.execute as ReturnType<typeof vi.fn>).mock.calls as [unknown][];
    const allSql = calls.map(([arg]) => getSqlText(arg).toLowerCase()).join("\n");

    expect(allSql).toContain("add column if not exists");
    expect(allSql).toContain("configuration");
  });

  it("includes ADD COLUMN IF NOT EXISTS for is_default, schedule, last_generated_at, last_generated_data", async () => {
    await fixAnalyticsReportsSchema();

    const calls = (db.execute as ReturnType<typeof vi.fn>).mock.calls as [unknown][];
    const allSql = calls.map(([arg]) => getSqlText(arg).toLowerCase()).join("\n");

    expect(allSql).toContain("is_default");
    expect(allSql).toContain("schedule");
    expect(allSql).toContain("last_generated_at");
    expect(allSql).toContain("last_generated_data");
  });
});

// ---------------------------------------------------------------------------
// Tests: populateAnalyticsData – short-circuit when no admin user
// ---------------------------------------------------------------------------
describe("populateAnalyticsData – no admin user guard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // No admin user found
    (db.select as ReturnType<typeof vi.fn>).mockReturnValue(
      selectResult([])  // empty = no admin
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns 'skipped_no_admin' when no admin user exists", async () => {
    const result = await populateAnalyticsData();
    expect(result).toBe("skipped_no_admin");
  });

  it("does NOT call db.insert when no admin user exists", async () => {
    await populateAnalyticsData();
    expect(db.insert).not.toHaveBeenCalled();
  });

  it("does NOT call db.delete when no admin user exists", async () => {
    await populateAnalyticsData();
    expect(db.delete).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Tests: populateAnalyticsData – inserts configuration when admin exists
// ---------------------------------------------------------------------------
describe("populateAnalyticsData – analytics reports include configuration", () => {
  /** Collects all values passed to db.insert(...).values(data). */
  const insertedValues: unknown[] = [];

  beforeEach(() => {
    vi.clearAllMocks();
    insertedValues.length = 0;

    // Admin user found
    (db.select as ReturnType<typeof vi.fn>).mockReturnValue(
      selectResult([{ id: 1, isAdmin: true }])
    );

    // delete() → returns a safe object (Drizzle delete builder)
    (db.delete as ReturnType<typeof vi.fn>).mockReturnValue({
      where: vi.fn().mockResolvedValue([]),
    });

    // insert() → captures inserted values then resolves
    (db.insert as ReturnType<typeof vi.fn>).mockReturnValue({
      values: vi.fn().mockImplementation((data: unknown) => {
        insertedValues.push(data);
        return {
          returning: vi.fn().mockResolvedValue([{ id: insertedValues.length }]),
        };
      }),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("calls db.insert at least once when admin user exists", async () => {
    await populateAnalyticsData();
    expect(db.insert).toHaveBeenCalled();
  });

  it("inserts at least one analytics_reports row that contains a configuration object", async () => {
    await populateAnalyticsData();

    // The analyticsReports inserts include a `configuration` key.
    // Other tables (droneAnalytics, marketingAnalytics, etc.) do not have
    // a `configuration` field, so we can use its presence as a discriminator.
    const reportInserts = insertedValues.filter(
      (v) =>
        v !== null &&
        typeof v === "object" &&
        "configuration" in (v as Record<string, unknown>)
    );

    expect(reportInserts.length).toBeGreaterThanOrEqual(1);
  });

  it("every analytics_reports insert has configuration.metrics as a non-empty array", async () => {
    await populateAnalyticsData();

    const reportInserts = insertedValues.filter(
      (v) =>
        v !== null &&
        typeof v === "object" &&
        "configuration" in (v as Record<string, unknown>)
    ) as Array<{ configuration: { metrics?: unknown } }>;

    expect(reportInserts.length).toBeGreaterThanOrEqual(1);

    for (const row of reportInserts) {
      expect(Array.isArray(row.configuration.metrics)).toBe(true);
      expect((row.configuration.metrics as unknown[]).length).toBeGreaterThan(0);
    }
  });
});
