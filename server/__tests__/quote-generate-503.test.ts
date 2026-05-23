// @vitest-environment node
//
// Unit-level test for the two early-return branches in POST /api/quotes/generate:
//   1. 400 when validUntil is missing or unparseable
//   2. 503 when no admin user exists in the DB (so no system owner can be assigned)
//
// We mock server/db so no real Postgres connection is needed.

import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import express, { type Express } from "express";
import { type Server } from "http";

vi.mock("../db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../db")>();
  return {
    ...actual,
    db: {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      }),
      insert: vi.fn(),
    },
  };
});

vi.mock("../notification-routes", () => ({
  createNotification: vi.fn().mockResolvedValue(undefined),
}));

import { registerQuoteRoutes } from "../quote-routes";

const VALID_BODY = {
  clientInfo: { name: "Test", email: "t@t.com", phone: "555", company: "X", location: "SLC", zipCode: "84101" },
  projectDetails: { projectName: "p", description: "d", timeline: "ASAP", rushDelivery: false },
  items: [],
  calculation: { totalPrice: 100, breakdown: [], zone: "default", currency: "USD" },
  validUntil: new Date(Date.now() + 86_400_000).toISOString(),
};

let server: Server;
let baseUrl: string;

beforeAll(async () => {
  const app: Express = express();
  app.use(express.json());
  registerQuoteRoutes(app);
  await new Promise<void>((resolve) => {
    server = app.listen(0, resolve);
  });
  const addr = server.address();
  if (!addr || typeof addr === "string") throw new Error("listen failed");
  baseUrl = `http://127.0.0.1:${addr.port}`;
});

afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

describe("POST /api/quotes/generate – early-return branches", () => {
  it("returns 400 when validUntil is absent", async () => {
    const { validUntil: _removed, ...bodyWithout } = VALID_BODY;
    const res = await fetch(`${baseUrl}/api/quotes/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(bodyWithout),
    });
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.message).toMatch(/validUntil/i);
  });

  it("returns 400 when validUntil is not a valid date string", async () => {
    const res = await fetch(`${baseUrl}/api/quotes/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...VALID_BODY, validUntil: "not-a-date" }),
    });
    expect(res.status).toBe(400);
  });

  it("returns 503 when no admin user exists in the DB", async () => {
    // The db mock already returns [] for every .select().from().where().limit()
    // call, so the admin lookup returns undefined and the handler returns 503.
    const res = await fetch(`${baseUrl}/api/quotes/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(VALID_BODY),
    });
    expect(res.status).toBe(503);
    const json = await res.json();
    expect(json.message).toMatch(/no system user/i);
  });
});
