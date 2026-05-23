import { describe, it, expect, beforeEach } from "vitest";
import { MemStorage } from "../storage";
import {
  type InsertBooking,
  type InsertService,
  type InsertUser,
  type InsertCustomer,
  type InsertClientProject,
  type InsertProjectTask,
} from "@shared/schema";

const baseService: InsertService = {
  name: "Aerial Photography",
  slug: "aerial-photography",
  description: "Professional aerial photography",
  imageUrl: "/img/aerial.jpg",
  price: 49900,
  pricingType: "flat",
  classification: "Revenue Generation",
  features: [],
  whatsIncludedContent: [],
  possibilities: [],
  processSteps: [],
} as unknown as InsertService;

function makeBooking(serviceId: number, userId: number | null, overrides: Partial<InsertBooking> = {}): InsertBooking {
  return {
    userId,
    serviceId,
    customerName: "Test Customer",
    customerEmail: "test@example.com",
    status: "pending",
    selectedServices: [serviceId],
    ...overrides,
  } as unknown as InsertBooking;
}

// Exercises the storage primitives that power the POST /api/bookings flow in
// server/routes.ts: booking create/get/update/delete, owner-vs-admin scoping
// via getUserBookings, and the customer + project + task creation chain that
// the route hangs off the booking. None of these had direct test coverage
// before, leaving server/storage.ts at 0% on every method touched here.
describe("MemStorage – booking lifecycle", () => {
  let storage: MemStorage;
  let serviceId: number;
  let userAId: number;
  let userBId: number;

  beforeEach(async () => {
    storage = new MemStorage();
    const svc = await storage.createService(baseService);
    serviceId = svc.id;
    const userA = await storage.createUser({
      username: "alice",
      password: "x",
      email: "alice@example.com",
      firstName: "Alice",
      lastName: "Example",
      isAdmin: false,
    } as unknown as InsertUser);
    const userB = await storage.createUser({
      username: "bob",
      password: "y",
      email: "bob@example.com",
      firstName: "Bob",
      lastName: "Example",
      isAdmin: false,
    } as unknown as InsertUser);
    userAId = userA.id;
    userBId = userB.id;
  });

  it("creates a booking and reads it back by id and via getBookings", async () => {
    const created = await storage.createBooking(makeBooking(serviceId, userAId));
    expect(created.id).toBeGreaterThan(0);
    expect(created.serviceId).toBe(serviceId);
    expect(created.status).toBe("pending");

    const fetched = await storage.getBooking(created.id);
    expect(fetched?.id).toBe(created.id);

    const all = await storage.getBookings();
    expect(all.map((b) => b.id)).toContain(created.id);
  });

  it("scopes getUserBookings to the booking owner only", async () => {
    const ownA = await storage.createBooking(makeBooking(serviceId, userAId));
    await storage.createBooking(makeBooking(serviceId, userBId));
    await storage.createBooking(makeBooking(serviceId, userBId));

    const aBookings = await storage.getUserBookings(userAId);
    expect(aBookings).toHaveLength(1);
    expect(aBookings[0].id).toBe(ownA.id);

    const bBookings = await storage.getUserBookings(userBId);
    expect(bBookings).toHaveLength(2);
    expect(bBookings.every((b) => b.userId === userBId)).toBe(true);
  });

  it("updates booking fields and returns undefined for missing ids", async () => {
    const created = await storage.createBooking(makeBooking(serviceId, userAId));
    const updated = await storage.updateBooking(created.id, {
      status: "completed",
      totalAmount: "499.00" as any,
    });
    expect(updated?.status).toBe("completed");
    expect(updated?.totalAmount).toBe("499.00");

    const missing = await storage.updateBooking(99999, { status: "completed" });
    expect(missing).toBeUndefined();
  });

  it("deleteBooking returns true for an existing id and false for a missing id", async () => {
    const created = await storage.createBooking(makeBooking(serviceId, userAId));
    expect(await storage.deleteBooking(created.id)).toBe(true);
    expect(await storage.getBooking(created.id)).toBeUndefined();
    expect(await storage.deleteBooking(created.id)).toBe(false);
  });
});

