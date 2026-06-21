// @vitest-environment node
/**
 * Task #204 – Verify the canonical service guard in server/init-db.ts.
 *
 * The guard skips seeding only when ALL 10 canonical service names are present
 * in the database.  When any canonical name is missing (partial catalog or
 * completely empty table), the DELETE → INSERT seed path must run.
 *
 * CANONICAL_SERVICE_NAMES is imported directly from the module under test so
 * that a rename in init-db.ts will automatically surface as a test failure here.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ---------------------------------------------------------------------------
// Mock ../db before importing the module under test.
// We export both `db` (Drizzle) and `pool` (pg Pool) so every import path
// inside init-db.ts and its migration helpers is satisfied.
// ---------------------------------------------------------------------------
vi.mock("../db", () => {
  return {
    db: {
      execute: vi.fn(),
      select: vi.fn(),
      insert: vi.fn(),
      update: vi.fn(),
    },
    pool: {
      query: vi.fn().mockResolvedValue({ rows: [] }),
    },
  };
});

// ---------------------------------------------------------------------------
// Stub all migration modules dynamically imported by initializeDatabase().
// Each one is mocked to a no-op so it never calls pool.query or db.execute,
// keeping the "skip seeding" assertions clean.
// ---------------------------------------------------------------------------
vi.mock("../migrations/create-quotes-table", () => ({
  createQuotesTable: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("../migrations/update-quotes-business-costs", () => ({
  updateQuotesBusinessCosts: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("../migrations/create-business-config-table", () => ({
  createBusinessConfigTable: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("../migrations/add-software-and-custom-costs", () => ({
  addSoftwareAndCustomCosts: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("../migrations/create-payroll-tables", () => ({
  createPayrollTables: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("../migrations/rebuild-service-catalog", () => ({
  rebuildServiceCatalog: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("../migrations/add-pricing-settings", () => ({
  addPricingSettings: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("../migrations/populate-service-addon-links", () => ({
  populateServiceAddonLinks: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("../migrations/populate-rush-order-pricing", () => ({
  populateRushOrderPricing: vi.fn().mockResolvedValue(undefined),
}));

// Import after all mocks are registered.
import { db } from "../db";
import { initializeDatabase, CANONICAL_SERVICE_NAMES } from "../init-db";

// ---------------------------------------------------------------------------
// Helper: build a thenable query-builder result that also exposes .where()
// so it works for both:
//   await db.select().from(table)
//   await db.select().from(table).where(...)
// ---------------------------------------------------------------------------
function queryResult(rows: unknown[]) {
  const p = Promise.resolve(rows) as Promise<unknown[]> & {
    where: ReturnType<typeof vi.fn>;
  };
  p.where = vi.fn().mockResolvedValue(rows);
  return p;
}

// ---------------------------------------------------------------------------
// Configure the sequential select() calls made by initializeDatabase():
//   1st  → services table (controlled by caller — returns {id, name} rows)
//   2nd  → users table   (admin already exists → skip creation)
//   3rd  → testimonials  (already exist → skip)
//   4th  → blogPosts     (already exist → skip)
// ---------------------------------------------------------------------------
function configureSelects(opts: { servicesRows: { id: number; name: string }[] }) {
  const makeFrom = (rows: unknown[]) =>
    vi.fn().mockReturnValue(queryResult(rows));

  (db.select as ReturnType<typeof vi.fn>)
    .mockReturnValueOnce({ from: makeFrom(opts.servicesRows) })
    .mockReturnValueOnce({ from: makeFrom([{ id: 1, isAdmin: true }]) })
    .mockReturnValueOnce({ from: makeFrom([{ id: 1 }]) })
    .mockReturnValueOnce({ from: makeFrom([{ id: 1 }]) });
}

// ---------------------------------------------------------------------------
// Make db.execute return a safe value (rows array with an id field) so the
// addon-insert loop can read rows[0].id without crashing.
// ---------------------------------------------------------------------------
function configureExecute() {
  let callIdx = 0;
  (db.execute as ReturnType<typeof vi.fn>).mockImplementation(async () => {
    callIdx++;
    return { rows: [{ id: callIdx }] };
  });
}

// ---------------------------------------------------------------------------
// insert mock: values() → returning() chain (used for service inserts)
// ---------------------------------------------------------------------------
function configureInsert() {
  const returningMock = vi
    .fn()
    .mockResolvedValue([{ id: 1, name: "mock-service" }]);
  const valuesMock = vi.fn().mockReturnValue({ returning: returningMock });
  (db.insert as ReturnType<typeof vi.fn>).mockReturnValue({
    values: valuesMock,
  });
}

// ---------------------------------------------------------------------------
// update mock: set() → where() chain
// ---------------------------------------------------------------------------
function configureUpdate() {
  const whereMock = vi.fn().mockResolvedValue([]);
  const setMock = vi.fn().mockReturnValue({ where: whereMock });
  (db.update as ReturnType<typeof vi.fn>).mockReturnValue({ set: setMock });
}

// ---------------------------------------------------------------------------
// Build a full set of 11 service rows matching the canonical names.
// ---------------------------------------------------------------------------
function allCanonicalRows(): { id: number; name: string }[] {
  return CANONICAL_SERVICE_NAMES.map((name, i) => ({ id: i + 1, name }));
}

// ---------------------------------------------------------------------------
// Extract the raw SQL text from a Drizzle SQL object so we can assert on
// which DELETE statements were issued without depending on string comparison
// of the whole mock call args.
//
// Drizzle's `sql` template tag stores template-literal strings as StringChunk
// objects in `queryChunks`. Each chunk may be a plain string, an object with
// a `value` string property, or another SQL sub-expression. We concatenate
// all string parts to reconstruct the SQL text.
// ---------------------------------------------------------------------------
function getSqlText(sqlObj: unknown): string {
  if (!sqlObj || typeof sqlObj !== "object") return "";
  const chunks: unknown[] = (sqlObj as Record<string, unknown>)["queryChunks"] as unknown[] ?? [];
  return chunks
    .map((c) => {
      if (typeof c === "string") return c;
      if (c && typeof c === "object") {
        const v = (c as Record<string, unknown>)["value"];
        if (typeof v === "string") return v;
        // Drizzle StringChunk stores the template string as string[]
        if (Array.isArray(v)) return (v as string[]).join("");
      }
      return "";
    })
    .join("");
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("initializeDatabase – re-seed guard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    configureExecute();
    configureInsert();
    configureUpdate();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ── Canonical name list ──────────────────────────────────────────────────
  it("exports exactly 11 canonical service names", () => {
    expect(CANONICAL_SERVICE_NAMES).toHaveLength(11);
  });

  it("canonical list contains all expected service names", () => {
    const names = CANONICAL_SERVICE_NAMES as readonly string[];
    expect(names).toContain("Real Estate Listings");
    expect(names).toContain("Property Tours");
    expect(names).toContain("Promotional Content");
    expect(names).toContain("Roof Inspections");
    expect(names).toContain("Property & Site Evaluation");
    expect(names).toContain("Structural Inspections");
    expect(names).toContain("Aerial Mapping");
    expect(names).toContain("Construction Monitoring / Timelapse");
    expect(names).toContain("3D Digital Twin");
    expect(names).toContain("Rough-In Digital Twin");
    expect(names).toContain("Foundation to Finish");
    // Confirm retired names are gone
    expect(names).not.toContain("Infrastructure & Structure Inspections");
    expect(names).not.toContain("Construction Planning & Monitoring");
    expect(names).not.toContain("3D Modeling");
    expect(names).not.toContain("Timelapse Creation");
  });

  // ── Guard: all canonical names present → skip seeding ───────────────────
  it("does NOT call db.execute when all 11 canonical services are present", async () => {
    configureSelects({ servicesRows: allCanonicalRows() });

    await initializeDatabase();

    expect(db.execute).not.toHaveBeenCalled();
  });

  it("does NOT call db.insert for services when all 11 canonical services are present", async () => {
    configureSelects({ servicesRows: allCanonicalRows() });

    await initializeDatabase();

    // db.insert may still be called for admin user / testimonials / blog posts,
    // but it must NOT be called for services. We verify there are no insert
    // calls with a 'name' field that matches a canonical service name.
    const insertCalls = (db.insert as ReturnType<typeof vi.fn>).mock.calls;
    // Simplest form: when all canonical services exist, insert should not be
    // called at all (admin/testimonials/blogposts are also skipped via mocks).
    expect(db.insert).not.toHaveBeenCalled();
  });

  // ── Guard: partial catalog (9 of 10 canonical names) → reseed ───────────
  it("issues DELETE statements for service_addons, addons, and services when 10 of 11 present", async () => {
    const partialRows = allCanonicalRows().slice(0, 9);
    configureSelects({ servicesRows: partialRows });

    await initializeDatabase();

    const calls = (db.execute as ReturnType<typeof vi.fn>).mock.calls as [unknown][];
    const sqlTexts = calls.map(([arg]) => getSqlText(arg).toLowerCase());

    expect(sqlTexts.some((s) => s.includes("delete") && s.includes("service_addons"))).toBe(true);
    expect(sqlTexts.some((s) => s.includes("delete") && s.includes("addons"))).toBe(true);
    expect(sqlTexts.some((s) => s.includes("delete") && s.includes("services"))).toBe(true);
  });

  it("calls db.insert for services when only 10 of 11 canonical services are present", async () => {
    const partialRows = allCanonicalRows().slice(0, 9);
    configureSelects({ servicesRows: partialRows });

    await initializeDatabase();

    expect(db.insert).toHaveBeenCalled();
  });

  // ── Seed path: completely empty table ───────────────────────────────────
  it("issues DELETE statements for service_addons, addons, and services when table is empty", async () => {
    configureSelects({ servicesRows: [] });

    await initializeDatabase();

    const calls = (db.execute as ReturnType<typeof vi.fn>).mock.calls as [unknown][];
    const sqlTexts = calls.map(([arg]) => getSqlText(arg).toLowerCase());

    expect(sqlTexts.some((s) => s.includes("delete") && s.includes("service_addons"))).toBe(true);
    expect(sqlTexts.some((s) => s.includes("delete") && s.includes("addons"))).toBe(true);
    expect(sqlTexts.some((s) => s.includes("delete") && s.includes("services"))).toBe(true);
  });

  it("seeds all 11 canonical services when services table is empty", async () => {
    const seededNames: string[] = [];

    const returningMock = vi.fn().mockImplementation(async () => {
      const lastValues = valuesMock.mock.calls.at(-1)?.[0];
      const name = lastValues?.name ?? "unknown";
      seededNames.push(name);
      return [{ id: seededNames.length, name }];
    });
    const valuesMock = vi.fn().mockReturnValue({ returning: returningMock });
    (db.insert as ReturnType<typeof vi.fn>).mockReturnValue({
      values: valuesMock,
    });

    configureSelects({ servicesRows: [] });

    await initializeDatabase();

    const canonicalSeeded = seededNames.filter((n) =>
      (CANONICAL_SERVICE_NAMES as readonly string[]).includes(n),
    );
    expect(canonicalSeeded).toHaveLength(11);
    for (const name of CANONICAL_SERVICE_NAMES) {
      expect(canonicalSeeded).toContain(name);
    }
  });
});
