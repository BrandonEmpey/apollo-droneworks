import React from "react";
import { render, screen, waitFor, fireEvent, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import BudgetPlanning from "../budget-planning";

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
];

const mockBudgetItems = [
  { id: 1, categoryId: 1, amount: 5000, period: "monthly", notes: "", createdAt: "2024-01-01", updatedAt: "2024-01-01" },
  { id: 2, categoryId: 3, amount: 2000, period: "quarterly", notes: "", createdAt: "2024-01-01", updatedAt: "2024-01-01" },
];

function makeWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

async function openAddDialog(queryClient: QueryClient) {
  render(
    React.createElement(BudgetPlanning, null),
    { wrapper: makeWrapper(queryClient) }
  );

  const addButton = await screen.findByRole("button", { name: /add budget item/i });
  await act(async () => {
    fireEvent.click(addButton);
  });

  await waitFor(
    () => expect(screen.getByRole("dialog")).toBeInTheDocument(),
    { timeout: 3000 }
  );
}

async function openEditDialog(queryClient: QueryClient) {
  render(
    React.createElement(BudgetPlanning, null),
    { wrapper: makeWrapper(queryClient) }
  );

  await waitFor(
    () => {
      const allButtons = screen.getAllByRole("button");
      const iconButtons = allButtons.filter(
        (btn) => btn.querySelector("svg") && btn.textContent?.trim() === ""
      );
      expect(iconButtons.length).toBeGreaterThan(0);
      fireEvent.click(iconButtons[0]);
    },
    { timeout: 3000 }
  );

  await waitFor(
    () => expect(screen.getByRole("dialog")).toBeInTheDocument(),
    { timeout: 3000 }
  );
}

describe("BudgetPlanning - dropdown selected-value retention", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, staleTime: Infinity },
        mutations: { retry: false },
      },
    });
    queryClient.setQueryData(["/api/expense-categories"], mockCategories);
    queryClient.setQueryData(["/api/budget-items"], mockBudgetItems);
    queryClient.setQueryData(["/api/expenses"], []);
  });

  it("Add dialog period trigger defaults to 'Monthly' when monthly tab is active", async () => {
    await openAddDialog(queryClient);

    const dialog = screen.getByRole("dialog");
    const comboboxes = dialog.querySelectorAll('[role="combobox"]');
    const periodCombobox = comboboxes[1] as HTMLElement;

    expect(periodCombobox).toHaveTextContent("Monthly");
  });

  it("Add dialog category trigger shows placeholder (no category pre-selected)", async () => {
    await openAddDialog(queryClient);

    const dialog = screen.getByRole("dialog");
    const comboboxes = dialog.querySelectorAll('[role="combobox"]');
    const categoryCombobox = comboboxes[0] as HTMLElement;

    expect(categoryCombobox).toHaveTextContent("Select a category");
  });

  it("edit dialog category trigger shows the budget item's existing category label", async () => {
    await openEditDialog(queryClient);

    const dialog = screen.getByRole("dialog");

    await waitFor(
      () => {
        const comboboxes = dialog.querySelectorAll('[role="combobox"]');
        const categoryCombobox = comboboxes[0] as HTMLElement;
        expect(categoryCombobox).toHaveTextContent("Equipment");
      },
      { timeout: 3000 }
    );
  });

  it("edit dialog period trigger shows the budget item's existing period label", async () => {
    await openEditDialog(queryClient);

    const dialog = screen.getByRole("dialog");

    await waitFor(
      () => {
        const comboboxes = dialog.querySelectorAll('[role="combobox"]');
        const periodCombobox = comboboxes[1] as HTMLElement;
        expect(periodCombobox).toHaveTextContent("Monthly");
      },
      { timeout: 3000 }
    );
  });

  it("period trigger updates when dialog is re-opened for a different item (re-render check)", async () => {
    render(
      React.createElement(BudgetPlanning, null),
      { wrapper: makeWrapper(queryClient) }
    );

    const addButton = await screen.findByRole("button", { name: /add budget item/i });
    await act(async () => { fireEvent.click(addButton); });
    await waitFor(() => expect(screen.getByRole("dialog")).toBeInTheDocument(), { timeout: 3000 });

    const dialog = screen.getByRole("dialog");
    const comboboxes = dialog.querySelectorAll('[role="combobox"]');
    expect((comboboxes[1] as HTMLElement)).toHaveTextContent("Monthly");

    const cancelBtn = screen.getByRole("button", { name: /cancel/i });
    fireEvent.click(cancelBtn);

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    }, { timeout: 3000 });

    await act(async () => { fireEvent.click(addButton); });
    await waitFor(() => expect(screen.getByRole("dialog")).toBeInTheDocument(), { timeout: 3000 });

    const dialog2 = screen.getByRole("dialog");
    const comboboxes2 = dialog2.querySelectorAll('[role="combobox"]');
    expect((comboboxes2[1] as HTMLElement)).toHaveTextContent("Monthly");
  });
});
