import React from "react";
import { render, screen, waitFor, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { format } from "date-fns";
import { z } from "zod";
import ExpenseForm from "../expense-form";

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock("@/lib/queryClient", () => ({
  apiRequest: vi.fn(),
  queryClient: { invalidateQueries: vi.fn() },
  getQueryFn: vi.fn(),
}));

const mockCategories = [
  { id: 1, name: "Equipment" },
  { id: 2, name: "Software" },
  { id: 3, name: "Travel" },
  { id: 4, name: "Office Supplies" },
];

function makeWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

// ---------------------------------------------------------------------------
// Pure-logic layer: expense schema validation
// ---------------------------------------------------------------------------

const expenseSchema = z.object({
  amount: z
    .string()
    .nonempty("Amount is required")
    .refine(
      (val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0,
      "Amount must be a positive number"
    ),
  date: z.date({
    required_error: "Date is required",
    invalid_type_error: "Date format is invalid",
  }),
  categoryId: z.string().nonempty("Category is required"),
  description: z.string().default(""),
  vendor: z.string().default(""),
  notes: z.string().default(""),
  isDeductible: z.boolean().default(false),
  paymentMethod: z.string().default(""),
  receiptUrl: z.string().default(""),
});

describe("expenseSchema – amount validation", () => {
  it("accepts a valid positive amount", () => {
    const result = expenseSchema.shape.amount.safeParse("99.99");
    expect(result.success).toBe(true);
  });

  it("rejects an empty amount", () => {
    const result = expenseSchema.shape.amount.safeParse("");
    expect(result.success).toBe(false);
  });

  it("rejects a zero amount", () => {
    const result = expenseSchema.shape.amount.safeParse("0");
    expect(result.success).toBe(false);
  });

  it("rejects a negative amount", () => {
    const result = expenseSchema.shape.amount.safeParse("-5");
    expect(result.success).toBe(false);
  });

  it("rejects non-numeric text", () => {
    const result = expenseSchema.shape.amount.safeParse("abc");
    expect(result.success).toBe(false);
  });
});

describe("expenseSchema – category validation", () => {
  it("accepts a non-empty categoryId", () => {
    const result = expenseSchema.shape.categoryId.safeParse("3");
    expect(result.success).toBe(true);
  });

  it("rejects an empty categoryId", () => {
    const result = expenseSchema.shape.categoryId.safeParse("");
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Pure-logic layer: scheduledDate display – date field formatting
// ---------------------------------------------------------------------------

describe("expense scheduledDate display – format(date, 'MMM dd, yyyy')", () => {
  it("formats a known date correctly", () => {
    const d = new Date("2024-06-15");
    expect(format(d, "MMM dd, yyyy")).toBe("Jun 15, 2024");
  });

  it("formats a January date with zero-padded day", () => {
    const d = new Date("2024-01-05");
    expect(format(d, "MMM dd, yyyy")).toBe("Jan 05, 2024");
  });

  it("formats December correctly", () => {
    const d = new Date("2023-12-31");
    expect(format(d, "MMM dd, yyyy")).toBe("Dec 31, 2023");
  });

  it("a future date after today still formats correctly", () => {
    const d = new Date("2026-08-20");
    expect(format(d, "MMM dd, yyyy")).toBe("Aug 20, 2026");
  });
});

describe("expense date serialisation – toISOString().split('T')[0]", () => {
  it("produces YYYY-MM-DD format for a UTC midnight date", () => {
    const d = new Date("2024-03-20T00:00:00.000Z");
    expect(d.toISOString().split("T")[0]).toBe("2024-03-20");
  });
});

// ---------------------------------------------------------------------------
// Smoke render layer: scheduledDate display in edit mode
// ---------------------------------------------------------------------------

describe("ExpenseForm – scheduledDate display (date field shows formatted value after load)", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, staleTime: Infinity },
        mutations: { retry: false },
      },
    });
    queryClient.setQueryData(["/api/expense-categories"], mockCategories);
  });

  it("date trigger shows formatted expense date after data loads", async () => {
    queryClient.setQueryData(["/api/expenses/20"], {
      id: 20,
      amount: 120,
      date: "2024-06-15",
      categoryId: 1,
      vendor: "B&H Photo",
      description: "Lens filter",
      notes: "",
      isDeductible: true,
      paymentMethod: "credit_card",
      receiptUrl: "",
    });

    render(
      React.createElement(ExpenseForm, { onClose: vi.fn(), expenseId: 20 }),
      { wrapper: makeWrapper(queryClient) }
    );

    await waitFor(
      () => {
        expect(screen.getByText(/Jun 15, 2024/i)).toBeTruthy();
      },
      { timeout: 3000 }
    );
  });

  it("date trigger shows today's date by default in create mode", async () => {
    render(
      React.createElement(ExpenseForm, { onClose: vi.fn() }),
      { wrapper: makeWrapper(queryClient) }
    );

    const today = format(new Date(), "MMM dd, yyyy");
    await waitFor(
      () => {
        expect(screen.getByText(today)).toBeTruthy();
      },
      { timeout: 3000 }
    );
  });
});

