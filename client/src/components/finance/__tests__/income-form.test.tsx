import React from "react";
import { render, screen, waitFor, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import IncomeForm from "../income-form";

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock("@/lib/queryClient", () => ({
  apiRequest: vi.fn(),
  queryClient: { invalidateQueries: vi.fn() },
  getQueryFn: vi.fn(),
}));

function makeWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

function seedCommon(queryClient: QueryClient) {
  queryClient.setQueryData(["/api/projects"], []);
  queryClient.setQueryData(["/api/bookings"], []);
  queryClient.setQueryData(["/api/quotes"], []);
}

describe("IncomeForm - dropdown selected-value retention", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, staleTime: Infinity },
        mutations: { retry: false },
      },
    });
    seedCommon(queryClient);
  });

  it("category trigger shows the loaded income category label after form.reset()", async () => {
    queryClient.setQueryData(["/api/income/42"], {
      id: 42,
      amount: 500,
      date: "2024-01-15",
      category: "drone_photography",
      status: "completed",
    });

    render(
      React.createElement(IncomeForm, { onClose: vi.fn(), incomeId: 42 }),
      { wrapper: makeWrapper(queryClient) }
    );

    await waitFor(
      () => {
        const comboboxes = screen.getAllByRole("combobox");
        const categoryCombobox = comboboxes[0];
        expect(categoryCombobox).toHaveTextContent("Drone Photography");
      },
      { timeout: 3000 }
    );
  });

  it("category trigger updates after income data changes (proves value, not defaultValue)", async () => {
    queryClient.setQueryData(["/api/income/43"], {
      id: 43,
      amount: 400,
      date: "2024-02-01",
      category: "consulting",
      status: "completed",
    });

    render(
      React.createElement(IncomeForm, { onClose: vi.fn(), incomeId: 43 }),
      { wrapper: makeWrapper(queryClient) }
    );

    await waitFor(
      () => {
        const comboboxes = screen.getAllByRole("combobox");
        expect(comboboxes[0]).toHaveTextContent("Consulting");
      },
      { timeout: 3000 }
    );

    act(() => {
      queryClient.setQueryData(["/api/income/43"], {
        id: 43,
        amount: 400,
        date: "2024-02-01",
        category: "training",
        status: "completed",
      });
    });

    await waitFor(
      () => {
        const comboboxes = screen.getAllByRole("combobox");
        expect(comboboxes[0]).toHaveTextContent("Training Services");
      },
      { timeout: 3000 }
    );
  });

  it("category trigger shows 'Mapping & Surveying' when category='mapping'", async () => {
    queryClient.setQueryData(["/api/income/44"], {
      id: 44,
      amount: 750,
      date: "2024-03-05",
      category: "mapping",
      status: "pending",
    });

    render(
      React.createElement(IncomeForm, { onClose: vi.fn(), incomeId: 44 }),
      { wrapper: makeWrapper(queryClient) }
    );

    await waitFor(
      () => {
        const comboboxes = screen.getAllByRole("combobox");
        expect(comboboxes[0]).toHaveTextContent("Mapping & Surveying");
      },
      { timeout: 3000 }
    );
  });

  it("new income form category trigger shows placeholder (no category set)", async () => {
    render(
      React.createElement(IncomeForm, { onClose: vi.fn() }),
      { wrapper: makeWrapper(queryClient) }
    );

    await waitFor(
      () => {
        const comboboxes = screen.getAllByRole("combobox");
        const categoryCombobox = comboboxes[0];
        expect(categoryCombobox).toHaveTextContent("Select a category");
      },
      { timeout: 3000 }
    );
  });
});
