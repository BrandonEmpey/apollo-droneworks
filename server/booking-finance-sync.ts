import { db } from "./db";
import { bookings, income, expenses, expenseCategories, users } from "@shared/schema";
import { and, eq, like } from "drizzle-orm";
import type { Booking } from "@shared/schema";

const AUTO_INCOME_DESCRIPTION_PREFIX = "Auto-recorded income for completed booking";

let cachedAdminId: number | null = null;

async function getAdminUserId(): Promise<number> {
  if (cachedAdminId) return cachedAdminId;
  const adminRows = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.isAdmin, true))
    .limit(1);
  if (adminRows.length === 0) {
    throw new Error("No admin user found for income attribution");
  }
  cachedAdminId = adminRows[0].id;
  return cachedAdminId;
}

function pickIncomeDate(booking: Booking): string {
  const candidate =
    booking.completedAt || booking.scheduledDate || booking.date || new Date();
  const d = candidate instanceof Date ? candidate : new Date(candidate);
  return d.toISOString().split("T")[0];
}

function buildAutoDescription(booking: Booking): string {
  return booking.projectName
    ? `${AUTO_INCOME_DESCRIPTION_PREFIX}: ${booking.projectName}`
    : `${AUTO_INCOME_DESCRIPTION_PREFIX} #${booking.id}`;
}

/**
 * Idempotently keep the income table in sync with a booking's status.
 * - When status transitions into "completed" (and totalAmount > 0), insert a
 *   single income row referencing this booking (skipped if one already exists).
 * - When status transitions out of "completed", remove auto-generated income
 *   rows for that booking.
 */
export async function syncBookingIncome(
  prevStatus: string | null | undefined,
  booking: Booking,
): Promise<void> {
  const wasCompleted = prevStatus === "completed";
  const isCompleted = booking.status === "completed";

  if (!wasCompleted && isCompleted) {
    const amountStr = booking.totalAmount?.toString() ?? "0";
    const amountNum = parseFloat(amountStr);
    if (!Number.isFinite(amountNum) || amountNum <= 0) return;

    const existing = await db
      .select({ id: income.id })
      .from(income)
      .where(eq(income.bookingId, booking.id));
    if (existing.length > 0) return;

    const adminId = await getAdminUserId();

    await db.insert(income).values({
      userId: adminId,
      amount: amountStr,
      description: buildAutoDescription(booking),
      client: booking.customerName ?? null,
      date: pickIncomeDate(booking),
      paymentMethod: null,
      bookingId: booking.id,
      projectId: booking.projectId ?? null,
      category: "service",
      status: "received",
    });
  } else if (wasCompleted && !isCompleted) {
    // Only remove auto-generated income rows; preserve any manual entries
    // an admin may have linked to this booking.
    await db
      .delete(income)
      .where(
        and(
          eq(income.bookingId, booking.id),
          like(income.description, `${AUTO_INCOME_DESCRIPTION_PREFIX}%`),
        ),
      );
  }
}

/**
 * One-time backfill: ensure every already-completed booking with a positive
 * totalAmount has a matching income row. Safe to run on every startup.
 */
export async function backfillBookingIncome(): Promise<{ inserted: number }> {
  const completed = await db
    .select()
    .from(bookings)
    .where(eq(bookings.status, "completed"));

  let inserted = 0;
  for (const booking of completed) {
    const amountStr = booking.totalAmount?.toString() ?? "0";
    if (!parseFloat(amountStr) || parseFloat(amountStr) <= 0) continue;

    const existing = await db
      .select({ id: income.id })
      .from(income)
      .where(eq(income.bookingId, booking.id));
    if (existing.length > 0) continue;

    const adminId = await getAdminUserId();
    await db.insert(income).values({
      userId: adminId,
      amount: amountStr,
      description: buildAutoDescription(booking),
      client: booking.customerName ?? null,
      date: pickIncomeDate(booking),
      paymentMethod: null,
      bookingId: booking.id,
      projectId: booking.projectId ?? null,
      category: "service",
      status: "received",
    });
    inserted += 1;
  }

  if (inserted > 0) {
    console.log(`Backfilled ${inserted} income record(s) from completed bookings.`);
  }
  return { inserted };
}

type DemoExpense = {
  category: string;
  amount: string;
  vendor: string;
  description: string;
  paymentMethod: string;
  monthsAgo: number;
  day: number;
  isRecurring?: boolean;
  recurringPeriod?: string;
};

