// @vitest-environment node
import { describe, it, expect, beforeAll, beforeEach, afterAll, vi } from "vitest";
import { eq, or, inArray } from "drizzle-orm";
import express, { type Express } from "express";
import type { Server } from "http";
import { MemStorage } from "../storage";
import { DatabaseStorage, ServiceHasBookingsError } from "../database-storage";
import { db } from "../db";
import { registerRoutes } from "../routes";
import { storage as productionStorage } from "../storage";
import {
  services,
  serviceBundleDiscounts,
  bookings,
  users,
  type InsertService,
  type InsertBooking,
} from "@shared/schema";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);
async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

const baseService: InsertService = {
  name: "Event Coverage",
  slug: "event-coverage",
  description: "Aerial photo and video for events",
  imageUrl: "/img/event.jpg",
  price: 29900,
  pricingType: "flat",
  classification: "Revenue Generation",
  features: [],
  whatsIncludedContent: [],
  possibilities: [],
  processSteps: [],
} as unknown as InsertService;

function makeBooking(serviceId: number): InsertBooking {
  return {
    userId: null,
    serviceId,
    customerName: "Jane Doe",
    customerEmail: "jane@example.com",
    status: "pending",
  } as unknown as InsertBooking;
}

describe("storage.deleteService – dependency safety", () => {
  let storage: MemStorage;

  beforeEach(() => {
    storage = new MemStorage();
  });

  it("removes a service when nothing depends on it", async () => {
    const created = await storage.createService(baseService);
    const ok = await storage.deleteService(created.id);
    expect(ok).toBe(true);
    expect(await storage.getService(created.id)).toBeUndefined();
  });

  it("blocks deletion when bookings reference the service and leaves rows intact", async () => {
    const created = await storage.createService(baseService);
    await storage.createBooking(makeBooking(created.id));
    await storage.createBooking(makeBooking(created.id));

    let thrown: unknown = null;
    try {
      await storage.deleteService(created.id);
    } catch (err) {
      thrown = err;
    }

    expect(thrown).toBeInstanceOf(ServiceHasBookingsError);
    const err = thrown as ServiceHasBookingsError;
    expect(err.serviceId).toBe(created.id);
    expect(err.bookingsCount).toBe(2);

    expect(await storage.getService(created.id)).toBeDefined();
    const remaining = (await storage.getBookings()).filter(
      (b) => b.serviceId === created.id,
    );
    expect(remaining).toHaveLength(2);
  });

  it("ignores bookings that point to other services", async () => {
    const a = await storage.createService(baseService);
    const b = await storage.createService({ ...baseService, name: "Other", slug: "other" } as InsertService);
    await storage.createBooking(makeBooking(b.id));

    const ok = await storage.deleteService(a.id);
    expect(ok).toBe(true);
    expect(await storage.getService(a.id)).toBeUndefined();
    expect(await storage.getService(b.id)).toBeDefined();
  });
});

