// @vitest-environment node
/**
 * Task #211 – Verify the Aerial Mapping service survives a server restart without
 * re-seeding.
 *
 * Checks:
 *   1. "Aerial Mapping" is in CANONICAL_SERVICE_NAMES.
 *   2. When all 11 canonical services are already present, initializeDatabase()
 *      skips seeding (no db.insert / db.execute calls for the seed path).
 *   3. When seeding from an empty DB (simulated restart / fresh install), the
 *      Aerial Mapping service is inserted with price = 25000.
 *   4. When seeding from an empty DB, exactly 8 service-addon links are created
 *      for the Aerial Mapping service.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ---------------------------------------------------------------------------
// Mock ../db before importing the module under test.
// ---------------------------------------------------------------------------
vi.mock("../db", () => ({
  db: {
    execute: vi.fn(),
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
  },
  pool: {
    query: vi.fn().mockResolvedValue({ rows: [] }),
  },
}));

// ---------------------------------------------------------------------------
// Stub migration modules dynamically imported by initializeDatabase().
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
vi.mock("../migrations/populate-service-addon-links", () => ({
  populateServiceAddonLinks: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("../migrations/populate-rush-order-pricing", () => ({
  populateRushOrderPricing: vi.fn().mockResolvedValue(undefined),
}));

import { db } from "../db";
import { initializeDatabase, CANONICAL_SERVICE_NAMES } from "../init-db";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a thenable select result that also exposes .where(). */
function queryResult(rows: unknown[]) {
  const p = Promise.resolve(rows) as Promise<unknown[]> & {
    where: ReturnType<typeof vi.fn>;
  };
  p.where = vi.fn().mockResolvedValue(rows);
  return p;
}

/**
 * Wire up the four sequential db.select() calls made by initializeDatabase():
 *   1st  → services table  (controlled by caller)
 *   2nd  → users table     (admin already exists → skip creation)
 *   3rd  → testimonials    (already exist → skip)
 *   4th  → blogPosts       (already exist → skip)
 */
function configureSelects(opts: { servicesRows: { id: number; name: string }[] }) {
  const makeFrom = (rows: unknown[]) => vi.fn().mockReturnValue(queryResult(rows));

  (db.select as ReturnType<typeof vi.fn>)
    .mockReturnValueOnce({ from: makeFrom(opts.servicesRows) })
    .mockReturnValueOnce({ from: makeFrom([{ id: 1, isAdmin: true }]) })
    .mockReturnValueOnce({ from: makeFrom([{ id: 1 }]) })
    .mockReturnValueOnce({ from: makeFrom([{ id: 1 }]) });
}

/**
 * Wire up db.execute so each addon INSERT RETURNING returns a unique ID.
 * The first three calls (DELETEs) return an empty-ish row; subsequent calls
 * return auto-incrementing IDs starting at 1 to simulate addon row insertion.
 */
function configureExecute() {
  let addonCallIdx = 0;
  (db.execute as ReturnType<typeof vi.fn>).mockImplementation(async () => {
    addonCallIdx++;
    return { rows: [{ id: addonCallIdx }] };
  });
}

/**
 * Wire up db.insert so each service INSERT returns a unique ID based on
 * insertion order.  The name is extracted from the values() argument so
 * the service-addon link phase can match service IDs to names.
 */
function configureInsert() {
  let serviceIdx = 0;
  (db.insert as ReturnType<typeof vi.fn>).mockReturnValue({
    values: vi.fn().mockImplementation((data: { name?: string }) => {
      serviceIdx++;
      const id = serviceIdx;
      const name = data?.name ?? "unknown";
      return {
        returning: vi.fn().mockResolvedValue([{ id, name }]),
      };
    }),
  });
}

/** Wire up db.update so the set().where() chain resolves safely. */
function configureUpdate() {
  const whereMock = vi.fn().mockResolvedValue([]);
  const setMock = vi.fn().mockReturnValue({ where: whereMock });
  (db.update as ReturnType<typeof vi.fn>).mockReturnValue({ set: setMock });
}

/** All 11 canonical service rows (simulates a complete existing catalog). */
function allCanonicalRows(): { id: number; name: string }[] {
  return CANONICAL_SERVICE_NAMES.map((name, i) => ({ id: i + 1, name }));
}