describe("ExpenseForm - dropdown selected-value retention", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, staleTime: Infinity },
        mutations: { retry: false },
      },
    });
    queryClient.setQueryData(["/api/expense-categories"], mockCategories);
  });

  it("category trigger shows loaded category label after form.reset()", async () => {
    queryClient.setQueryData(["/api/expenses/10"], {
      id: 10,
      amount: 250,
      date: "2024-01-20",
      categoryId: 3,
      vendor: "Delta Airlines",
      description: "Flight",
      notes: "",
      isDeductible: true,
      paymentMethod: "credit_card",
      receiptUrl: "",
    });

    render(
      React.createElement(ExpenseForm, { onClose: vi.fn(), expenseId: 10 }),
      { wrapper: makeWrapper(queryClient) }
    );

    await waitFor(
      () => {
        const comboboxes = screen.getAllByRole("combobox");
        expect(comboboxes[0]).toHaveTextContent("Travel");
      },
      { timeout: 3000 }
    );
  });

  it("category trigger updates when expense data changes (proves value, not defaultValue)", async () => {
    queryClient.setQueryData(["/api/expenses/11"], {
      id: 11,
      amount: 500,
      date: "2024-02-01",
      categoryId: 3,
      vendor: "Vendor A",
      description: "Initial category Travel",
      notes: "",
      isDeductible: true,
      paymentMethod: "cash",
      receiptUrl: "",
    });

    render(
      React.createElement(ExpenseForm, { onClose: vi.fn(), expenseId: 11 }),
      { wrapper: makeWrapper(queryClient) }
    );

    await waitFor(
      () => {
        const comboboxes = screen.getAllByRole("combobox");
        expect(comboboxes[0]).toHaveTextContent("Travel");
      },
      { timeout: 3000 }
    );

    act(() => {
      queryClient.setQueryData(["/api/expenses/11"], {
        id: 11,
        amount: 500,
        date: "2024-02-01",
        categoryId: 1,
        vendor: "Vendor A",
        description: "Updated category Equipment",
        notes: "",
        isDeductible: true,
        paymentMethod: "bank_transfer",
        receiptUrl: "",
      });
    });

    await waitFor(
      () => {
        const comboboxes = screen.getAllByRole("combobox");
        expect(comboboxes[0]).toHaveTextContent("Equipment");
      },
      { timeout: 3000 }
    );
  });

  it("payment method trigger shows loaded payment method label after form.reset()", async () => {
    queryClient.setQueryData(["/api/expenses/12"], {
      id: 12,
      amount: 89.99,
      date: "2024-02-05",
      categoryId: 2,
      vendor: "Adobe",
      description: "Subscription",
      notes: "",
      isDeductible: true,
      paymentMethod: "bank_transfer",
      receiptUrl: "",
    });

    render(
      React.createElement(ExpenseForm, { onClose: vi.fn(), expenseId: 12 }),
      { wrapper: makeWrapper(queryClient) }
    );

    await waitFor(
      () => {
        const comboboxes = screen.getAllByRole("combobox");
        expect(comboboxes[1]).toHaveTextContent("Bank Transfer");
      },
      { timeout: 3000 }
    );
  });

  it("payment method trigger updates when data changes (proves value, not defaultValue)", async () => {
    queryClient.setQueryData(["/api/expenses/13"], {
      id: 13,
      amount: 45,
      date: "2024-04-01",
      categoryId: 4,
      vendor: "Office Depot",
      description: "Supplies",
      notes: "",
      isDeductible: false,
      paymentMethod: "cash",
      receiptUrl: "",
    });

    render(
      React.createElement(ExpenseForm, { onClose: vi.fn(), expenseId: 13 }),
      { wrapper: makeWrapper(queryClient) }
    );

    await waitFor(
      () => {
        const comboboxes = screen.getAllByRole("combobox");
        expect(comboboxes[1]).toHaveTextContent("Cash");
      },
      { timeout: 3000 }
    );

    act(() => {
      queryClient.setQueryData(["/api/expenses/13"], {
        id: 13,
        amount: 45,
        date: "2024-04-01",
        categoryId: 4,
        vendor: "Office Depot",
        description: "Supplies",
        notes: "",
        isDeductible: false,
        paymentMethod: "credit_card",
        receiptUrl: "",
      });
    });

    await waitFor(
      () => {
        const comboboxes = screen.getAllByRole("combobox");
        expect(comboboxes[1]).toHaveTextContent("Credit Card");
      },
      { timeout: 3000 }
    );
  });
});