// Integration test: drives the real Postgres transaction in
// DatabaseStorage.deleteService against the live test database. Verifies the
// exact bug class that broke production for Task #155 — service_bundle_discounts
// rows being cleaned up so the parent service can be deleted without an FK 500.
describe("DatabaseStorage.deleteService – bundle discount cascade (DB)", () => {
  const dbStorage = new DatabaseStorage();
  const createdServiceIds: number[] = [];
  const tag = `task155-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  async function insertService(name: string): Promise<number> {
    const [row] = await db
      .insert(services)
      .values({
        name: `${tag}-${name}`,
        description: `regression fixture ${tag}`,
        imageUrl: "/x.jpg",
        price: 100,
        pricingType: "flat",
        classification: "Revenue Generation",
        features: [],
      } as unknown as typeof services.$inferInsert)
      .returning({ id: services.id });
    createdServiceIds.push(row.id);
    return row.id;
  }

  afterAll(async () => {
    if (createdServiceIds.length > 0) {
      await db
        .delete(serviceBundleDiscounts)
        .where(
          or(
            inArray(serviceBundleDiscounts.primaryServiceId, createdServiceIds),
            inArray(serviceBundleDiscounts.secondaryServiceId, createdServiceIds),
          ),
        );
      await db.delete(bookings).where(inArray(bookings.serviceId, createdServiceIds));
      await db.delete(services).where(inArray(services.id, createdServiceIds));
    }
  });

  it("deletes a service that owns bundle discount rows on both primary and secondary sides", async () => {
    const target = await insertService("primary-target");
    const partnerA = await insertService("partner-a");
    const partnerB = await insertService("partner-b");

    // target appears as primary in one row
    await db.insert(serviceBundleDiscounts).values({
      primaryServiceId: target,
      secondaryServiceId: partnerA,
      discountPercentage: 10,
    });
    // target appears as secondary in another row
    await db.insert(serviceBundleDiscounts).values({
      primaryServiceId: partnerB,
      secondaryServiceId: target,
      discountPercentage: 15,
    });

    // Sanity: rows exist
    const before = await db
      .select()
      .from(serviceBundleDiscounts)
      .where(
        or(
          eq(serviceBundleDiscounts.primaryServiceId, target),
          eq(serviceBundleDiscounts.secondaryServiceId, target),
        ),
      );
    expect(before).toHaveLength(2);

    const ok = await dbStorage.deleteService(target);
    expect(ok).toBe(true);

    const survivor = await db.select().from(services).where(eq(services.id, target));
    expect(survivor).toHaveLength(0);

    const after = await db
      .select()
      .from(serviceBundleDiscounts)
      .where(
        or(
          eq(serviceBundleDiscounts.primaryServiceId, target),
          eq(serviceBundleDiscounts.secondaryServiceId, target),
        ),
      );
    expect(after).toHaveLength(0);

    // Partners are untouched
    const partners = await db
      .select()
      .from(services)
      .where(inArray(services.id, [partnerA, partnerB]));
    expect(partners).toHaveLength(2);
  });
});

// HTTP-level coverage for the production DELETE /api/services/:id route.
// These tests boot the real registerRoutes() (so we exercise auth, the
// isAdmin gate, the handler, and the 409 mapping in server/routes.ts) and
// hit the endpoint over an in-process HTTP server. They lock down the bug
// class that broke production for Task #155: an FK violation on
// bookings_service_id_fkey must surface as a 409 with a {message,
// bookingsCount} body — never as a 500.
describe("DELETE /api/services/:id – HTTP route integration", () => {
  let server: Server;
  let baseUrl: string;
  let adminCookie = "";
  const tag = `task157-http-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const adminUsername = `${tag}-admin`;
  const adminEmail = `${tag}-admin@example.com`;
  const adminPassword = "admin-pw-test-only";
  let adminUserId = 0;
  const createdServiceIds: number[] = [];
  const createdBookingIds: number[] = [];

  async function insertService(name: string): Promise<number> {
    const [row] = await db
      .insert(services)
      .values({
        name: `${tag}-${name}`,
        description: `regression fixture ${tag}`,
        imageUrl: "/x.jpg",
        price: 100,
        pricingType: "flat",
        classification: "Revenue Generation",
        features: [],
      } as unknown as typeof services.$inferInsert)
      .returning({ id: services.id });
    createdServiceIds.push(row.id);
    return row.id;
  }

  async function insertBooking(serviceId: number): Promise<number> {
    const [row] = await db
      .insert(bookings)
      .values({
        userId: adminUserId,
        serviceId,
        customerName: `${tag}-cust`,
        customerEmail: `${tag}-cust@example.com`,
        status: "pending",
      } as unknown as typeof bookings.$inferInsert)
      .returning({ id: bookings.id });
    createdBookingIds.push(row.id);
    return row.id;
  }

  beforeAll(async () => {
    // Create a dedicated admin user for this suite. The route under test is
    // gated by isAdmin, so we must authenticate as one.
    const [adminRow] = await db
      .insert(users)
      .values({
        username: adminUsername,
        password: await hashPassword(adminPassword),
        email: adminEmail,
        firstName: "Task157",
        lastName: "Admin",
        isAdmin: true,
      } as unknown as typeof users.$inferInsert)
      .returning({ id: users.id });
    adminUserId = adminRow.id;

    const app: Express = express();
    app.use(express.json());
    server = await registerRoutes(app);
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const addr = server.address();
    if (!addr || typeof addr === "string") throw new Error("listen failed");
    baseUrl = `http://127.0.0.1:${addr.port}`;

    // Log in once and reuse the session cookie across all DELETE calls.
    const loginRes = await fetch(`${baseUrl}/api/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: adminUsername, password: adminPassword }),
    });
    expect(loginRes.status).toBe(200);
    const setCookie = loginRes.headers.get("set-cookie");
    if (!setCookie) throw new Error("login did not return a session cookie");
    // Strip attributes — we only need the name=value pair for the next request.
    adminCookie = setCookie.split(";")[0];
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    if (createdBookingIds.length) {
      await db.delete(bookings).where(inArray(bookings.id, createdBookingIds));
    }
    if (createdServiceIds.length) {
      await db
        .delete(serviceBundleDiscounts)
        .where(
          or(
            inArray(serviceBundleDiscounts.primaryServiceId, createdServiceIds),
            inArray(serviceBundleDiscounts.secondaryServiceId, createdServiceIds),
          ),
        );
      await db.delete(bookings).where(inArray(bookings.serviceId, createdServiceIds));
      await db.delete(services).where(inArray(services.id, createdServiceIds));
    }
    if (adminUserId) {
      await db.delete(users).where(eq(users.id, adminUserId));
    }
  });

  it("returns 204 when the service has only bundle-discount dependencies (no bookings)", async () => {
    const target = await insertService("204-target");
    const partner = await insertService("204-partner");
    await db.insert(serviceBundleDiscounts).values({
      primaryServiceId: target,
      secondaryServiceId: partner,
      discountPercentage: 10,
    });
    await db.insert(serviceBundleDiscounts).values({
      primaryServiceId: partner,
      secondaryServiceId: target,
      discountPercentage: 5,
    });

    const res = await fetch(`${baseUrl}/api/services/${target}`, {
      method: "DELETE",
      headers: { Cookie: adminCookie },
    });
    expect(res.status).toBe(204);

    const survivor = await db.select().from(services).where(eq(services.id, target));
    expect(survivor).toHaveLength(0);

    // Bundle-discount rows that referenced the deleted service are gone, but
    // the partner service itself is untouched.
    const remainingBundles = await db
      .select()
      .from(serviceBundleDiscounts)
      .where(
        or(
          eq(serviceBundleDiscounts.primaryServiceId, target),
          eq(serviceBundleDiscounts.secondaryServiceId, target),
        ),
      );
    expect(remainingBundles).toHaveLength(0);
    const partnerRow = await db.select().from(services).where(eq(services.id, partner));
    expect(partnerRow).toHaveLength(1);
  });

  it("returns 409 with {message, bookingsCount} when bookings reference the service", async () => {
    const target = await insertService("409-target");
    await insertBooking(target);
    await insertBooking(target);

    const res = await fetch(`${baseUrl}/api/services/${target}`, {
      method: "DELETE",
      headers: { Cookie: adminCookie },
    });
    expect(res.status).toBe(409);
    const body = (await res.json()) as { message: string; bookingsCount: number };
    expect(body.bookingsCount).toBe(2);
    expect(typeof body.message).toBe("string");
    expect(body.message).toMatch(/2 bookings/);

    // Service row was NOT deleted.
    const survivor = await db.select().from(services).where(eq(services.id, target));
    expect(survivor).toHaveLength(1);
  });

  it("returns 409 on the FK-violation race path (booking inserted between count and delete)", async () => {
    const target = await insertService("race-target");
    // Pre-existing booking — in the real race, this row gets committed by
    // another connection AFTER our SELECT count(*) snapshot but BEFORE our
    // DELETE FROM services. Here it's already there for the post-catch
    // recount; we simulate the race by forcing the transaction to throw the
    // exact 23503/bookings_service_id_fkey error a real race would raise.
    await insertBooking(target);

    const fkError: Error & { code?: string; constraint?: string } = new Error(
      'update or delete on table "services" violates foreign key constraint "bookings_service_id_fkey" on table "bookings"',
    );
    fkError.code = "23503";
    fkError.constraint = "bookings_service_id_fkey";

    // The production singleton is a DatabaseStorage; storage.deleteService
    // routes through db.transaction. Force exactly one transaction call to
    // raise the synthetic FK error so the catch handler in
    // DatabaseStorage.deleteService runs its post-recount + 409 translation.
    expect(productionStorage).toBeInstanceOf(DatabaseStorage);
    const txSpy = vi
      .spyOn(db, "transaction")
      .mockImplementationOnce(async () => {
        throw fkError;
      });

    try {
      const res = await fetch(`${baseUrl}/api/services/${target}`, {
        method: "DELETE",
        headers: { Cookie: adminCookie },
      });
      expect(res.status).toBe(409);
      const body = (await res.json()) as { message: string; bookingsCount: number };
      expect(body.bookingsCount).toBe(1);
      expect(typeof body.message).toBe("string");
      expect(body.message).toMatch(/1 booking/);
    } finally {
      txSpy.mockRestore();
    }

    // Service row was NOT deleted (the transaction "failed" and was caught).
    const survivor = await db.select().from(services).where(eq(services.id, target));
    expect(survivor).toHaveLength(1);
  });
});
