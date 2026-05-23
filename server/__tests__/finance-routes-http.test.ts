// @vitest-environment node
//
// Run this suite under the node environment so we can `import "../routes"`
// without tripping the OpenAI client's "browser-like environment" guard
// (jsdom would set globalThis.window which makes openai throw on
// instantiation in server/ai/openai-service.ts).
//
// This test mounts the *real* registerRoutes(app) so the booking,
// income, expense, and quote handlers in server/routes.ts and
// server/quote-routes.ts are exercised end-to-end against a real
// Postgres test DB.

import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import express, { type Express, type Request, type Response, type NextFunction } from "express";
import { type Server } from "http";
import { eq, inArray } from "drizzle-orm";
import { db } from "../db";
import { storage } from "../storage";
import {
  bookings,
  income,
  expenses,
  services,
  users,
  quotes,
  type Booking,
} from "@shared/schema";

// Drizzle insert types — used by every fixture builder below so we
// avoid `as any` casts on `.values(...)` calls.
type InsertUserRow = typeof users.$inferInsert;
type InsertServiceRow = typeof services.$inferInsert;
type InsertBookingRow = typeof bookings.$inferInsert;
type InsertIncomeRow = typeof income.$inferInsert;
type InsertExpenseRow = typeof expenses.$inferInsert;
type InsertQuoteRow = typeof quotes.$inferInsert;
import { registerRoutes } from "../routes";

// Test-only auth shim: a context object the test mutates and a single
// middleware that reads it for every request and stamps req.user. The
// real isAuthenticated/isAdmin guards in server/routes.ts derive their
// truth value from req.user (passport's req.isAuthenticated() returns
// `(req.user) ? true : false`), so this is sufficient to drive the
// admin / owner / stranger code paths through the real handlers.
type TestUser = {
  id: number;
  username: string;
  email: string;
  isAdmin: boolean;
  role?: string;
  clientId?: number | null;
};
// Locally augment the Express Request shape so the fake-auth shim can
// stamp req.user without an `any` cast. Mirrors the real passport
// augmentation in server/auth.ts (which sets Express.User).
interface RequestWithUser extends Request {
  user?: TestUser;
}
const authCtx: { user: TestUser | null } = { user: null };
function fakeAuth(req: RequestWithUser, _res: Response, next: NextFunction) {
  if (authCtx.user) {
    req.user = authCtx.user;
  }
  next();
}

const tag = `task175-http-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const createdServiceIds: number[] = [];
const createdBookingIds: number[] = [];
const createdIncomeIds: number[] = [];
const createdExpenseIds: number[] = [];
const createdQuoteIds: number[] = [];
const createdUserIds: number[] = [];

let server: Server;
let baseUrl: string;
let adminId: number;
let ownerId: number;
let strangerId: number;
let serviceId: number;

async function ensureAdmin(): Promise<number> {
  const adminRows = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.isAdmin, true))
    .limit(1);
  if (adminRows.length > 0) return adminRows[0].id;
  const adminRow: InsertUserRow = {
    username: `${tag}-admin`,
    password: "x",
    email: `${tag}-admin@example.com`,
    isAdmin: true,
  };
  const [created] = await db
    .insert(users)
    .values(adminRow)
    .returning({ id: users.id });
  createdUserIds.push(created.id);
  return created.id;
}

async function makeNonAdmin(suffix: string): Promise<number> {
  const row: InsertUserRow = {
    username: `${tag}-${suffix}`,
    password: "x",
    email: `${tag}-${suffix}@example.com`,
    isAdmin: false,
  };
  const [u] = await db
    .insert(users)
    .values(row)
    .returning({ id: users.id });
  createdUserIds.push(u.id);
  return u.id;
}

async function makeService(): Promise<number> {
  const row: InsertServiceRow = {
    name: `${tag}-svc`,
    description: "fixture",
    imageUrl: "/x.jpg",
    price: 100,
    pricingType: "flat",
    classification: "Revenue Generation",
    features: [],
  };
  const [s] = await db
    .insert(services)
    .values(row)
    .returning({ id: services.id });
  createdServiceIds.push(s.id);
  return s.id;
}

async function makeBooking(opts: {
  userId: number;
  status?: string;
  totalAmount?: string | null;
}): Promise<Booking> {
  const insertRow: InsertBookingRow = {
    userId: opts.userId,
    serviceId,
    customerName: `${tag}-cust`,
    customerEmail: `${tag}@example.com`,
    status: opts.status ?? "pending",
    totalAmount: opts.totalAmount ?? null,
  };
  const [row] = await db
    .insert(bookings)
    .values(insertRow)
    .returning();
  createdBookingIds.push(row.id);
  return row;
}

beforeAll(async () => {
  adminId = await ensureAdmin();
  ownerId = await makeNonAdmin("owner");
  strangerId = await makeNonAdmin("stranger");
  serviceId = await makeService();

  const app: Express = express();
  app.use(express.json());
  // Install fake auth BEFORE registerRoutes runs setupAuth — passport's
  // session strategy is a no-op when there's no session cookie, and
  // passport.initialize() never overwrites a pre-existing req.user.
  app.use(fakeAuth);

  // registerRoutes attaches WebSocket and returns a configured httpServer.
  // populateAnalyticsData() inside it is wrapped in try/catch and is safe
  // to fail in this environment.
  server = await registerRoutes(app);

  await new Promise<void>((resolve) => server.listen(0, resolve));
  const addr = server.address();
  if (!addr || typeof addr === "string") throw new Error("listen failed");
  baseUrl = `http://127.0.0.1:${addr.port}`;
}, 60_000);

afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
  if (createdQuoteIds.length) await db.delete(quotes).where(inArray(quotes.id, createdQuoteIds));
  if (createdIncomeIds.length) await db.delete(income).where(inArray(income.id, createdIncomeIds));
  if (createdBookingIds.length) {
    await db.delete(income).where(inArray(income.bookingId, createdBookingIds));
    await db.delete(bookings).where(inArray(bookings.id, createdBookingIds));
  }
  if (createdExpenseIds.length) await db.delete(expenses).where(inArray(expenses.id, createdExpenseIds));
  if (createdServiceIds.length) await db.delete(services).where(inArray(services.id, createdServiceIds));
  if (createdUserIds.length) await db.delete(users).where(inArray(users.id, createdUserIds));
});

afterEach(() => {
  authCtx.user = null;
});

function actAsAdmin() {
  authCtx.user = { id: adminId, username: "admin", email: "a@a", isAdmin: true };
}
function actAsOwner() {
  authCtx.user = { id: ownerId, username: "owner", email: "o@o", isAdmin: false };
}
function actAsStranger() {
  authCtx.user = { id: strangerId, username: "stranger", email: "s@s", isAdmin: false };
}

// ---------------------------------------------------------------------------
// Bookings
// ---------------------------------------------------------------------------
describe("POST /api/bookings (real handler)", () => {
  it("returns 401 when the request is unauthenticated", async () => {
    const res = await fetch(`${baseUrl}/api/bookings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ serviceId, status: "pending" }),
    });
    expect(res.status).toBe(401);
  });

  it("returns 400 when the body fails Zod validation", async () => {
    actAsOwner();
    const res = await fetch(`${baseUrl}/api/bookings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // serviceId must be a number; passing a non-numeric string forces
      // a Zod failure inside the real handler.
      body: JSON.stringify({ serviceId: "not-a-number", status: "pending" }),
    });
    expect(res.status).toBe(400);
  });

  it("creates a booking for the owner and returns 201 with the new booking row", async () => {
    actAsOwner();
    const res = await fetch(`${baseUrl}/api/bookings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        serviceId,
        customerName: `${tag}-create`,
        customerEmail: `${tag}-create@example.com`,
        status: "pending",
        selectedServices: [serviceId],
        projectName: `${tag}-proj-create`,
      }),
    });
    expect(res.status).toBe(201);
    const body = (await res.json()) as { id: number; userId: number };
    expect(body.id).toBeGreaterThan(0);
    // The route forces userId to the authenticated user's id for non-admins.
    expect(body.userId).toBe(ownerId);
    createdBookingIds.push(body.id);
  });
});

describe("PUT /api/bookings/:id (real handler + syncBookingIncome)", () => {
  it("returns 401 when the request is unauthenticated", async () => {
    const res = await fetch(`${baseUrl}/api/bookings/9999`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "completed" }),
    });
    expect(res.status).toBe(401);
  });

  it("returns 404 for a missing booking id", async () => {
    actAsAdmin();
    const res = await fetch(`${baseUrl}/api/bookings/999999999`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "completed" }),
    });
    expect(res.status).toBe(404);
  });

  it("returns 403 when a non-admin user updates someone else's booking", async () => {
    const booking = await makeBooking({ userId: ownerId, status: "pending" });
    actAsStranger();
    const res = await fetch(`${baseUrl}/api/bookings/${booking.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "completed" }),
    });
    expect(res.status).toBe(403);
  });

  it("returns 400 when the body fails Zod validation", async () => {
    const booking = await makeBooking({ userId: ownerId, status: "pending" });
    actAsAdmin();
    const res = await fetch(`${baseUrl}/api/bookings/${booking.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ serviceId: "not-a-number" }),
    });
    expect(res.status).toBe(400);
  });

  it("admin flipping a booking to 'completed' creates an auto-income row end-to-end", async () => {
    const booking = await makeBooking({
      userId: ownerId,
      status: "pending",
      totalAmount: "499.00",
    });
    actAsAdmin();
    const res = await fetch(`${baseUrl}/api/bookings/${booking.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "completed" }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as Booking;
    expect(body.status).toBe("completed");

    const rows = await db.select().from(income).where(eq(income.bookingId, booking.id));
    expect(rows).toHaveLength(1);
    expect(parseFloat(rows[0].amount as unknown as string)).toBe(499);
    expect(rows[0].description).toContain("Auto-recorded income for completed booking");
  });

  it("non-admin owner update does NOT trigger the auto-income side effect", async () => {
    const booking = await makeBooking({
      userId: ownerId,
      status: "pending",
      totalAmount: "250.00",
    });
    actAsOwner();
    const res = await fetch(`${baseUrl}/api/bookings/${booking.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "completed" }),
    });
    expect(res.status).toBe(200);

    const rows = await db.select().from(income).where(eq(income.bookingId, booking.id));
    expect(rows).toHaveLength(0);
  });
});

describe("DELETE /api/bookings/:id (real handler)", () => {
  it("returns 401 unauthenticated", async () => {
    const res = await fetch(`${baseUrl}/api/bookings/1`, { method: "DELETE" });
    expect(res.status).toBe(401);
  });

  it("returns 404 for a missing booking", async () => {
    actAsAdmin();
    const res = await fetch(`${baseUrl}/api/bookings/999999999`, { method: "DELETE" });
    expect(res.status).toBe(404);
  });

  it("returns 403 when a stranger tries to delete an owner's booking", async () => {
    const booking = await makeBooking({ userId: ownerId });
    actAsStranger();
    const res = await fetch(`${baseUrl}/api/bookings/${booking.id}`, { method: "DELETE" });
    expect(res.status).toBe(403);
  });

  it("returns 204 and removes the booking when the owner deletes a pending booking", async () => {
    const booking = await makeBooking({ userId: ownerId, status: "pending" });
    actAsOwner();
    const res = await fetch(`${baseUrl}/api/bookings/${booking.id}`, { method: "DELETE" });
    expect(res.status).toBe(204);
    expect(await storage.getBooking(booking.id)).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Income
// ---------------------------------------------------------------------------
describe("POST /api/income (real handler)", () => {
  it("returns 401 unauthenticated", async () => {
    const res = await fetch(`${baseUrl}/api/income`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: "10", date: "2026-05-10" }),
    });
    expect(res.status).toBe(401);
  });

  it("returns 400 when required fields are missing", async () => {
    actAsAdmin();
    const res = await fetch(`${baseUrl}/api/income`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);
  });

  it("creates a row for an admin and stamps userId from the session for a non-admin", async () => {
    actAsAdmin();
    const adminRes = await fetch(`${baseUrl}/api/income`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: adminId,
        amount: "150.00",
        date: "2026-05-10",
        description: `${tag}-admin-income`,
      }),
    });
    expect(adminRes.status).toBe(201);
    const adminRow = (await adminRes.json()) as { id: number; userId: number };
    createdIncomeIds.push(adminRow.id);
    expect(adminRow.userId).toBe(adminId);

    actAsOwner();
    const ownerRes = await fetch(`${baseUrl}/api/income`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // Try to spoof userId – the route must overwrite it for non-admins.
      body: JSON.stringify({
        userId: adminId,
        amount: "20.00",
        date: "2026-05-10",
        description: `${tag}-spoofed`,
      }),
    });
    expect(ownerRes.status).toBe(201);
    const ownerRow = (await ownerRes.json()) as { id: number; userId: number };
    createdIncomeIds.push(ownerRow.id);
    expect(ownerRow.userId).toBe(ownerId);
  });
});

describe("PUT/DELETE /api/income/:id (real handler)", () => {
  it("PUT returns 404 for a missing income id", async () => {
    actAsAdmin();
    const res = await fetch(`${baseUrl}/api/income/999999999`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: "50" }),
    });
    expect(res.status).toBe(404);
  });

  it("PUT returns 403 when a stranger tries to update someone else's income", async () => {
    const incomeRow: InsertIncomeRow = { userId: ownerId, amount: "75.00", date: "2026-05-10" };
    const [row] = await db.insert(income).values(incomeRow).returning();
    createdIncomeIds.push(row.id);
    actAsStranger();
    const res = await fetch(`${baseUrl}/api/income/${row.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: "1.00" }),
    });
    expect(res.status).toBe(403);
  });

  it("DELETE returns 204 for the owner and removes the row", async () => {
    const incomeRow: InsertIncomeRow = { userId: ownerId, amount: "33.00", date: "2026-05-10" };
    const [row] = await db.insert(income).values(incomeRow).returning();
    actAsOwner();
    const res = await fetch(`${baseUrl}/api/income/${row.id}`, { method: "DELETE" });
    expect(res.status).toBe(204);
    const after = await db.select().from(income).where(eq(income.id, row.id));
    expect(after).toHaveLength(0);
  });

  it("DELETE returns 404 when the income id does not exist", async () => {
    actAsAdmin();
    const res = await fetch(`${baseUrl}/api/income/999999999`, { method: "DELETE" });
    expect(res.status).toBe(404);
  });
});