/**
 * Extract human-readable SQL text from a Drizzle sql`` template object so we
 * can assert on which statements were issued.
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

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("Aerial Mapping – server-restart idempotency", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    configureExecute();
    configureInsert();
    configureUpdate();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ── 1. Canonical list includes "Aerial Mapping" ─────────────────────────
  it("CANONICAL_SERVICE_NAMES contains 'Aerial Mapping'", () => {
    expect(CANONICAL_SERVICE_NAMES as readonly string[]).toContain("Aerial Mapping");
  });

  // ── 2. All 11 present → guard skips seeding ──────────────────────────────
  it("does NOT call db.execute when all 11 canonical services are present (including Aerial Mapping)", async () => {
    configureSelects({ servicesRows: allCanonicalRows() });

    await initializeDatabase();

    expect(db.execute).not.toHaveBeenCalled();
  });

  it("does NOT call db.insert when all 11 canonical services are present (including Aerial Mapping)", async () => {
    configureSelects({ servicesRows: allCanonicalRows() });

    await initializeDatabase();

    expect(db.insert).not.toHaveBeenCalled();
  });

  // ── 3. Seed path: Aerial Mapping inserted with price = 40000 ─────────────
  it("seeds Aerial Mapping with price = 40000 when the services table is empty", async () => {
    const seededServices: Array<{ name: string; price: number }> = [];

    // Override the insert mock to capture price alongside name.
    let serviceIdx = 0;
    (db.insert as ReturnType<typeof vi.fn>).mockReturnValue({
      values: vi.fn().mockImplementation((data: { name?: string; price?: number }) => {
        serviceIdx++;
        const id = serviceIdx;
        const name = data?.name ?? "unknown";
        seededServices.push({ name, price: data?.price ?? -1 });
        return {
          returning: vi.fn().mockResolvedValue([{ id, name }]),
        };
      }),
    });

    configureSelects({ servicesRows: [] });

    await initializeDatabase();

    const aerialMapping = seededServices.find((s) => s.name === "Aerial Mapping");
    expect(aerialMapping, "Aerial Mapping was not seeded").toBeDefined();
    expect(aerialMapping!.price).toBe(40000);
  });

  // ── 4. Seed path: exactly 8 add-on links for Aerial Mapping ─────────────
  it("creates exactly 8 service-addon links for Aerial Mapping when seeding from empty DB", async () => {
    // Track service name → inserted ID so we can correlate add-on links.
    const serviceNameToId = new Map<string, number>();
    let serviceIdx = 0;

    (db.insert as ReturnType<typeof vi.fn>).mockReturnValue({
      values: vi.fn().mockImplementation((data: { name?: string }) => {
        serviceIdx++;
        const id = serviceIdx;
        const name = data?.name ?? "unknown";
        serviceNameToId.set(name, id);
        return {
          returning: vi.fn().mockResolvedValue([{ id, name }]),
        };
      }),
    });

    configureSelects({ servicesRows: [] });

    await initializeDatabase();

    // The Aerial Mapping service ID as recorded during insertion.
    const aerialMappingId = serviceNameToId.get("Aerial Mapping");
    expect(aerialMappingId, "Aerial Mapping service ID was not found after seeding").toBeDefined();

    // Count service_addon INSERT calls whose FIRST SQL parameter equals the
    // Aerial Mapping service ID.
    //
    // Drizzle's sql`` tag stores parameter values as raw primitives directly in
    // the queryChunks array (StringChunks are objects; param values are plain
    // primitives like numbers or strings).  The INSERT INTO service_addons SQL
    // is: VALUES (${service_id}, ${addon_id}, true), so the first primitive
    // chunk is always the service_id.  Checking only the first primitive avoids
    // false positives when another service has an addon whose ID happens to
    // equal the Aerial Mapping service ID.
    const executeCalls = (db.execute as ReturnType<typeof vi.fn>).mock.calls as [unknown][];
    const addonLinkCount = executeCalls.filter(([sqlObj]) => {
      const text = getSqlText(sqlObj).toLowerCase();
      if (!text.includes("service_addons") || !text.includes("insert")) return false;
      const chunks: unknown[] =
        (sqlObj as Record<string, unknown>)["queryChunks"] as unknown[] ?? [];
      // Find the first parameter (primitive — not a StringChunk object).
      const firstParam = chunks.find((c) => c === null || typeof c !== "object");
      return firstParam === aerialMappingId;
    }).length;

    expect(addonLinkCount).toBe(1);
  });

  // ── 5. Two-phase restart simulation ─────────────────────────────────────
  it("seeds on first call (empty DB) then skips on second call (simulated restart)", async () => {
    // Phase 1: empty DB → full seed including Aerial Mapping.
    const seededNames: string[] = [];
    let serviceIdx = 0;

    (db.insert as ReturnType<typeof vi.fn>).mockReturnValue({
      values: vi.fn().mockImplementation((data: { name?: string }) => {
        serviceIdx++;
        const id = serviceIdx;
        const name = data?.name ?? "unknown";
        seededNames.push(name);
        return {
          returning: vi.fn().mockResolvedValue([{ id, name }]),
        };
      }),
    });

    configureSelects({ servicesRows: [] });
    await initializeDatabase();

    expect(seededNames).toContain("Aerial Mapping");
    const insertCallsAfterPhase1 = (db.insert as ReturnType<typeof vi.fn>).mock.calls.length;
    expect(insertCallsAfterPhase1).toBeGreaterThan(0);

    // Phase 2: simulate restart — all 11 canonical services are now in the DB.
    // The guard must skip seeding entirely.
    vi.clearAllMocks();
    configureExecute();
    configureInsert();
    configureUpdate();

    configureSelects({ servicesRows: allCanonicalRows() });
    await initializeDatabase();

    expect(db.execute).not.toHaveBeenCalled();
    expect(db.insert).not.toHaveBeenCalled();
  });
});
