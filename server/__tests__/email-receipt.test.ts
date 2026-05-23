// @vitest-environment node
//
// Integration test for POST /api/receipts/:id/email.
//
// The route builds a PDF via generateReceiptPdf, base64-encodes it, and ships
// it to SendGrid as an attachment. This suite mocks @sendgrid/mail so nothing
// is actually sent, then asserts the wiring is correct — right MIME type,
// filename, and PDF magic bytes in the payload.

import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  afterEach,
  vi,
} from "vitest";
import express, {
  type Express,
  type Request,
  type Response,
  type NextFunction,
} from "express";
import { type Server } from "http";
import { eq, inArray } from "drizzle-orm";
import { db } from "../db";
import { bookings, services, users, type Booking } from "@shared/schema";
import { registerRoutes } from "../routes";

// ---------------------------------------------------------------------------
// SendGrid mock
// ---------------------------------------------------------------------------
// vi.mock hoists this so the dynamic `await import("@sendgrid/mail")` inside
// the route handler also receives the mock.

const mockSend = vi.fn().mockResolvedValue([{ statusCode: 202 }, {}]);
const mockSetApiKey = vi.fn();

vi.mock("@sendgrid/mail", () => ({
  default: {
    setApiKey: mockSetApiKey,
    send: mockSend,
  },
}));

// ---------------------------------------------------------------------------
// Auth shim (same pattern used by finance-routes-http.test.ts)
// ---------------------------------------------------------------------------
type TestUser = {
  id: number;
  username: string;
  email: string;
  isAdmin: boolean;
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

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------
type InsertUserRow = typeof users.$inferInsert;
type InsertServiceRow = typeof services.$inferInsert;
type InsertBookingRow = typeof bookings.$inferInsert;

const tag = `task195-email-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const createdUserIds: number[] = [];
const createdServiceIds: number[] = [];
const createdBookingIds: number[] = [];

let server: Server;
let baseUrl: string;
let adminId: number;
let serviceId: number;
let bookingId: number;

// Capture the original value so every afterEach can restore it cleanly,
// regardless of whether an individual test sets or deletes the variable.
const originalSendgridKey = process.env.SENDGRID_API_KEY;

async function ensureAdmin(): Promise<number> {
  const rows = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.isAdmin, true))
    .limit(1);
  if (rows.length > 0) return rows[0].id;
  const row: InsertUserRow = {
    username: `${tag}-admin`,
    password: "x",
    email: `${tag}-admin@example.com`,
    isAdmin: true,
  };
  const [created] = await db.insert(users).values(row).returning({ id: users.id });
  createdUserIds.push(created.id);
  return created.id;
}

async function makeService(): Promise<number> {
  const row: InsertServiceRow = {
    name: `${tag}-svc`,
    description: "Aerial survey fixture",
    imageUrl: "/x.jpg",
    price: 49900,
    pricingType: "flat",
    classification: "Revenue Generation",
    features: [],
  };
  const [s] = await db.insert(services).values(row).returning({ id: services.id });
  createdServiceIds.push(s.id);
  return s.id;
}

async function makeBooking(userId: number, svcId: number): Promise<Booking> {
  const row: InsertBookingRow = {
    userId,
    serviceId: svcId,
    customerName: `${tag}-customer`,
    customerEmail: `${tag}@example.com`,
    status: "pending",
    totalAmount: "499.00",
    selectedServices: [svcId],
  };
  const [b] = await db.insert(bookings).values(row).returning();
  createdBookingIds.push(b.id);
  return b;
}

beforeAll(async () => {
  adminId = await ensureAdmin();
  serviceId = await makeService();
  const booking = await makeBooking(adminId, serviceId);
  bookingId = booking.id;

  const app: Express = express();
  app.use(express.json());
  app.use(fakeAuth);
  server = await registerRoutes(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const addr = server.address();
  if (!addr || typeof addr === "string") throw new Error("listen failed");
  baseUrl = `http://127.0.0.1:${addr.port}`;
}, 60_000);

afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
  if (createdBookingIds.length)
    await db.delete(bookings).where(inArray(bookings.id, createdBookingIds));
  if (createdServiceIds.length)
    await db.delete(services).where(inArray(services.id, createdServiceIds));
  if (createdUserIds.length)
    await db.delete(users).where(inArray(users.id, createdUserIds));
});

afterEach(() => {
  authCtx.user = null;
  mockSend.mockClear();
  mockSetApiKey.mockClear();
  // Restore the env var so tests that delete or override it don't leak state
  // into subsequent tests in this file (or other suites in the same worker).
  if (originalSendgridKey !== undefined) {
    process.env.SENDGRID_API_KEY = originalSendgridKey;
  } else {
    delete process.env.SENDGRID_API_KEY;
  }
});

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------
function actAsAdmin() {
  authCtx.user = {
    id: adminId,
    username: "admin",
    email: "admin@test.com",
    isAdmin: true,
  };
}

const PDF_MAGIC = "%PDF";

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("POST /api/receipts/:id/email", () => {
  it("returns 503 with a descriptive message when SENDGRID_API_KEY is not set", async () => {
    // The route returns 503 (Service Unavailable) rather than a 4xx because
    // a missing API key is a server-side configuration gap, not a client
    // mistake. afterEach restores the env var after this test.
    actAsAdmin();
    delete process.env.SENDGRID_API_KEY;

    const res = await fetch(`${baseUrl}/api/receipts/${bookingId}/email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "test@example.com", customerName: "Test User" }),
    });

    expect(res.status).toBe(503);
    const body = await res.json() as { message: string };
    expect(body.message).toMatch(/sendgrid/i);
    expect(mockSend).not.toHaveBeenCalled();
  });

  it("calls SendGrid with exactly one PDF attachment containing valid PDF bytes", async () => {
    actAsAdmin();
    process.env.SENDGRID_API_KEY = "SG.test-key-for-mock";

    const res = await fetch(`${baseUrl}/api/receipts/${bookingId}/email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "customer@example.com",
        customerName: "Jane Roe",
      }),
    });

    expect(res.status).toBe(200);
    const body = await res.json() as { message: string };
    expect(body.message).toMatch(/success/i);

    // SendGrid send() must have been called exactly once
    expect(mockSend).toHaveBeenCalledOnce();

    const payload = mockSend.mock.calls[0][0] as {
      attachments: Array<{
        content: string;
        filename: string;
        type: string;
        disposition: string;
      }>;
    };

    // Exactly one attachment
    expect(payload.attachments).toHaveLength(1);

    const attachment = payload.attachments[0];

    // Correct MIME type
    expect(attachment.type).toBe("application/pdf");

    // Filename must end with .pdf
    expect(attachment.filename).toMatch(/\.pdf$/i);

    // Content must be non-empty base64
    expect(attachment.content.length).toBeGreaterThan(0);
    expect(attachment.content).toMatch(/^[A-Za-z0-9+/]+=*$/);

    // Decoded bytes must start with the PDF magic header
    const decoded = Buffer.from(attachment.content, "base64");
    expect(decoded.subarray(0, 4).toString("utf8")).toBe(PDF_MAGIC);
  });

  it("returns 400 when the email address is missing or invalid", async () => {
    actAsAdmin();
    process.env.SENDGRID_API_KEY = "SG.test-key-for-mock";

    const res = await fetch(`${baseUrl}/api/receipts/${bookingId}/email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "not-an-email" }),
    });

    expect(res.status).toBe(400);
    expect(mockSend).not.toHaveBeenCalled();
  });

  it("returns 404 when the booking does not exist", async () => {
    actAsAdmin();
    process.env.SENDGRID_API_KEY = "SG.test-key-for-mock";

    const res = await fetch(`${baseUrl}/api/receipts/999999999/email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "customer@example.com" }),
    });

    expect(res.status).toBe(404);
    expect(mockSend).not.toHaveBeenCalled();
  });

  it("returns 401 when the request is unauthenticated", async () => {
    const res = await fetch(`${baseUrl}/api/receipts/${bookingId}/email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "customer@example.com" }),
    });

    expect(res.status).toBe(401);
    expect(mockSend).not.toHaveBeenCalled();
  });
});
