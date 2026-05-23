// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import express, { type Express } from "express";
import type { Server } from "http";
import { inArray, eq } from "drizzle-orm";
import { db } from "../db";
import { registerRoutes } from "../routes";
import { heroSlides, users } from "@shared/schema";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);
async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

describe("Hero carousel slides – HTTP route integration", () => {
  let server: Server;
  let baseUrl: string;
  let adminCookie = "";
  const tag = `task179-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const adminUsername = `${tag}-admin`;
  const adminPassword = "admin-pw-test-only";
  let adminUserId = 0;
  const createdSlideIds: number[] = [];

  async function seedSlide(overrides: Partial<typeof heroSlides.$inferInsert> = {}) {
    const [row] = await db
      .insert(heroSlides)
      .values({
        type: "image",
        title: `${tag}-slide`,
        url: `/uploads/${tag}.png`,
        displayOrder: 100,
        isActive: true,
        ...overrides,
      } as typeof heroSlides.$inferInsert)
      .returning();
    createdSlideIds.push(row.id);
    return row;
  }

  beforeAll(async () => {
    const [adminRow] = await db
      .insert(users)
      .values({
        username: adminUsername,
        password: await hashPassword(adminPassword),
        email: `${adminUsername}@example.com`,
        firstName: "Task179",
        lastName: "Admin",
        isAdmin: true,
      } as typeof users.$inferInsert)
      .returning({ id: users.id });
    adminUserId = adminRow.id;

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
    if (createdSlideIds.length) {
      await db.delete(heroSlides).where(inArray(heroSlides.id, createdSlideIds));
    }
    if (adminUserId) {
      await db.delete(users).where(eq(users.id, adminUserId));
    }
  });

  it("GET /api/hero-slides returns only active slides ordered by displayOrder", async () => {
    const a = await seedSlide({ title: `${tag}-a`, displayOrder: 30, isActive: true });
    const b = await seedSlide({ title: `${tag}-b`, displayOrder: 10, isActive: true });
    const c = await seedSlide({ title: `${tag}-c`, displayOrder: 20, isActive: false });

    const res = await fetch(`${baseUrl}/api/hero-slides`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as Array<{ id: number; displayOrder: number; isActive: boolean }>;
    const seeded = body.filter((s) => [a.id, b.id, c.id].includes(s.id));
    // Inactive slide must NOT appear in the public response.
    expect(seeded.find((s) => s.id === c.id)).toBeUndefined();
    // Returned order respects displayOrder (b=10 before a=30).
    const orderedIds = seeded.map((s) => s.id);
    expect(orderedIds.indexOf(b.id)).toBeLessThan(orderedIds.indexOf(a.id));
    // Every returned slide is active.
    expect(seeded.every((s) => s.isActive)).toBe(true);
  });

  it("admin endpoints reject unauthenticated requests (403 from isAdmin gate)", async () => {
    const slide = await seedSlide({ title: `${tag}-auth` });

    const getRes = await fetch(`${baseUrl}/api/admin/hero-slides`);
    expect(getRes.status).toBe(403);

    const postRes = await fetch(`${baseUrl}/api/admin/hero-slides`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "image", title: "x", url: "/x.png" }),
    });
    expect(postRes.status).toBe(403);

    const patchRes = await fetch(`${baseUrl}/api/admin/hero-slides/${slide.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "y" }),
    });
    expect(patchRes.status).toBe(403);

    const reorderRes = await fetch(`${baseUrl}/api/admin/hero-slides/reorder`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: [slide.id] }),
    });
    expect(reorderRes.status).toBe(403);

    const deleteRes = await fetch(`${baseUrl}/api/admin/hero-slides/${slide.id}`, {
      method: "DELETE",
    });
    expect(deleteRes.status).toBe(403);
  });

  it("GET /api/admin/hero-slides returns active and inactive slides for the admin", async () => {
    const active = await seedSlide({ title: `${tag}-admin-active`, isActive: true });
    const inactive = await seedSlide({ title: `${tag}-admin-inactive`, isActive: false });

    const res = await fetch(`${baseUrl}/api/admin/hero-slides`, {
      headers: { Cookie: adminCookie },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as Array<{ id: number }>;
    const ids = body.map((s) => s.id);
    expect(ids).toContain(active.id);
    expect(ids).toContain(inactive.id);
  });

  it("POST /api/admin/hero-slides creates a slide and rejects invalid input with 400", async () => {
    // Valid body persists.
    const validBody = {
      type: "image",
      title: `${tag}-created`,
      url: `/uploads/${tag}-created.png`,
      displayOrder: 50,
      isActive: true,
    };
    const okRes = await fetch(`${baseUrl}/api/admin/hero-slides`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: adminCookie },
      body: JSON.stringify(validBody),
    });
    expect(okRes.status).toBe(201);
    const created = (await okRes.json()) as { id: number; title: string };
    expect(created.title).toBe(validBody.title);
    createdSlideIds.push(created.id);

    // Invalid type → 400.
    const badType = await fetch(`${baseUrl}/api/admin/hero-slides`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: adminCookie },
      body: JSON.stringify({ type: "gif", title: "x", url: "/x.png" }),
    });
    expect(badType.status).toBe(400);

    // Missing title → 400.
    const missingTitle = await fetch(`${baseUrl}/api/admin/hero-slides`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: adminCookie },
      body: JSON.stringify({ type: "image", title: "", url: "/x.png" }),
    });
    expect(missingTitle.status).toBe(400);
  });

  it("PATCH /api/admin/hero-slides/:id updates a slide and validates id + body", async () => {
    const slide = await seedSlide({ title: `${tag}-patch`, isActive: true });

    const okRes = await fetch(`${baseUrl}/api/admin/hero-slides/${slide.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Cookie: adminCookie },
      body: JSON.stringify({ title: `${tag}-patched`, isActive: false }),
    });
    expect(okRes.status).toBe(200);
    const updated = (await okRes.json()) as { title: string; isActive: boolean };
    expect(updated.title).toBe(`${tag}-patched`);
    expect(updated.isActive).toBe(false);

    // Non-numeric id → 400.
    const badId = await fetch(`${baseUrl}/api/admin/hero-slides/not-a-number`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Cookie: adminCookie },
      body: JSON.stringify({ title: "x" }),
    });
    expect(badId.status).toBe(400);

    // Invalid type in body → 400.
    const badBody = await fetch(`${baseUrl}/api/admin/hero-slides/${slide.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Cookie: adminCookie },
      body: JSON.stringify({ type: "audio" }),
    });
    expect(badBody.status).toBe(400);

    // Unknown id → 404.
    const missing = await fetch(`${baseUrl}/api/admin/hero-slides/99999999`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Cookie: adminCookie },
      body: JSON.stringify({ title: "x" }),
    });
    expect(missing.status).toBe(404);
  });

  it("PATCH /api/admin/hero-slides/reorder assigns sequential displayOrder values", async () => {
    const s1 = await seedSlide({ title: `${tag}-r1`, displayOrder: 100 });
    const s2 = await seedSlide({ title: `${tag}-r2`, displayOrder: 100 });
    const s3 = await seedSlide({ title: `${tag}-r3`, displayOrder: 100 });

    const res = await fetch(`${baseUrl}/api/admin/hero-slides/reorder`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Cookie: adminCookie },
      body: JSON.stringify({ ids: [s3.id, s1.id, s2.id] }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as Array<{ id: number; displayOrder: number }>;
    expect(body.map((s) => s.id)).toEqual([s3.id, s1.id, s2.id]);
    expect(body.map((s) => s.displayOrder)).toEqual([1, 2, 3]);

    // Empty ids → 400.
    const empty = await fetch(`${baseUrl}/api/admin/hero-slides/reorder`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Cookie: adminCookie },
      body: JSON.stringify({ ids: [] }),
    });
    expect(empty.status).toBe(400);

    // Duplicate ids → 400.
    const dup = await fetch(`${baseUrl}/api/admin/hero-slides/reorder`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Cookie: adminCookie },
      body: JSON.stringify({ ids: [s1.id, s1.id] }),
    });
    expect(dup.status).toBe(400);

    // Non-positive id → 400.
    const negative = await fetch(`${baseUrl}/api/admin/hero-slides/reorder`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Cookie: adminCookie },
      body: JSON.stringify({ ids: [-1] }),
    });
    expect(negative.status).toBe(400);

    // Unknown id in list → 404.
    const missing = await fetch(`${baseUrl}/api/admin/hero-slides/reorder`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Cookie: adminCookie },
      body: JSON.stringify({ ids: [99999999] }),
    });
    expect(missing.status).toBe(404);
  });

  it("DELETE /api/admin/hero-slides/:id removes a slide and validates id", async () => {
    const slide = await seedSlide({ title: `${tag}-del` });

    const res = await fetch(`${baseUrl}/api/admin/hero-slides/${slide.id}`, {
      method: "DELETE",
      headers: { Cookie: adminCookie },
    });
    expect(res.status).toBe(200);
    const remaining = await db
      .select()
      .from(heroSlides)
      .where(eq(heroSlides.id, slide.id));
    expect(remaining).toHaveLength(0);

    // Second delete on the same id → 404.
    const second = await fetch(`${baseUrl}/api/admin/hero-slides/${slide.id}`, {
      method: "DELETE",
      headers: { Cookie: adminCookie },
    });
    expect(second.status).toBe(404);

    // Non-numeric id → 400.
    const bad = await fetch(`${baseUrl}/api/admin/hero-slides/abc`, {
      method: "DELETE",
      headers: { Cookie: adminCookie },
    });
    expect(bad.status).toBe(400);
  });
});