const DEMO_EXPENSES: DemoExpense[] = [
  { category: "Equipment", amount: "2499.00", vendor: "DJI Store", description: "DJI Mavic 3 Pro Cine drone purchase", paymentMethod: "credit_card", monthsAgo: 6, day: 12 },
  { category: "Equipment", amount: "189.50", vendor: "B&H Photo Video", description: "Spare batteries and propellers", paymentMethod: "credit_card", monthsAgo: 3, day: 4 },
  { category: "Equipment", amount: "349.00", vendor: "Adorama", description: "ND filter set and carrying case", paymentMethod: "credit_card", monthsAgo: 1, day: 18 },
  { category: "Software", amount: "59.99", vendor: "Adobe", description: "Creative Cloud subscription", paymentMethod: "credit_card", monthsAgo: 1, day: 1, isRecurring: true, recurringPeriod: "monthly" },
  { category: "Software", amount: "29.00", vendor: "DroneDeploy", description: "Mapping software monthly plan", paymentMethod: "credit_card", monthsAgo: 1, day: 5, isRecurring: true, recurringPeriod: "monthly" },
  { category: "Travel", amount: "412.30", vendor: "Delta Airlines", description: "Travel to industrial inspection job site", paymentMethod: "credit_card", monthsAgo: 4, day: 8 },
  { category: "Travel", amount: "186.75", vendor: "Shell", description: "Fuel for site visits", paymentMethod: "debit_card", monthsAgo: 2, day: 22 },
  { category: "Insurance", amount: "168.00", vendor: "State Farm", description: "Commercial drone liability insurance", paymentMethod: "ach", monthsAgo: 1, day: 1, isRecurring: true, recurringPeriod: "monthly" },
  { category: "Training", amount: "175.00", vendor: "FAA", description: "Part 107 recertification exam fee", paymentMethod: "credit_card", monthsAgo: 6, day: 20 },
  { category: "Marketing", amount: "350.00", vendor: "Google Ads", description: "Local search ad spend", paymentMethod: "credit_card", monthsAgo: 2, day: 15, isRecurring: true, recurringPeriod: "monthly" },
  { category: "Marketing", amount: "120.00", vendor: "Meta", description: "Facebook campaign for real estate vertical", paymentMethod: "credit_card", monthsAgo: 1, day: 9 },
  { category: "Office", amount: "89.00", vendor: "Staples", description: "Printer toner and shipping supplies", paymentMethod: "credit_card", monthsAgo: 3, day: 14 },
  { category: "Utilities", amount: "94.50", vendor: "Comcast Business", description: "Office internet", paymentMethod: "ach", monthsAgo: 1, day: 3, isRecurring: true, recurringPeriod: "monthly" },
  { category: "Maintenance", amount: "215.00", vendor: "Drone Nerds Repair", description: "Gimbal calibration and motor service", paymentMethod: "credit_card", monthsAgo: 2, day: 27 },
  { category: "Taxes", amount: "640.00", vendor: "IRS", description: "Quarterly estimated tax payment", paymentMethod: "ach", monthsAgo: 4, day: 15 },
];

function dateNMonthsAgo(monthsAgo: number, day: number): string {
  const now = new Date();
  const target = new Date(now.getFullYear(), now.getMonth() - monthsAgo, day);
  return target.toISOString().split("T")[0];
}

/**
 * Seed a small batch of realistic demo expenses spread across the past
 * ~6 months. Skips entirely if any expenses already exist.
 */
export async function seedDemoExpenses(): Promise<{ inserted: number }> {
  const existing = await db.select({ id: expenses.id }).from(expenses).limit(1);
  if (existing.length > 0) {
    return { inserted: 0 };
  }

  const adminId = await getAdminUserId();
  const categoryRows = await db.select().from(expenseCategories);
  const categoryMap = new Map(
    categoryRows.map((c) => [c.name.toLowerCase(), c.id]),
  );

  const valuesToInsert = DEMO_EXPENSES.map((d) => ({
    userId: adminId,
    categoryId: categoryMap.get(d.category.toLowerCase()) ?? null,
    amount: d.amount,
    description: d.description,
    vendor: d.vendor,
    date: dateNMonthsAgo(d.monthsAgo, d.day),
    paymentMethod: d.paymentMethod,
    isDeductible: true,
    isRecurring: d.isRecurring ?? false,
    recurringPeriod: d.recurringPeriod ?? null,
    status: "active",
  }));

  if (valuesToInsert.length === 0) return { inserted: 0 };

  await db.insert(expenses).values(valuesToInsert);
  console.log(`Seeded ${valuesToInsert.length} demo expense record(s).`);
  return { inserted: valuesToInsert.length };
}