// The booking POST route also drives the "create-customer + create-project +
// create-task" chain behind the scenes. These tests cover the storage
// primitives that chain depends on, which were also at 0% coverage.
describe("MemStorage – customer + project chain that booking POST relies on", () => {
  let storage: MemStorage;
  let userId: number;
  let serviceId: number;

  beforeEach(async () => {
    storage = new MemStorage();
    const u = await storage.createUser({
      username: "client1",
      password: "x",
      email: "client1@example.com",
      firstName: "Client",
      lastName: "One",
      isAdmin: false,
    } as unknown as InsertUser);
    userId = u.id;
    const svc = await storage.createService(baseService);
    serviceId = svc.id;
  });

  it("auto-creates a customer for a user when getCustomerByUserId is called with createIfNotExists", async () => {
    const none = await storage.getCustomerByUserId(userId, false);
    expect(none).toBeUndefined();

    const created = await storage.getCustomerByUserId(userId, true);
    expect(created).toBeDefined();
    expect(created?.userId).toBe(userId);
    expect(created?.email).toBe("client1@example.com");

    // Idempotent: subsequent lookups return the same record without
    // creating a duplicate.
    const second = await storage.getCustomerByUserId(userId, true);
    expect(second?.id).toBe(created?.id);
  });

  it("getCustomerByUserId returns undefined for an unknown user id when asked to create", async () => {
    const none = await storage.getCustomerByUserId(987654, true);
    expect(none).toBeUndefined();
  });

  it("createClientProject + getClientProjectByNameAndClientId find existing projects (case-insensitively) for a client", async () => {
    const customer = await storage.createCustomer({
      userId,
      firstName: "Client",
      lastName: "One",
      email: "client1@example.com",
      phone: "",
      status: "active",
      source: "test",
    } as unknown as InsertCustomer);

    const project = await storage.createClientProject({
      name: "Annual Site Survey",
      clientId: customer.id,
      serviceId,
      status: "active",
      address: "100 Main",
      notes: "",
      startDate: new Date(),
      selectedServices: [serviceId],
    } as unknown as InsertClientProject);

    const sameCase = await storage.getClientProjectByNameAndClientId("Annual Site Survey", customer.id);
    expect(sameCase?.id).toBe(project.id);

    const otherCase = await storage.getClientProjectByNameAndClientId("annual site survey", customer.id);
    expect(otherCase?.id).toBe(project.id);

    const wrongClient = await storage.getClientProjectByNameAndClientId("Annual Site Survey", customer.id + 9999);
    expect(wrongClient).toBeUndefined();

    const fetched = await storage.getClientProject(project.id);
    expect(fetched?.name).toBe("Annual Site Survey");
  });

  it("createProjectTask defaults status/priority and getProjectTasks sorts by priority then due date", async () => {
    const customer = await storage.createCustomer({
      userId,
      firstName: "Client",
      lastName: "One",
      email: "c@example.com",
      phone: "",
      status: "active",
      source: "test",
    } as unknown as InsertCustomer);

    const project = await storage.createClientProject({
      name: "Job",
      clientId: customer.id,
      serviceId,
      status: "active",
      startDate: new Date(),
    } as unknown as InsertClientProject);

    // No status/priority -> defaults applied
    const taskA = await storage.createProjectTask({
      projectId: project.id,
      title: "Default-prio task",
      description: "",
      dueDate: new Date(Date.now() + 7 * 86_400_000),
    } as unknown as InsertProjectTask);
    expect(taskA.status).toBe("todo");
    expect(taskA.priority).toBe("medium");

    const taskHigh = await storage.createProjectTask({
      projectId: project.id,
      title: "High-prio later",
      description: "",
      priority: "high",
      dueDate: new Date(Date.now() + 14 * 86_400_000),
    } as unknown as InsertProjectTask);

    const taskLow = await storage.createProjectTask({
      projectId: project.id,
      title: "Low-prio sooner",
      description: "",
      priority: "low",
      dueDate: new Date(Date.now() + 1 * 86_400_000),
    } as unknown as InsertProjectTask);

    const sorted = await storage.getProjectTasks(project.id);
    // High first, then medium (default), then low — even though low has the
    // soonest due date.
    expect(sorted.map((t) => t.id)).toEqual([taskHigh.id, taskA.id, taskLow.id]);
  });

  it("updateProjectTask auto-sets completedAt when status flips to completed", async () => {
    const customer = await storage.createCustomer({
      userId,
      firstName: "C",
      lastName: "One",
      email: "c@example.com",
      phone: "",
      status: "active",
      source: "test",
    } as unknown as InsertCustomer);
    const project = await storage.createClientProject({
      name: "P",
      clientId: customer.id,
      serviceId,
      status: "active",
      startDate: new Date(),
    } as unknown as InsertClientProject);
    const task = await storage.createProjectTask({
      projectId: project.id,
      title: "Do thing",
      description: "",
    } as unknown as InsertProjectTask);
    expect(task.completedAt).toBeUndefined();

    const completed = await storage.updateProjectTask(task.id, { status: "completed" });
    expect(completed?.status).toBe("completed");
    expect(completed?.completedAt).toBeInstanceOf(Date);

    const missing = await storage.updateProjectTask(99999, { status: "completed" });
    expect(missing).toBeUndefined();
  });
});
