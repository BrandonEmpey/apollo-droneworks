import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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

const QUOTE_ALPHA = {
  id: 101,
  clientName: "Alpha Industries",
  date: "2024-04-12",
  status: "approved",
  total: "1500",
};

const QUOTE_BETA = {
  id: 102,
  clientName: "Beta Builders",
  date: "2024-05-20",
  status: "approved",
  total: "2750",
};

const QUOTE_NO_NAME = {
  id: 103,
  clientName: "",
  date: "2024-06-01",
  status: "approved",
  total: "500",
};

function makeQC() {
  return new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
}

function seedQC(qc: QueryClient) {
  qc.setQueryData(["/api/bookings"], []);
  qc.setQueryData(["/api/projects"], []);
  qc.setQueryData(["/api/quotes"], [QUOTE_ALPHA, QUOTE_BETA, QUOTE_NO_NAME]);
}

function Wrapper({ qc, children }: { qc: QueryClient; children: React.ReactNode }) {
  return React.createElement(QueryClientProvider, { client: qc }, children);
}

async function openQuoteDropdown(user: ReturnType<typeof userEvent.setup>) {
  const relTab = await screen.findByRole("tab", { name: /relationships/i }, { timeout: 8000 });
  await user.click(relTab);

  const quoteTrigger = await waitFor(() => {
    const label = screen.getByText(/associated quote/i);
    const item = label.closest("div");
    const btn = item?.querySelector('button[role="combobox"]') as HTMLButtonElement | null;
    if (!btn) throw new Error("quote trigger not found");
    return btn;
  }, { timeout: 8000 });

  await user.click(quoteTrigger);
}

function getClientInput(): HTMLInputElement {
  return screen.getByPlaceholderText(/client or customer name/i) as HTMLInputElement;
}

async function selectQuote(
  user: ReturnType<typeof userEvent.setup>,
  quoteNamePattern: RegExp,
) {
  await openQuoteDropdown(user);
  const option = await screen.findByRole("option", { name: quoteNamePattern }, { timeout: 5000 });
  await user.click(option);

  const generalTab = screen.getByRole("tab", { name: /general/i });
  await user.click(generalTab);
}

describe("IncomeForm – selecting a quote auto-fills the client field", () => {
  let qc: QueryClient;

  beforeEach(() => {
    qc = makeQC();
    seedQC(qc);
  });

  it("fills the client field with clientName when a quote is selected", async () => {
    const user = userEvent.setup({ delay: null });
    render(
      React.createElement(IncomeForm, { onClose: vi.fn() }),
      { wrapper: ({ children }) => React.createElement(Wrapper, { qc }, children) }
    );

    expect(getClientInput().value).toBe("");

    await selectQuote(user, /Alpha Industries/i);

    await waitFor(() => {
      expect(getClientInput().value).toBe(QUOTE_ALPHA.clientName);
    });
  });

  it("updates the client field when a different quote is selected", async () => {
    const user = userEvent.setup({ delay: null });
    render(
      React.createElement(IncomeForm, { onClose: vi.fn() }),
      { wrapper: ({ children }) => React.createElement(Wrapper, { qc }, children) }
    );

    await selectQuote(user, /Alpha Industries/i);
    await waitFor(() => {
      expect(getClientInput().value).toBe(QUOTE_ALPHA.clientName);
    });

    await selectQuote(user, /Beta Builders/i);
    await waitFor(() => {
      expect(getClientInput().value).toBe(QUOTE_BETA.clientName);
    });
  });
});
