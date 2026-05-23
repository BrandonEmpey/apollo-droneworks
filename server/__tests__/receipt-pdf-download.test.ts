// @vitest-environment node
//
// Integration tests for GET /api/receipts/:id/pdf
//
// The route enforces three auth rules:
//   - Unauthenticated callers   → 401
//   - Authenticated non-owner   → 403
//   - Booking owner / any admin → 200  application/pdf  APLDW-XXXXXX.pdf
//
// A 404 is returned when the booking id does not exist.
//
// This suite mounts the real registerRoutes(app) against the live test
// Postgres DB, using the same fake-auth shim pattern established by
// server/__tests__/finance-routes-http.test.ts.

import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import express, { type Express, type Request, type Response, type NextFunction } from "express";
import { type Server } from "http";
import { inArray } from "drizzle-orm";
import { db } from "../db";
import { bookings, services, users, type Booking } from "@shared/schema";
import { registerRoutes } from "../routes";

type InsertUserRow = typeof users.$inferInsert;
type InsertServiceRow = typeof services.$inferInsert;
type InsertBookingRow = typeof bookings.$inferInsert;

type TestUser = {
  id: number;
  username: string;
  email: string;
  isAdmin: boolean;
  role?: string;
  clientId?: number | null;
};

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

const tag = `task197-pdf-dl-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const createdUserIds: number[] = [];
const createdServiceIds: number[] = [];
const createdBookingIds: number[] = [];

let server: Server;
let baseUrl: string;
let adminId: number;
let ownerId: number;
let strangerId: number;
let serviceId: number;
let ownerBooking: Booking;

async function insertUser(suffix: string, isAdmin = false): Promise<number> {
  const row: InsertUserRow = {
    username: `${tag}-${suffix}`,
    password: "x",
    email: `${tag}-${suffix}@example.com`,
    isAdmin,
  };
  const [u] = await db.insert(users).values(row).returning({ id: users.id });
  createdUserIds.push(u.id);
  return u.id;
}

async function insertService(): Promise<number> {
  const row: InsertServiceRow = {
    name: `${tag}-svc`,
    description: "fixture service for receipt PDF tests",
    imageUrl: "/placeholder.jpg",
    price: 25000,
    pricingType: "flat",
    classification: "Revenue Generation",
    features: [],
  };
  const [s] = await db.insert(services).values(row).returning({ id: services.id });
  createdServiceIds.push(s.id);
  return s.id;
}

async function insertBooking(userId: number): Promise<Booking> {
  const row: InsertBookingRow = {
    userId,
    serviceId,
    selectedServices: [serviceId],
    customerName: `${tag}-customer`,
    customerEmail: `${tag}@example.com`,
    status: "completed",
    paymentStatus: "paid",
    totalAmount: "250.00",
    projectName: `${tag}-project`,
  };
  const [b] = await db.insert(bookings).values(row).returning();
  createdBookingIds.push(b.id);
  return b;
}

beforeAll(async () => {
  adminId = await insertUser("admin", true);
  ownerId = await insertUser("owner", false);
  strangerId = await insertUser("stranger", false);
  serviceId = await insertService();
  ownerBooking = await insertBooking(ownerId);

  const app: Express = express();
  app.use(express.json());
  app.use(fakeAuth);

  server = await registerRoutes(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));

  const addr = server.address();
  if (!addr || typeof addr === "string") throw new Error("Server listen failed");
  baseUrl = `http://127.0.0.1:${addr.port}`;
}, 60_000);

afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
  if (createdBookingIds.length) {
    await db.delete(bookings).where(inArray(bookings.id, createdBookingIds));
  }
  if (createdServiceIds.length) {
    await db.delete(services).where(inArray(services.id, createdServiceIds));
  }
  if (createdUserIds.length) {
    await db.delete(users).where(inArray(users.id, createdUserIds));
  }
});

afterEach(() => {
  authCtx.user = null;
});

function actAs(user: TestUser) {
  authCtx.user = user;
}

// ---------------------------------------------------------------------------
// GET /api/receipts/:id/pdf
// ---------------------------------------------------------------------------
describe("GET /api/receipts/:id/pdf", () => {
  it("returns 401 when the request is unauthenticated", async () => {
    const res = await fetch(`${baseUrl}/api/receipts/${ownerBooking.id}/pdf`);
    expect(res.status).toBe(401);
  });

  it("returns 403 when a non-admin user tries to download another user's receipt", async () => {
    actAs({ id: strangerId, username: "stranger", email: "s@s", isAdmin: false });
    const res = await fetch(`${baseUrl}/api/receipts/${ownerBooking.id}/pdf`);
    expect(res.status).toBe(403);
  });

  it("returns 404 when the booking id does not exist", async () => {
    actAs({ id: ownerId, username: "owner", email: "o@o", isAdmin: false });
    const res = await fetch(`${baseUrl}/api/receipts/999999999/pdf`);
    expect(res.status).toBe(404);
  });

  it("returns 200 with application/pdf and correct filename for the booking owner", async () => {
    actAs({ id: ownerId, username: "owner", email: "o@o", isAdmin: false });
    const res = await fetch(`${baseUrl}/api/receipts/${ownerBooking.id}/pdf`);

    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("application/pdf");

    const expectedFilename = `APLDW-${String(ownerBooking.id).padStart(6, "0")}.pdf`;
    const disposition = res.headers.get("content-disposition") ?? "";
    expect(disposition).toContain(expectedFilename);

    const buf = await res.arrayBuffer();
    const bytes = new Uint8Array(buf);
    expect(bytes.length).toBeGreaterThan(500);
    const magic = String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3]);
    expect(magic).toBe("%PDF");
  });

  it("returns 200 with application/pdf and correct filename when an admin downloads any booking's receipt", async () => {
    actAs({ id: adminId, username: "admin", email: "a@a", isAdmin: true });
    const res = await fetch(`${baseUrl}/api/receipts/${ownerBooking.id}/pdf`);

    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("application/pdf");

    const expectedFilename = `APLDW-${String(ownerBooking.id).padStart(6, "0")}.pdf`;
    const disposition = res.headers.get("content-disposition") ?? "";
    expect(disposition).toContain(expectedFilename);

    const buf = await res.arrayBuffer();
    const bytes = new Uint8Array(buf);
    expect(bytes.length).toBeGreaterThan(500);
    const magic = String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3]);
    expect(magic).toBe("%PDF");
  });
});
