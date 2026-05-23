import { describe, it, expect, afterEach, beforeAll } from "vitest";
import { eq, inArray } from "drizzle-orm";
import { db } from "../db";
import {
  bookings,
  income,
  services,
  users,
  type Booking,
} from "@shared/schema";
import { syncBookingIncome } from "../booking-finance-sync";

// The auto-income side effect that fires when an admin marks a booking as
// "completed" lives in server/booking-finance-sync.ts and is invoked from
// PUT /api/bookings/:id in server/routes.ts. Before this test, that file
// (and the entire side-effect path on the booking update route) had zero
// coverage. These tests drive it end-to-end against the real Postgres test
// database so we exercise every branch: insert-on-completion, no-op when
// totalAmount is zero/missing, idempotency when an income row already
// exists, and the cleanup-on-uncomplete branch that preserves manual
// income rows.
describe("syncBookingIncome – auto income side-effects", () => {
  const tag = `task130-sync-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const createdServiceIds: number[] = [];
  const createdBookingIds: number[] = [];

  async function ensureAdmin(): Promise<number> {
    const adminRows = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.isAdmin, true))
      .limit(1);
    if (adminRows.length === 0) {
      throw new Error(
        "Test DB has no admin user; booking-finance-sync requires one for income attribution.",
      );
    }
    return adminRows[0].id;
  }

  async function makeService(): Promise<number> {
    const [row] = await db
      .insert(services)
      .values({
        name: `${tag}-svc`,
        description: "fixture",
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

  async function makeBooking(opts: {
    serviceId: number;
    status?: string;
    totalAmount?: string | null;
    customerName?: string;
  }): Promise<Booking> {
    const adminId = await ensureAdmin();
    const [row] = await db
      .insert(bookings)
      .values({
        userId: adminId,
        serviceId: opts.serviceId,
        customerName: opts.customerName ?? `${tag}-cust`,
        customerEmail: `${tag}@example.com`,
        status: opts.status ?? "pending",
        totalAmount: (opts.totalAmount ?? null) as unknown as string,
      } as unknown as typeof bookings.$inferInsert)
      .returning();
    createdBookingIds.push(row.id);
    return row;
  }

  beforeAll(async () => {
    // Sanity: we need an admin row so getAdminUserId doesn't throw.
    await ensureAdmin();
  });

  afterEach(async () => {
    if (createdBookingIds.length > 0) {
      await db.delete(income).where(inArray(income.bookingId, createdBookingIds));
      await db.delete(bookings).where(inArray(bookings.id, createdBookingIds));
      createdBookingIds.length = 0;
    }
    if (createdServiceIds.length > 0) {
      await db.delete(services).where(inArray(services.id, createdServiceIds));
      createdServiceIds.length = 0;
    }
  });

  it("inserts an income row when a booking transitions pending → completed with a positive total", async () => {
    const svc = await makeService();
    const booking = await makeBooking({ serviceId: svc, status: "completed", totalAmount: "499.00" });

    await syncBookingIncome("pending", booking);

    const rows = await db.select().from(income).where(eq(income.bookingId, booking.id));
    expect(rows).toHaveLength(1);
    expect(parseFloat(rows[0].amount as unknown as string)).toBe(499);
    expect(rows[0].category).toBe("service");
    expect(rows[0].status).toBe("received");
    expect(rows[0].description).toContain("Auto-recorded income for completed booking");
  });

  it("is idempotent: running again on an already-synced booking does not insert a duplicate", async () => {
    const svc = await makeService();
    const booking = await makeBooking({ serviceId: svc, status: "completed", totalAmount: "200.00" });

    await syncBookingIncome("pending", booking);
    await syncBookingIncome("pending", booking);
    await syncBookingIncome("pending", booking);

    const rows = await db.select().from(income).where(eq(income.bookingId, booking.id));
    expect(rows).toHaveLength(1);
  });

  it("does nothing when a completed booking has no positive total amount", async () => {
    const svc = await makeService();
    const zero = await makeBooking({ serviceId: svc, status: "completed", totalAmount: "0" });
    const missing = await makeBooking({ serviceId: svc, status: "completed", totalAmount: null });

    await syncBookingIncome("pending", zero);
    await syncBookingIncome("pending", missing);

    const rowsZero = await db.select().from(income).where(eq(income.bookingId, zero.id));
    const rowsMissing = await db.select().from(income).where(eq(income.bookingId, missing.id));
    expect(rowsZero).toHaveLength(0);
    expect(rowsMissing).toHaveLength(0);
  });

  it("removes auto-generated income but preserves manual income when a booking transitions out of completed", async () => {
    const svc = await makeService();
    const booking = await makeBooking({ serviceId: svc, status: "completed", totalAmount: "150.00" });
    const adminId = await ensureAdmin();

    // Auto-generate the income row first.
    await syncBookingIncome("pending", booking);
    let rows = await db.select().from(income).where(eq(income.bookingId, booking.id));
    expect(rows).toHaveLength(1);

    // Insert a manually-tagged income row that does NOT match the
    // auto-generated description prefix; it must survive.
    await db.insert(income).values({
      userId: adminId,
      amount: "25.00",
      description: "Manual top-up",
      client: booking.customerName,
      date: new Date().toISOString().split("T")[0],
      paymentMethod: null,
      bookingId: booking.id,
      category: "service",
      status: "received",
    } as unknown as typeof income.$inferInsert);

    // Now flip the booking back to pending and re-sync.
    const reverted: Booking = { ...booking, status: "pending" };
    await syncBookingIncome("completed", reverted);

    rows = await db.select().from(income).where(eq(income.bookingId, booking.id));
    expect(rows).toHaveLength(1);
    expect(rows[0].description).toBe("Manual top-up");
  });

  it("is a no-op when the status did not transition into or out of 'completed'", async () => {
    const svc = await makeService();
    const booking = await makeBooking({ serviceId: svc, status: "in_progress", totalAmount: "300.00" });

    // pending -> in_progress: neither side completed, must not insert.
    await syncBookingIncome("pending", booking);

    const rows = await db.select().from(income).where(eq(income.bookingId, booking.id));
    expect(rows).toHaveLength(0);
  });
});
