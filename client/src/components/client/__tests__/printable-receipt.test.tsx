import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PrintableReceipt, groupDisclaimers } from "../printable-receipt";
import type { Booking, Service } from "@shared/schema";

const mockToast = vi.fn();

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: mockToast }),
}));

const mockApiRequest = vi.fn();

vi.mock("@/lib/queryClient", () => ({
  apiRequest: (...args: unknown[]) => mockApiRequest(...args),
  queryClient: { invalidateQueries: vi.fn() },
  getQueryFn: vi.fn(),
}));

function makeWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: qc }, children);
  };
}

function makeBooking(overrides: Partial<Booking> = {}): Booking {
  const now = new Date("2024-03-15T10:00:00Z");
  return {
    id: 42,
    userId: 1,
    serviceId: 10,
    tierId: null,
    customerName: "Jane Doe",
    customerEmail: "jane@example.com",
    customerPhone: null,
    projectLocation: null,
    scheduledDate: null,
    estimatedDuration: null,
    priority: "normal",
    status: "completed",
    totalAmount: "299.00",
    depositAmount: null,
    paymentStatus: "paid",
    specialRequirements: null,
    equipmentRequests: null,
    weatherBackupDate: null,
    notes: null,
    pilotAssigned: null,
    flightPlan: null,
    safetyChecklist: null,
    createdAt: now,
    updatedAt: now,
    completedAt: null,
    cancelledAt: null,
    projectId: null,
    projectName: null,
    selectedServices: [10],
    date: now,
    ...overrides,
  };
}

function makeService(overrides: Partial<Service> = {}): Service {
  return {
    id: 10,
    name: "Aerial Photography",
    slug: "aerial-photography",
    description: "Stunning aerial photography",
    tooltipDescription: null,
    disclaimer: null,
    price: 29900,
    imageUrl: "/img/aerial.jpg",
    videoUrl: null,
    videoPlayback: "hover",
    images: [],
    videos: [],
    features: [],
    keywords: [],
    displayOrder: 1,
    classification: "Revenue Generation",
    isActive: true,
    ...overrides,
  } as Service;
}

