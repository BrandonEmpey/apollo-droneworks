import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ProjectCard } from "../project-card";
import { Booking } from "@shared/schema";

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock("@/lib/queryClient", () => ({
  apiRequest: vi.fn(),
  queryClient: { invalidateQueries: vi.fn() },
  getQueryFn: vi.fn(),
}));

function makeWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: qc }, children);
  };
}

function makeBooking(overrides: Partial<Booking>): Booking & { service?: { id: number; name: string } } {
  const now = new Date();
  return {
    id: 1,
    userId: 1,
    serviceId: 1,
    tierId: null,
    customerName: null,
    customerEmail: null,
    customerPhone: null,
    projectLocation: null,
    scheduledDate: null,
    estimatedDuration: null,
    priority: "normal",
    status: "scheduled",
    totalAmount: "299",
    depositAmount: null,
    paymentStatus: "unpaid",
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
    selectedServices: [],
    date: new Date("2024-01-10"),
    service: { id: 1, name: "Aerial Photography" },
    ...overrides,
  };
}

describe("ProjectCard - scheduled date display", () => {
  it("shows scheduledDate and not the original date when a booking is rescheduled", () => {
    const booking = makeBooking({
      date: new Date("2024-02-01"),
      scheduledDate: new Date("2024-04-25"),
    });

    render(
      React.createElement(ProjectCard, { booking }),
      { wrapper: makeWrapper() }
    );

    expect(screen.getByText(/April 25, 2024/)).toBeInTheDocument();
    expect(screen.queryByText(/February 1, 2024/)).not.toBeInTheDocument();
  });

  it("falls back to date when scheduledDate is null", () => {
    const booking = makeBooking({
      date: new Date("2024-01-10"),
      scheduledDate: null,
    });

    render(
      React.createElement(ProjectCard, { booking }),
      { wrapper: makeWrapper() }
    );

    expect(screen.getByText(/January 10, 2024/)).toBeInTheDocument();
  });

  it("falls back to date when scheduledDate is undefined", () => {
    const booking = makeBooking({
      date: new Date("2024-06-15"),
      scheduledDate: undefined as unknown as null,
    });

    render(
      React.createElement(ProjectCard, { booking }),
      { wrapper: makeWrapper() }
    );

    expect(screen.getByText(/June 15, 2024/)).toBeInTheDocument();
  });
});
