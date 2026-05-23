import React from "react";
import { render, screen, waitFor, act, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import AnalyticsReports from "../analytics-reports";

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock("@/lib/queryClient", () => ({
  apiRequest: vi.fn(),
  queryClient: { invalidateQueries: vi.fn() },
  getQueryFn: vi.fn(),
}));

const REPORT_PERFORMANCE = {
  id: 1,
  name: "Monthly Performance",
  description: "Overview of monthly performance",
  type: "project",
  configuration: { metrics: [], filters: {}, groupBy: [] },
  isDefault: false,
  schedule: null,
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z",
};

const REPORT_ENGAGEMENT = {
  id: 2,
  name: "Engagement Overview",
  description: "User engagement metrics",
  type: "client",
  configuration: { metrics: [], filters: {}, groupBy: [] },
  isDefault: false,
  schedule: null,
  createdAt: "2024-01-02T00:00:00.000Z",
  updatedAt: "2024-01-02T00:00:00.000Z",
};

const defaultDateRange = {
  from: new Date("2024-01-01"),
  to: new Date("2024-01-31"),
};

function makeWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

function seedQC(qc: QueryClient, reports = [REPORT_PERFORMANCE]) {
  qc.setQueryData(["/api/analytics/reports"], reports);
}

describe("AnalyticsReports – report type dropdown retention", () => {
  let qc: QueryClient;

  beforeEach(() => {
    qc = new QueryClient({
      defaultOptions: {
        queries: { retry: false, staleTime: Infinity },
        mutations: { retry: false },
      },
    });
    seedQC(qc);
  });

  it("New Report form type trigger shows placeholder when no value is selected", async () => {
    render(
      React.createElement(AnalyticsReports, { dateRange: defaultDateRange }),
      { wrapper: makeWrapper(qc) }
    );

    const newReportBtn = await screen.findByRole("button", { name: /new report/i });
    await act(async () => { fireEvent.click(newReportBtn); });

    await waitFor(() => {
      const comboboxes = document.querySelectorAll('[role="combobox"]');
      const typeCombobox = Array.from(comboboxes).find(
        (cb) => (cb as HTMLElement).textContent?.match(/select report type/i)
      );
      expect(typeCombobox).toBeTruthy();
    }, { timeout: 3000 });
  });

  it("Filter dropdown (selectedReportType) defaults to 'All Report Types'", async () => {
    render(
      React.createElement(AnalyticsReports, { dateRange: defaultDateRange }),
      { wrapper: makeWrapper(qc) }
    );

    await waitFor(() => {
      const comboboxes = document.querySelectorAll('[role="combobox"]');
      const filterCombobox = Array.from(comboboxes).find(
        (cb) => (cb as HTMLElement).textContent?.match(/all report types/i)
      );
      expect(filterCombobox).toBeTruthy();
    }, { timeout: 3000 });
  });

  it("Edit form type trigger reflects the report's type via form.reset (proves value= not defaultValue=)", async () => {
    seedQC(qc, [REPORT_PERFORMANCE, REPORT_ENGAGEMENT]);

    const user = userEvent.setup();

    render(
      React.createElement(AnalyticsReports, { dateRange: defaultDateRange }),
      { wrapper: makeWrapper(qc) }
    );

    await screen.findByText("Monthly Performance", {}, { timeout: 5000 });
    await screen.findByText("Engagement Overview", {}, { timeout: 5000 });

    const menuTriggers = screen.getAllByRole("button", { name: /open menu/i });
    expect(menuTriggers.length).toBeGreaterThanOrEqual(2);

    await user.click(menuTriggers[0]);

    const editItem = await screen.findByText("Edit", {}, { timeout: 3000 });
    await user.click(editItem);

    await waitFor(() => {
      const comboboxes = document.querySelectorAll('[role="combobox"]');
      const typeCombobox = Array.from(comboboxes).find(
        (cb) => (cb as HTMLElement).textContent?.match(/project performance/i)
      );
      expect(typeCombobox).toBeTruthy();
    }, { timeout: 3000 });

    const cancelBtn = screen.queryByRole("button", { name: /cancel/i });
    if (cancelBtn) {
      await user.click(cancelBtn);
    }

    await waitFor(() => {
      const triggers = screen.queryAllByRole("button", { name: /open menu/i });
      expect(triggers.length).toBeGreaterThanOrEqual(2);
    }, { timeout: 3000 });

    const menuTriggers2 = screen.getAllByRole("button", { name: /open menu/i });
    await user.click(menuTriggers2[1]);

    const editItem2 = await screen.findByText("Edit", {}, { timeout: 3000 });
    await user.click(editItem2);

    await waitFor(() => {
      const comboboxes = document.querySelectorAll('[role="combobox"]');
      const typeCombobox = Array.from(comboboxes).find(
        (cb) => (cb as HTMLElement).textContent?.match(/client analytics/i)
      );
      expect(typeCombobox).toBeTruthy();
    }, { timeout: 3000 });
  });
});
