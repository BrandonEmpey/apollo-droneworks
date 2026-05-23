// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import express, { type Express } from "express";
import type { Server } from "http";
import { inArray } from "drizzle-orm";
import { db } from "../db";
import { services, type Service } from "@shared/schema";
import { registerRoutes } from "../routes";

// Regression coverage for Task #149 / #150: GET /api/services/:idOrSlug must
// only treat the param as a numeric ID when the entire string is digits.
// parseInt("3d-mapping") returns 3, which previously routed slug lookups
// through the ID branch and produced false 404s for any slug starting with
// a digit. The handler under test lives in server/routes.ts (~line 429);
// to lock the behavior in against future edits to that handler, this test
// boots the real registerRoutes() onto an in-process Express app and hits
// the production route directly.
describe("GET /api/services/:idOrSlug — digit-prefixed slug routing", () => {
  let server: Server;
  let baseUrl: string;
  const seedIds: number[] = [];
  let digitSlugServiceId = 0;
  let plainSlugServiceId = 0;
  const tag = `task150-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const digitSlug = `3d-mapping-${tag}`;
  const plainSlug = `aerial-photo-${tag}`;

  beforeAll(async () => {
    const inserted = await db
      .insert(services)
      .values([
        {
          name: `__test_digit_slug_${tag}__`,
          slug: digitSlug,
          description: "digit-prefixed slug fixture",
          imageUrl: "/x.jpg",
          price: 19900,
          pricingType: "flat",
          classification: "Revenue Generation",
          features: [],
          isActive: false,
        },
        {
          name: `__test_plain_slug_${tag}__`,
          slug: plainSlug,
          description: "plain slug fixture",
          imageUrl: "/x.jpg",
          price: 24900,
          pricingType: "flat",
          classification: "Revenue Generation",
          features: [],
          isActive: false,
        },
      ] as unknown as (typeof services.$inferInsert)[])
      .returning({ id: services.id });
    seedIds.push(...inserted.map((r) => r.id));
    digitSlugServiceId = inserted[0].id;
    plainSlugServiceId = inserted[1].id;

    const app: Express = express();
    app.use(express.json());
    // Boot the real production routes — including the handler under test
    // at server/routes.ts (~line 429). registerRoutes() returns the http
    // Server it created internally.
    server = await registerRoutes(app);
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

  it("returns 200 and the right service for a digit-prefixed slug like '3d-mapping'", async () => {
    const res = await fetch(`${baseUrl}/api/services/${digitSlug}`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as Service;
    expect(body.id).toBe(digitSlugServiceId);
    expect(body.slug).toBe(digitSlug);
  });

  it("returns 200 and the right service for a pure numeric ID", async () => {
    const res = await fetch(`${baseUrl}/api/services/${plainSlugServiceId}`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as Service;
    expect(body.id).toBe(plainSlugServiceId);
    expect(body.slug).toBe(plainSlug);
  });

  it("returns 404 for an unknown slug", async () => {
    const res = await fetch(
      `${baseUrl}/api/services/definitely-not-a-real-slug-${tag}`,
    );
    expect(res.status).toBe(404);
    const body = (await res.json()) as { message: string };
    expect(body.message).toBe("Service not found");
  });

  it("returns 404 (NOT a false ID match) for a slug-like token starting with digits but not in the DB", async () => {
    // Crucially, this must NOT match service id=plainSlugServiceId even
    // though parseInt("<id>abc") would yield that id under a naive handler.
    const probe = `${plainSlugServiceId}abc-${tag}`;
    const res = await fetch(`${baseUrl}/api/services/${probe}`);
    expect(res.status).toBe(404);
    const body = (await res.json()) as { message: string };
    expect(body.message).toBe("Service not found");
  });
});