describe("PrintableReceipt – Email Receipt button", () => {
  beforeEach(() => {
    mockToast.mockClear();
    mockApiRequest.mockClear();
  });

  it("renders the Email Receipt button", () => {
    render(
      React.createElement(PrintableReceipt, {
        booking: makeBooking(),
        services: [makeService()],
        customerName: "Jane Doe",
        customerEmail: "jane@example.com",
      }),
      { wrapper: makeWrapper() }
    );

    expect(screen.getByRole("button", { name: /email receipt/i })).toBeInTheDocument();
  });

  it("shows the email input pre-filled with the customer email after clicking the button", async () => {
    const user = userEvent.setup();

    render(
      React.createElement(PrintableReceipt, {
        booking: makeBooking(),
        services: [makeService()],
        customerName: "Jane Doe",
        customerEmail: "jane@example.com",
      }),
      { wrapper: makeWrapper() }
    );

    await user.click(screen.getByRole("button", { name: /email receipt/i }));

    const emailInput = screen.getByRole("textbox", { name: /email address/i });
    expect(emailInput).toBeInTheDocument();
    expect(emailInput).toHaveValue("jane@example.com");
  });

  it("fires a success toast when the POST request returns 200", async () => {
    const user = userEvent.setup();

    mockApiRequest.mockResolvedValueOnce({ ok: true });

    render(
      React.createElement(PrintableReceipt, {
        booking: makeBooking(),
        services: [makeService()],
        customerName: "Jane Doe",
        customerEmail: "jane@example.com",
      }),
      { wrapper: makeWrapper() }
    );

    await user.click(screen.getByRole("button", { name: /email receipt/i }));
    await user.click(screen.getByRole("button", { name: /send receipt/i }));

    await waitFor(() => {
      expect(mockApiRequest).toHaveBeenCalledWith(
        "POST",
        "/api/receipts/42/email",
        { email: "jane@example.com", customerName: "Jane Doe" }
      );
    });

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({ title: "Receipt sent" })
      );
    });
  });

  it("renders a per-service disclaimer block on the receipt only when at least one service has a disclaimer", () => {
    const { rerender } = render(
      React.createElement(PrintableReceipt, {
        booking: makeBooking(),
        services: [makeService()],
        customerName: "Jane Doe",
        customerEmail: "jane@example.com",
      }),
      { wrapper: makeWrapper() }
    );

    expect(screen.queryByTestId("receipt-disclaimers")).not.toBeInTheDocument();

    const disclaimerText = "Weather may delay this service.";
    rerender(
      React.createElement(PrintableReceipt, {
        booking: makeBooking(),
        services: [makeService({ disclaimer: disclaimerText } as Partial<Service>)],
        customerName: "Jane Doe",
        customerEmail: "jane@example.com",
      })
    );

    const block = screen.getByTestId("receipt-disclaimers");
    expect(block).toBeInTheDocument();
    expect(block).toHaveTextContent("Service Disclaimers");
    expect(block).toHaveTextContent("Aerial Photography");
    expect(block).toHaveTextContent(disclaimerText);
  });

  it("dedupes identical disclaimers across services so the same text renders only once", () => {
    const sharedText = "Weather may delay this service.";
    const services: Service[] = [
      makeService({ id: 10, name: "Aerial Photography", disclaimer: sharedText } as Partial<Service>),
      makeService({ id: 11, name: "Aerial Video", disclaimer: `  ${sharedText}  ` } as Partial<Service>),
      makeService({ id: 12, name: "Mapping", disclaimer: "Permit required." } as Partial<Service>),
    ];

    render(
      React.createElement(PrintableReceipt, {
        booking: makeBooking({ selectedServices: [10, 11, 12] }),
        services,
        customerName: "Jane Doe",
        customerEmail: "jane@example.com",
      }),
      { wrapper: makeWrapper() }
    );

    const block = screen.getByTestId("receipt-disclaimers");
    expect(block).toBeInTheDocument();
    // The shared disclaimer text should appear exactly once, with both
    // service names listed in the header of that single block.
    const occurrences = block.querySelectorAll(".disclaimer-text");
    expect(occurrences.length).toBe(2);
    expect(block).toHaveTextContent("Aerial Photography, Aerial Video");
    expect(block).toHaveTextContent("Mapping");
    // And the shared sentence itself appears only once in the block.
    const matches = block.textContent?.match(/Weather may delay this service\./g) ?? [];
    expect(matches.length).toBe(1);
  });

  it("groupDisclaimers groups by trimmed text and ignores empty disclaimers", () => {
    const groups = groupDisclaimers([
      { id: 1, name: "A", disclaimer: "Same text" },
      { id: 2, name: "B", disclaimer: "  Same text  " },
      { id: 3, name: "C", disclaimer: "" },
      { id: 4, name: "D", disclaimer: null },
      { id: 5, name: "E", disclaimer: "Other" },
    ] as any);
    expect(groups).toEqual([
      { text: "Same text", serviceNames: ["A", "B"] },
      { text: "Other", serviceNames: ["E"] },
    ]);
  });

  it("hides the email form when the X close button is clicked, without sending a request", async () => {
    const user = userEvent.setup();

    render(
      React.createElement(PrintableReceipt, {
        booking: makeBooking(),
        services: [makeService()],
        customerName: "Jane Doe",
        customerEmail: "jane@example.com",
      }),
      { wrapper: makeWrapper() }
    );

    await user.click(screen.getByRole("button", { name: /email receipt/i }));

    const emailInput = screen.getByRole("textbox", { name: /email address/i });
    expect(emailInput).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /close email form/i }));

    expect(screen.queryByRole("textbox", { name: /email address/i })).not.toBeInTheDocument();
    expect(mockApiRequest).not.toHaveBeenCalled();
  });

  it("disables Send and shows an inline error for blank or malformed addresses, only firing the mutation for valid ones", async () => {
    const user = userEvent.setup();

    mockApiRequest.mockResolvedValueOnce({ ok: true });

    render(
      React.createElement(PrintableReceipt, {
        booking: makeBooking(),
        services: [makeService()],
        customerName: "Jane Doe",
        customerEmail: "",
      }),
      { wrapper: makeWrapper() }
    );

    await user.click(screen.getByRole("button", { name: /email receipt/i }));

    const emailInput = screen.getByRole("textbox", { name: /email address/i });
    const sendButton = screen.getByRole("button", { name: /send receipt/i });

    // Blank: send disabled, no error yet (untouched), clicking does nothing.
    expect(emailInput).toHaveValue("");
    expect(sendButton).toBeDisabled();
    expect(screen.queryByTestId("receipt-email-error")).not.toBeInTheDocument();

    await user.click(sendButton);
    expect(mockApiRequest).not.toHaveBeenCalled();

    // Blur to mark as touched – the "required" error should appear.
    await user.click(emailInput);
    await user.tab();
    expect(screen.getByTestId("receipt-email-error")).toHaveTextContent(/required/i);
    expect(sendButton).toBeDisabled();

    // Malformed input – inline "valid email" error, send still disabled, no request.
    await user.type(emailInput, "not-an-email");
    expect(screen.getByTestId("receipt-email-error")).toHaveTextContent(/valid email/i);
    expect(sendButton).toBeDisabled();

    await user.click(sendButton);
    expect(mockApiRequest).not.toHaveBeenCalled();

    // Another malformed shape (missing TLD) – still rejected.
    await user.clear(emailInput);
    await user.type(emailInput, "jane@localhost");
    expect(screen.getByTestId("receipt-email-error")).toHaveTextContent(/valid email/i);
    expect(sendButton).toBeDisabled();
    await user.click(sendButton);
    expect(mockApiRequest).not.toHaveBeenCalled();

    // Valid address – error disappears, send enables, mutation fires.
    await user.clear(emailInput);
    await user.type(emailInput, "jane@example.com");
    expect(screen.queryByTestId("receipt-email-error")).not.toBeInTheDocument();
    expect(sendButton).toBeEnabled();

    await user.click(sendButton);
    await waitFor(() => {
      expect(mockApiRequest).toHaveBeenCalledTimes(1);
    });
    expect(mockApiRequest).toHaveBeenCalledWith(
      "POST",
      "/api/receipts/42/email",
      { email: "jane@example.com", customerName: "Jane Doe" }
    );
  });

  it("fires an error toast when the POST request fails", async () => {
    const user = userEvent.setup();

    mockApiRequest.mockRejectedValueOnce(new Error("Server error"));

    render(
      React.createElement(PrintableReceipt, {
        booking: makeBooking(),
        services: [makeService()],
        customerName: "Jane Doe",
        customerEmail: "jane@example.com",
      }),
      { wrapper: makeWrapper() }
    );

    await user.click(screen.getByRole("button", { name: /email receipt/i }));
    await user.click(screen.getByRole("button", { name: /send receipt/i }));

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({ title: "Email failed", variant: "destructive" })
      );
    });
  });
});
