// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import express, { type Express } from "express";
import type { Server } from "http";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { registerRoutes } from "../routes";
import { services, users } from "@shared/schema";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);
async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

describe("PATCH /api/services/:id – featuredBadge round-trip", () => {
  let server: Server;
  let baseUrl: string;
  let adminCookie = "";
  let adminUserId = 0;
  let serviceId = 0;

  const tag = `task215-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const adminUsername = `${tag}-admin`;
  const adminEmail = `${tag}-admin@example.com`;
  const adminPassword = "pw-task215-test-only";

  beforeAll(async () => {
    const [adminRow] = await db
      .insert(users)
      .values({
        username: adminUsername,
        password: await hashPassword(adminPassword),
        email: adminEmail,
        firstName: "Badge",
        lastName: "Admin",
        isAdmin: true,
      } as unknown as typeof users.$inferInsert)
      .returning({ id: users.id });
    adminUserId = adminRow.id;

    const [svcRow] = await db
      .insert(services)
      .values({
        name: `${tag}-badge-svc`,
        description: "badge test fixture",
        imageUrl: "/img/badge-test.jpg",
        price: 10000,
        pricingType: "flat",
        classification: "Revenue Generation",
        features: [],
        featuredBadge: false,
      } as unknown as typeof services.$inferInsert)
      .returning({ id: services.id });
    serviceId = svcRow.id;

    const app: Express = express();
    app.use(express.json());
    server = await registerRoutes(app);
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const addr = server.address();
    if (!addr || typeof addr === "string") throw new Error("listen failed");
    baseUrl = `http://127.0.0.1:${addr.port}`;

    const loginRes = await fetch(`${baseUrl}/api/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: adminUsername, password: adminPassword }),
    });
    expect(loginRes.status).toBe(200);
    const setCookie = loginRes.headers.get("set-cookie");
    if (!setCookie) throw new Error("login did not return a session cookie");
    adminCookie = setCookie.split(";")[0];
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    if (serviceId) {
      await db.delete(services).where(eq(services.id, serviceId));
    }
    if (adminUserId) {
      await db.delete(users).where(eq(users.id, adminUserId));
    }
  });

  it("PATCH { featuredBadge: true } persists and GET /api/services reflects it", async () => {
    const patchRes = await fetch(`${baseUrl}/api/services/${serviceId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Cookie: adminCookie },
      body: JSON.stringify({ featuredBadge: true }),
    });
    expect(patchRes.status).toBe(200);
    const patched = (await patchRes.json()) as { featuredBadge: boolean };
    expect(patched.featuredBadge).toBe(true);

    const listRes = await fetch(`${baseUrl}/api/services`);
    expect(listRes.status).toBe(200);
    const list = (await listRes.json()) as Array<{ id: number; featuredBadge: boolean }>;
    const found = list.find((s) => s.id === serviceId);
    expect(found).toBeDefined();
    expect(found!.featuredBadge).toBe(true);
  });

  it("PATCH { featuredBadge: false } clears the flag and GET /api/services reflects it", async () => {
    const patchRes = await fetch(`${baseUrl}/api/services/${serviceId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Cookie: adminCookie },
      body: JSON.stringify({ featuredBadge: false }),
    });
    expect(patchRes.status).toBe(200);
    const patched = (await patchRes.json()) as { featuredBadge: boolean };
    expect(patched.featuredBadge).toBe(false);

    const listRes = await fetch(`${baseUrl}/api/services`);
    expect(listRes.status).toBe(200);
    const list = (await listRes.json()) as Array<{ id: number; featuredBadge: boolean }>;
    const found = list.find((s) => s.id === serviceId);
    expect(found).toBeDefined();
    expect(found!.featuredBadge).toBe(false);
  });

  it("PATCH without auth returns 403", async () => {
    const res = await fetch(`${baseUrl}/api/services/${serviceId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ featuredBadge: true }),
    });
    expect(res.status).toBe(403);
  });
});
