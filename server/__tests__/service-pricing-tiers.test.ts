import { describe, it, expect, beforeAll, afterAll } from "vitest";
import express, { type Express } from "express";
import { createServer, type Server } from "http";
import { db } from "../db";
import { services, type Service } from "@shared/schema";
import { eq, sql, inArray } from "drizzle-orm";
import { storage } from "../storage";

type LegacyExistsRow = { exists: string | null };
type TierShape = {
  price?: number;
  minPrice?: number;
  features?: string[];
  isPopular?: boolean;
  displayOrder?: number;
};

const TEST_TIERS_A = [
  { price: 19900, features: ["Basic"], displayOrder: 1 },
  { price: 49900, features: ["Standard"], displayOrder: 2 },
  { price: 79900, features: ["Premium"], isPopular: true, displayOrder: 3 },
];
const TEST_TIERS_B = [
  { price: 24900, features: ["Starter"], displayOrder: 1 },
  { price: 59900, features: ["Pro"], displayOrder: 2 },
  { price: 79900, features: ["Enterprise"], isPopular: true, displayOrder: 3 },
];
const TEST_TIERS_C = [
  { price: 49900, features: ["Entry"], displayOrder: 1 },
  { price: 149900, features: ["Standard"], displayOrder: 2 },
  { price: 249900, features: ["Full Suite"], isPopular: true, displayOrder: 3 },
];

describe("service detail pricing tiers (JSONB column is source of truth)", () => {
  let server: Server;
  let baseUrl: string;
  let seedIds: number[] = [];

  beforeAll(async () => {
    // Seed three tiered test services
    const inserted = await db
      .insert(services)
      .values([
        { name: "__test_tiered_A__", description: "test", price: 19900, pricingType: "tiered", pricingTiers: TEST_TIERS_A as any, isActive: false },
        { name: "__test_tiered_B__", description: "test", price: 24900, pricingType: "tiered", pricingTiers: TEST_TIERS_B as any, isActive: false },
        { name: "__test_tiered_C__", description: "test", price: 49900, pricingType: "tiered", pricingTiers: TEST_TIERS_C as any, isActive: false },
      ])
      .returning({ id: services.id });
    seedIds = inserted.map((r) => r.id);

    const app: Express = express();
    app.get("/api/services/:idOrSlug", async (req, res) => {
      try {
        const idOrSlug = req.params.idOrSlug;
        const isNumericId = /^\d+$/.test(idOrSlug);
        let service: Service | undefined;
        if (isNumericId) {
          service = await storage.getService(parseInt(idOrSlug, 10));
        } else {
          const all = await storage.getServices();
          service = all.find((s) => s.slug === idOrSlug);
        }
        if (!service) return res.status(404).json({ message: "Service not found" });
        res.json(service);
      } catch (error) {
        res.status(500).json({
          message: error instanceof Error ? error.message : String(error),
        });
      }
    });
    server = createServer(app);
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const addr = server.address();
    if (!addr || typeof addr === "string") throw new Error("listen failed");
    baseUrl = `http://127.0.0.1:${addr.port}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    if (seedIds.length) {
      await db.delete(services).where(inArray(services.id, seedIds));
    }
  });

  it("the legacy pricing_tiers table no longer exists", async () => {
    const result = await db.execute<LegacyExistsRow>(
      sql`SELECT to_regclass('public.pricing_tiers')::text AS exists`,
    );
    expect(result.rows[0]?.exists).toBeNull();
  });

  it.each([
    [0, 19900, 79900],
    [1, 24900, 79900],
    [2, 49900, 249900],
  ])(
    "seeded tiered service %i carries cent-priced packages on services.pricing_tiers JSONB",
    async (index, expectedMin, expectedMax) => {
      const id = seedIds[index];
      const [service] = await db.select().from(services).where(eq(services.id, id));
      expect(service).toBeTruthy();
      expect(service.pricingType).toBe("tiered");
      const tiers = (service.pricingTiers ?? []) as TierShape[];
      expect(tiers.length).toBeGreaterThan(0);
      const prices = tiers
        .map((t) => t.price)
        .filter((p): p is number => typeof p === "number");
      expect(Math.min(...prices)).toBeGreaterThanOrEqual(expectedMin);
      expect(Math.max(...prices)).toBeGreaterThanOrEqual(expectedMax);
    },
  );

  it.each([0, 1, 2])(
    "GET /api/services/:id returns JSONB tiers without any legacy snake_case overlay (seeded service %i)",
    async (index) => {
      const id = seedIds[index];
      const res = await fetch(`${baseUrl}/api/services/${id}`);
      expect(res.status).toBe(200);
      const body = (await res.json()) as Service & { pricingTiers: TierShape[] };
      expect(Array.isArray(body.pricingTiers)).toBe(true);
      expect(body.pricingTiers.length).toBeGreaterThan(0);
      expect(body.pricingType).toBe("tiered");
      for (const tier of body.pricingTiers) {
        const record = tier as Record<string, unknown>;
        expect(record.min_price).toBeUndefined();
        expect(record.max_price).toBeUndefined();
        expect(record.service_id).toBeUndefined();
        expect(typeof tier.price === "number" || typeof tier.minPrice === "number").toBe(true);
      }
    },
  );

  it("admin tier edits round-trip through storage.updateService and persist on the service row", async () => {
    const id = seedIds[0];
    const [before] = await db.select().from(services).where(eq(services.id, id));
    const original = (before.pricingTiers ?? []) as TierShape[];
    expect(original.length).toBeGreaterThan(0);
    const tweaked = original.map((tier, index) =>
      index === 0 && typeof tier.price === "number"
        ? { ...tier, price: tier.price + 100 }
        : tier,
    );
    try {
      await storage.updateService(id, { pricingTiers: tweaked });
      const [after] = await db.select().from(services).where(eq(services.id, id));
      const afterTiers = (after.pricingTiers ?? []) as TierShape[];
      expect(afterTiers[0]?.price).toBe((original[0]?.price ?? 0) + 100);
    } finally {
      await storage.updateService(id, { pricingTiers: original });
    }
  });

  it("no service is left as tiered with an empty pricing_tiers JSONB", async () => {
    const rows = await db.select().from(services);
    const broken = rows.filter(
      (s) =>
        s.pricingType === "tiered" &&
        (!Array.isArray(s.pricingTiers) || s.pricingTiers.length === 0),
    );
    expect(broken).toEqual([]);
  });
});