// ---------------------------------------------------------------------------
// Expenses
// ---------------------------------------------------------------------------
describe("/api/expenses (real handler)", () => {
  it("POST returns 401 unauthenticated", async () => {
    const res = await fetch(`${baseUrl}/api/expenses`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: "10", date: "2026-05-10" }),
    });
    expect(res.status).toBe(401);
  });

  it("POST creates a row and stamps userId from the session for non-admin", async () => {
    actAsOwner();
    const res = await fetch(`${baseUrl}/api/expenses`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: adminId,
        amount: "12.34",
        date: "2026-05-10",
        description: `${tag}-exp`,
      }),
    });
    expect(res.status).toBe(201);
    const row = (await res.json()) as { id: number; userId: number };
    createdExpenseIds.push(row.id);
    expect(row.userId).toBe(ownerId);
  });

  it("PUT returns 404 for a missing expense id", async () => {
    actAsAdmin();
    const res = await fetch(`${baseUrl}/api/expenses/999999999`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: "1.00" }),
    });
    expect(res.status).toBe(404);
  });

  it("PUT returns 403 when a stranger updates someone else's expense", async () => {
    const expenseRow: InsertExpenseRow = { userId: ownerId, amount: "9.99", date: "2026-05-10" };
    const [row] = await db.insert(expenses).values(expenseRow).returning();
    createdExpenseIds.push(row.id);
    actAsStranger();
    const res = await fetch(`${baseUrl}/api/expenses/${row.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: "0.01" }),
    });
    expect(res.status).toBe(403);
  });

  it("DELETE returns 204 for owner and 404 for nonexistent ids", async () => {
    const expenseRow: InsertExpenseRow = { userId: ownerId, amount: "11.11", date: "2026-05-10" };
    const [row] = await db.insert(expenses).values(expenseRow).returning();
    actAsOwner();
    const ok = await fetch(`${baseUrl}/api/expenses/${row.id}`, { method: "DELETE" });
    expect(ok.status).toBe(204);

    const missing = await fetch(`${baseUrl}/api/expenses/999999999`, { method: "DELETE" });
    expect(missing.status).toBe(404);
  });
});

// ---------------------------------------------------------------------------
// Quotes – served by registerQuoteRoutes (registered inside registerRoutes).
// ---------------------------------------------------------------------------
describe("/api/quotes (real handler)", () => {
  it("POST /api/quotes/generate returns 201 and a valid quoteId (public endpoint, no auth required)", async () => {
    // The /generate handler now falls back to the first admin user as the
    // system owner when no session is present, satisfying the NOT NULL
    // constraint on quotes.user_id.
    const res = await fetch(`${baseUrl}/api/quotes/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientInfo: {
          name: `${tag}-client`,
          email: "c@x.com",
          phone: "555",
          company: "Acme",
          location: "SLC",
          zipCode: "84101",
        },
        projectDetails: {
          projectName: `${tag}-proj`,
          description: "demo",
          timeline: "ASAP",
          rushDelivery: false,
        },
        items: [],
        calculation: { totalPrice: 1234, breakdown: [], zone: "default", currency: "USD" },
        validUntil: new Date(Date.now() + 7 * 86_400_000).toISOString(),
      }),
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(typeof body.quoteId).toBe("number");
    createdQuoteIds.push(body.quoteId);
  });

  it("GET /api/quotes returns 401 unauthenticated", async () => {
    const res = await fetch(`${baseUrl}/api/quotes`);
    expect(res.status).toBe(401);
  });

  it("GET /api/quotes returns 200 + only the caller's quotes for a non-admin", async () => {
    // Note: server/routes.ts registers /api/quotes BEFORE
    // server/quote-routes.ts, so the routes.ts handler wins. That handler
    // returns the user's own quotes (not 403) when the caller isn't admin.
    actAsOwner();
    const res = await fetch(`${baseUrl}/api/quotes`);
    expect(res.status).toBe(200);
    const list = (await res.json()) as Array<{ id: number; userId: number }>;
    expect(Array.isArray(list)).toBe(true);
    // The seeded quote belongs to the admin, so the owner shouldn't see it.
    expect(list.every((q) => q.userId === ownerId)).toBe(true);
  });

  it("GET /api/quotes returns 200 for an admin and includes the seeded quote", async () => {
    actAsAdmin();
    const res = await fetch(`${baseUrl}/api/quotes`);
    expect(res.status).toBe(200);
    const list = (await res.json()) as Array<{ id: number }>;
    expect(Array.isArray(list)).toBe(true);
    if (createdQuoteIds.length > 0) {
      expect(list.some((q) => createdQuoteIds.includes(q.id))).toBe(true);
    }
  });

  it("GET /api/quotes/:id returns 401 unauthenticated", async () => {
    const res = await fetch(`${baseUrl}/api/quotes/999999999`);
    expect(res.status).toBe(401);
  });

  it("GET /api/quotes/:id returns 404 for an unknown id when authenticated", async () => {
    actAsAdmin();
    const res = await fetch(`${baseUrl}/api/quotes/999999999`);
    expect(res.status).toBe(404);
  });

  it("GET /api/quotes/:id returns 403 when a stranger requests someone else's quote", async () => {
    if (createdQuoteIds.length === 0) return;
    actAsStranger();
    const res = await fetch(`${baseUrl}/api/quotes/${createdQuoteIds[0]}`);
    expect(res.status).toBe(403);
  });

  it("GET /api/quotes/:id returns 200 with the row body for an admin", async () => {
    if (createdQuoteIds.length === 0) return;
    actAsAdmin();
    const res = await fetch(`${baseUrl}/api/quotes/${createdQuoteIds[0]}`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { id: number };
    expect(body.id).toBe(createdQuoteIds[0]);
  });

  it("PUT /api/quotes/:id/status returns 401 unauthenticated and 403 for a non-admin", async () => {
    if (createdQuoteIds.length === 0) return;
    const id = createdQuoteIds[0];
    const noAuth = await fetch(`${baseUrl}/api/quotes/${id}/status`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "viewed" }),
    });
    expect(noAuth.status).toBe(401);

    actAsOwner();
    const owner = await fetch(`${baseUrl}/api/quotes/${id}/status`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "viewed" }),
    });
    expect(owner.status).toBe(403);
  });

  it("PUT /api/quotes/:id/status returns 200 and updates status when called by an admin", async () => {
    if (createdQuoteIds.length === 0) return;
    actAsAdmin();
    const res = await fetch(`${baseUrl}/api/quotes/${createdQuoteIds[0]}/status`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "viewed" }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { status: string };
    expect(body.status).toBe("viewed");
  });

  it("POST /api/quotes/:id/accept returns 400 when the quote is not in 'sent' state", async () => {
    if (createdQuoteIds.length === 0) return;
    actAsAdmin();
    await fetch(`${baseUrl}/api/quotes/${createdQuoteIds[0]}/status`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "draft" }),
    });
    authCtx.user = null;
    const res = await fetch(`${baseUrl}/api/quotes/${createdQuoteIds[0]}/accept`, {
      method: "POST",
    });
    expect(res.status).toBe(400);
  });

  it("POST /api/quotes/:id/accept returns 404 for an unknown id", async () => {
    const res = await fetch(`${baseUrl}/api/quotes/999999999/accept`, { method: "POST" });
    expect(res.status).toBe(404);
  });

  it("POST /api/quotes/:id/reject updates status when the quote exists", async () => {
    if (createdQuoteIds.length === 0) return;
    const res = await fetch(`${baseUrl}/api/quotes/${createdQuoteIds[0]}/reject`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: "client passed" }),
    });
    expect(res.status).toBe(200);
  });

  it("POST /api/quotes/:id/reject returns 404 for unknown id", async () => {
    const res = await fetch(`${baseUrl}/api/quotes/999999999/reject`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: "n/a" }),
    });
    expect(res.status).toBe(404);
  });
});
