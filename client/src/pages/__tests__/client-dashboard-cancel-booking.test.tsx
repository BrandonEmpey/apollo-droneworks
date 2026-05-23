import React from "react";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
  toast: vi.fn(),
}));

const mockApiRequest = vi.fn();
const mockInvalidateQueries = vi.fn();

vi.mock("@/lib/queryClient", () => ({
  apiRequest: (...args: unknown[]) => mockApiRequest(...args),
  queryClient: { invalidateQueries: (...args: unknown[]) => mockInvalidateQueries(...args) },
  getQueryFn: vi.fn(),
}));

vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({
    user: {
      id: 1,
      username: "testclient",
      firstName: "Test",
      email: "test@example.com",
      isAdmin: false,
    },
  }),
}));

vi.mock("wouter", () => ({
  Link: ({ children, href }: { children: React.ReactNode; href: string }) =>
    React.createElement("a", { href }, children),
  useLocation: () => ["/client-dashboard", vi.fn()],
}));

vi.mock("react-helmet-async", () => ({
  Helmet: ({ children }: { children: React.ReactNode }) =>
    React.createElement(React.Fragment, null, children),
}));

vi.mock("@/components/layout/header", () => ({
  default: () => React.createElement("header", null, "Header"),
}));

vi.mock("@/components/layout/footer", () => ({
  default: () => React.createElement("footer", null, "Footer"),
}));

vi.mock("@/components/client/project-card", () => ({
  ProjectCard: () => React.createElement("div", null, "ProjectCard"),
}));

vi.mock("@/components/client/client-projects", () => ({
  default: () => React.createElement("div", null, "ClientProjects"),
}));

vi.mock("@/components/client/printable-receipt", () => ({
  PrintableReceipt: () => React.createElement("div", null, "PrintableReceipt"),
}));

vi.mock("@/components/client/virtual-tours", () => ({
  default: () => React.createElement("div", null, "VirtualTours"),
}));

const scheduledDate = new Date(2027, 5, 15, 10, 0, 0);

const mockBooking = {
  id: 99,
  userId: 1,
  serviceId: 1,
  serviceType: "Aerial Photography",
  scheduledDate,
  date: scheduledDate,
  timeSlot: "10:00 AM",
  location: "123 Main St",
  projectName: "Test Project",
  status: "pending",
  paymentStatus: "paid",
  totalAmount: "299.00",
};

function makeWrapper() {
  const qc = new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: Infinity },
      mutations: { retry: false },
    },
  });
  qc.setQueryData(["/api/client/bookings"], [mockBooking]);
  qc.setQueryData(["/api/services"], []);
  qc.setQueryData(["/api/galleries"], []);
  qc.setQueryData(["/api/client/projects"], []);
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: qc }, children);
  };
}

import ClientDashboard from "../client-dashboard";

describe("ClientDashboard - Cancel Booking loading state", () => {
  beforeEach(() => {
    mockApiRequest.mockReset();
    mockInvalidateQueries.mockReset();
  });

  it("disables the confirm button while the cancellation request is in flight", async () => {
    let resolveDelete!: (value: { ok: boolean }) => void;
    mockApiRequest.mockReturnValue(
      new Promise<{ ok: boolean }>((resolve) => {
        resolveDelete = resolve;
      }),
    );

    const user = userEvent.setup();
    render(React.createElement(ClientDashboard, null), { wrapper: makeWrapper() });

    const bookingsTab = await screen.findByRole("tab", { name: /bookings/i });
    await user.click(bookingsTab);

    const cancelIconBtn = await screen.findByTestId("cancel-booking-btn");
    await user.click(cancelIconBtn);

    const confirmBtn = await screen.findByRole("button", { name: /yes, cancel booking/i });
    await user.click(confirmBtn);

    await waitFor(() => {
      const pendingBtn = screen.getByRole("button", { name: /cancelling/i });
      expect(pendingBtn).toBeDisabled();
    });

    const keepBtn = screen.getByRole("button", { name: /no, keep booking/i });
    expect(keepBtn).toBeDisabled();

    resolveDelete({ ok: true });
  });
});
