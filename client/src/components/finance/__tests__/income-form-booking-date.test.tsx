import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { format } from "date-fns";
import IncomeForm from "../income-form";

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock("@/lib/queryClient", () => ({
  apiRequest: vi.fn(),
  queryClient: { invalidateQueries: vi.fn() },
  getQueryFn: vi.fn(),
}));

function bookingOptionLabel(b: {
  serviceName: string;
  date: string;
  scheduledDate?: string | null;
}): string {
  return `${b.serviceName} - ${new Date(b.scheduledDate ?? b.date).toLocaleDateString()}`;
}

const SCHEDULED = "2024-03-20";
const ORIGINAL  = "2024-01-10";
const FALLBACK  = "2024-06-15";

const CUSTOMER_NAME = "Jane Doe";

const BOOKING_RESCHEDULED = {
  id: 10, serviceName: "Aerial Photography",
  date: ORIGINAL, scheduledDate: SCHEDULED,
  status: "completed", totalAmount: "299",
  customerName: CUSTOMER_NAME,
};

const BOOKING_DATE_ONLY = {
  id: 11, serviceName: "Roof Inspection",
  date: FALLBACK, scheduledDate: null,
  status: "completed", totalAmount: "199",
};

describe("bookingOptionLabel – scheduledDate ?? date", () => {
  it("uses scheduledDate when present", () => {
    const label = bookingOptionLabel(BOOKING_RESCHEDULED);
    expect(label).toContain("Aerial Photography");
    expect(label).toContain(new Date(SCHEDULED).toLocaleDateString());
    expect(label).not.toContain(new Date(ORIGINAL).toLocaleDateString());
  });

  it("falls back to date when scheduledDate is null", () => {
    const label = bookingOptionLabel(BOOKING_DATE_ONLY);
    expect(label).toContain("Roof Inspection");
    expect(label).toContain(new Date(FALLBACK).toLocaleDateString());
  });

  it("falls back to date when scheduledDate is undefined", () => {
    const label = bookingOptionLabel({ serviceName: "Survey", date: FALLBACK });
    expect(label).toContain(new Date(FALLBACK).toLocaleDateString());
  });
});

function makeQC() {
  return new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
}

function seedQC(qc: QueryClient) {
  qc.setQueryData(["/api/bookings"], [BOOKING_RESCHEDULED, BOOKING_DATE_ONLY]);
  qc.setQueryData(["/api/projects"], []);
  qc.setQueryData(["/api/quotes"], []);
}

function Wrapper({ qc, children }: { qc: QueryClient; children: React.ReactNode }) {
  return React.createElement(QueryClientProvider, { client: qc }, children);
}

async function openBookingDropdown(user: ReturnType<typeof userEvent.setup>) {
  const relTab = await screen.findByRole("tab", { name: /relationships/i }, { timeout: 8000 });
  await user.click(relTab);

  const bookingTrigger = await waitFor(() => {
    const comboboxes = screen.getAllByRole("combobox", { hidden: true });
    const btn = comboboxes.find(el =>
      el.tagName === "BUTTON" && el.textContent?.toLowerCase().includes("booking")
    );
    if (!btn) throw new Error("booking trigger not found");
    return btn;
  }, { timeout: 8000 });

  await user.click(bookingTrigger);
}

describe("IncomeForm – booking dropdown shows scheduledDate ?? date", () => {
  let qc: QueryClient;

  beforeEach(() => {
    qc = makeQC();
    seedQC(qc);
    qc.setQueryData(["/api/income/20"], {
      id: 20, amount: 299, date: ORIGINAL,
      category: "drone_photography", status: "completed", bookingId: null,
    });
  });

  it("shows scheduledDate (not original date) for a rescheduled booking", async () => {
    const user = userEvent.setup({ delay: null });
    render(
      React.createElement(IncomeForm, { onClose: vi.fn(), incomeId: 20 }),
      { wrapper: ({ children }) => React.createElement(Wrapper, { qc }, children) }
    );
    await openBookingDropdown(user);

    const aerialOption = await screen.findByRole("option", { name: /Aerial Photography/i }, { timeout: 5000 });
    expect(aerialOption.textContent).toContain(new Date(SCHEDULED).toLocaleDateString());
    expect(aerialOption.textContent).not.toContain(new Date(ORIGINAL).toLocaleDateString());
  });

  it("shows date when scheduledDate is null", async () => {
    const user = userEvent.setup({ delay: null });
    render(
      React.createElement(IncomeForm, { onClose: vi.fn(), incomeId: 20 }),
      { wrapper: ({ children }) => React.createElement(Wrapper, { qc }, children) }
    );
    await openBookingDropdown(user);

    const roofOption = await screen.findByRole("option", { name: /Roof Inspection/i }, { timeout: 5000 });
    expect(roofOption.textContent).toContain(new Date(FALLBACK).toLocaleDateString());
  });
});

