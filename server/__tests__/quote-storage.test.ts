import { describe, it, expect, beforeEach } from "vitest";
import { MemStorage } from "../storage";

// Exercises the quote primitives that back GET/POST/PUT/DELETE /api/quotes
// in server/routes.ts. The MemStorage quote map and counter were previously
// untouched by any test, leaving the entire quote code path at 0% coverage.
describe("MemStorage – quote CRUD", () => {
  let storage: MemStorage;

  beforeEach(() => {
    storage = new MemStorage();
  });

  it("createQuote stores the row, assigns an id, and stamps timestamps", async () => {
    const quote = await storage.createQuote({
      userId: 7,
      clientName: "Acme Corp",
      clientEmail: "ops@acme.test",
      projectName: "Site Mapping",
      totalAmount: "1200",
      status: "draft",
    });
    expect(quote.id).toBeGreaterThan(0);
    expect(quote.clientName).toBe("Acme Corp");
    expect(quote.createdAt).toBeInstanceOf(Date);
    expect(quote.updatedAt).toBeInstanceOf(Date);

    const fetched = await storage.getQuote(quote.id);
    expect(fetched?.id).toBe(quote.id);
  });

  it("getQuotes filters by userId when provided and returns all when not", async () => {
    const userOwn = await storage.createQuote({
      userId: 11,
      clientName: "Mine",
      projectName: "P1",
      totalAmount: "100",
    });
    const someoneElse = await storage.createQuote({
      userId: 22,
      clientName: "Theirs",
      projectName: "P2",
      totalAmount: "200",
    });

    const onlyMine = await storage.getQuotes(11);
    expect(onlyMine.map((q) => q.id)).toEqual([userOwn.id]);

    const everything = await storage.getQuotes();
    const ids = everything.map((q) => q.id).sort();
    expect(ids).toEqual([userOwn.id, someoneElse.id].sort());
  });

  it("updateQuote merges fields, refreshes updatedAt, and returns undefined for unknown ids", async () => {
    const quote = await storage.createQuote({
      userId: 1,
      clientName: "Old Name",
      projectName: "Same",
      totalAmount: "50",
      status: "draft",
    });
    const originalUpdatedAt = quote.updatedAt;
    // Force a measurable tick on the clock so the updatedAt comparison is
    // stable across machines.
    await new Promise((r) => setTimeout(r, 5));

    const updated = await storage.updateQuote(quote.id, {
      status: "sent",
      clientName: "New Name",
    });
    expect(updated?.status).toBe("sent");
    expect(updated?.clientName).toBe("New Name");
    expect(updated?.projectName).toBe("Same"); // untouched fields preserved
    expect(
      updated?.updatedAt instanceof Date && updated.updatedAt.getTime() >= originalUpdatedAt.getTime(),
    ).toBe(true);

    const missing = await storage.updateQuote(999999, { status: "sent" });
    expect(missing).toBeUndefined();
  });

  it("deleteQuote removes the row and returns true once, false thereafter", async () => {
    const quote = await storage.createQuote({
      userId: 1,
      clientName: "Disposable",
      projectName: "X",
      totalAmount: "0",
    });
    expect(await storage.deleteQuote(quote.id)).toBe(true);
    expect(await storage.getQuote(quote.id)).toBeUndefined();
    expect(await storage.deleteQuote(quote.id)).toBe(false);
  });
});