describe("IncomeForm – selecting a booking auto-fills the date field", () => {
  let qc: QueryClient;

  beforeEach(() => {
    qc = makeQC();
    seedQC(qc);
  });

  async function selectBookingAndGetDateText(
    user: ReturnType<typeof userEvent.setup>,
    bookingNamePattern: RegExp,
  ): Promise<string> {
    await openBookingDropdown(user);
    const option = await screen.findByRole("option", { name: bookingNamePattern }, { timeout: 5000 });
    await user.click(option);

    const generalTab = screen.getByRole("tab", { name: /general/i });
    await user.click(generalTab);

    const dateButton = await waitFor(() => {
      const btn = screen.getAllByRole("button").find(
        (el) => el.textContent && /[A-Z][a-z]{2}\s+\d{2},\s+\d{4}/.test(el.textContent)
      );
      if (!btn) throw new Error("date button not found");
      return btn;
    }, { timeout: 5000 });

    return dateButton.textContent ?? "";
  }

  it("fills the date field with scheduledDate when booking has scheduledDate", async () => {
    const user = userEvent.setup({ delay: null });
    render(
      React.createElement(IncomeForm, { onClose: vi.fn() }),
      { wrapper: ({ children }) => React.createElement(Wrapper, { qc }, children) }
    );

    const dateText = await selectBookingAndGetDateText(user, /Aerial Photography/i);
    const expected = format(new Date(SCHEDULED), "MMM dd, yyyy");
    expect(dateText).toContain(expected);
  });

  it("fills the date field with date when booking has no scheduledDate", async () => {
    const user = userEvent.setup({ delay: null });
    render(
      React.createElement(IncomeForm, { onClose: vi.fn() }),
      { wrapper: ({ children }) => React.createElement(Wrapper, { qc }, children) }
    );

    const dateText = await selectBookingAndGetDateText(user, /Roof Inspection/i);
    const expected = format(new Date(FALLBACK), "MMM dd, yyyy");
    expect(dateText).toContain(expected);
  });
});

describe("IncomeForm – selecting a booking auto-fills the client field", () => {
  let qc: QueryClient;

  beforeEach(() => {
    qc = makeQC();
    seedQC(qc);
  });

  function getClientInput(): HTMLInputElement {
    return screen.getByPlaceholderText(/client or customer name/i) as HTMLInputElement;
  }

  async function selectBooking(
    user: ReturnType<typeof userEvent.setup>,
    bookingNamePattern: RegExp,
  ): Promise<void> {
    await openBookingDropdown(user);
    const option = await screen.findByRole("option", { name: bookingNamePattern }, { timeout: 5000 });
    await user.click(option);

    const generalTab = screen.getByRole("tab", { name: /general/i });
    await user.click(generalTab);
  }

  it("fills the client field with customerName when the booking has one", async () => {
    const user = userEvent.setup({ delay: null });
    render(
      React.createElement(IncomeForm, { onClose: vi.fn() }),
      { wrapper: ({ children }) => React.createElement(Wrapper, { qc }, children) }
    );

    expect(getClientInput().value).toBe("");

    await selectBooking(user, /Aerial Photography/i);

    await waitFor(() => {
      expect(getClientInput().value).toBe(CUSTOMER_NAME);
    });
  });

  it("leaves the client field unchanged when the booking has no customerName", async () => {
    const user = userEvent.setup({ delay: null });
    render(
      React.createElement(IncomeForm, { onClose: vi.fn() }),
      { wrapper: ({ children }) => React.createElement(Wrapper, { qc }, children) }
    );

    const initialName = "Existing Client";
    await user.type(getClientInput(), initialName);
    expect(getClientInput().value).toBe(initialName);

    await selectBooking(user, /Roof Inspection/i);

    await waitFor(() => {
      const dateButton = screen.getAllByRole("button").find(
        (el) => el.textContent && /[A-Z][a-z]{2}\s+\d{2},\s+\d{4}/.test(el.textContent)
      );
      expect(dateButton?.textContent).toContain(format(new Date(FALLBACK), "MMM dd, yyyy"));
    });

    expect(getClientInput().value).toBe(initialName);
  });
});
