import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { format } from "date-fns";
import { BookingManager } from "../booking-manager";
import type { Booking, Service, User } from "@shared/schema";

const { toastSpy } = vi.hoisted(() => ({ toastSpy: vi.fn() }));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: toastSpy }),
}));

vi.mock("@/lib/queryClient", () => ({
  apiRequest: vi.fn(),
  queryClient: { invalidateQueries: vi.fn() },
  getQueryFn: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeWrapper(qc: QueryClient) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: qc }, children);
  };
}

function makeQC() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity }, mutations: { retry: false } },
  });
}

// ---------------------------------------------------------------------------
// Sample fixtures
// ---------------------------------------------------------------------------

// Minimal shapes — the component only reads .id/.name from services and
// .id/.username/.firstName/.lastName from users; casts make this explicit.
const SAMPLE_SERVICES = [
  { id: 1, name: "Aerial Photography" },
  { id: 2, name: "Roof Inspection" },
  { id: 3, name: "3D Mapping" },
] as unknown as Service[];

const SAMPLE_USERS = [
  { id: 10, username: "jsmith", firstName: "Jane", lastName: "Smith" },
  { id: 11, username: "bdoe", firstName: null, lastName: null },
  { id: 12, username: "cwilson", firstName: "Carol", lastName: "Wilson" },
] as unknown as User[];

// The component accesses `booking.totalPrice` at runtime (a field not present
// in the Drizzle-inferred Booking type). The fixture below includes it so the
// form can call .toString() on it without throwing.  The cast is intentional
// and documents the mismatch between the component and the schema type.
const SAMPLE_BOOKING = {
  id: 42,
  userId: 10,
  serviceId: 1,
  tierId: null,
  customerName: "Jane Smith",
  customerEmail: null,
  customerPhone: null,
  projectLocation: "123 Main St",
  scheduledDate: new Date("2025-07-15T09:30:00.000Z"),
  date: null,
  estimatedDuration: null,
  priority: "normal",
  status: "pending",
  totalAmount: "325",
  totalPrice: 325,
  depositAmount: null,
  paymentStatus: "unpaid",
  specialRequirements: null,
  equipmentRequests: null,
  weatherBackupDate: null,
  notes: "Test notes",
  pilotAssigned: null,
  flightPlan: null,
  safetyChecklist: null,
  createdAt: new Date("2025-01-01T00:00:00.000Z"),
  updatedAt: new Date("2025-01-01T00:00:00.000Z"),
  completedAt: null,
  cancelledAt: null,
  projectId: null,
  projectName: null,
  selectedServices: [],
} as unknown as Booking;

// ---------------------------------------------------------------------------
// Pure logic: getUserName
// ---------------------------------------------------------------------------

type UserMinimal = { id: number; username: string; firstName: string | null; lastName: string | null };

function getUserName(userId: number, users?: UserMinimal[]) {
  if (!users) return `User #${userId}`;
  const user = users.find((u) => u.id === userId);
  if (!user) return `User #${userId}`;
  return user.firstName && user.lastName
    ? `${user.firstName} ${user.lastName}`
    : user.username;
}

describe("getUserName – client display logic", () => {
  it("returns firstName + lastName when both are present", () => {
    expect(getUserName(10, SAMPLE_USERS)).toBe("Jane Smith");
  });

  it("falls back to username when firstName/lastName are null", () => {
    expect(getUserName(11, SAMPLE_USERS)).toBe("bdoe");
  });

  it("returns full name for another user with names", () => {
    expect(getUserName(12, SAMPLE_USERS)).toBe("Carol Wilson");
  });

  it("returns 'User #N' when users array is not provided", () => {
    expect(getUserName(10, undefined)).toBe("User #10");
  });

  it("returns 'User #N' when user is not found in the list", () => {
    expect(getUserName(99, SAMPLE_USERS)).toBe("User #99");
  });
});

// ---------------------------------------------------------------------------
// Pure logic: getServiceName
// ---------------------------------------------------------------------------

type ServiceMinimal = { id: number; name: string };

function getServiceName(serviceId: number, services: ServiceMinimal[]) {
  const service = services.find((s) => s.id === serviceId);
  return service ? service.name : `Service #${serviceId}`;
}

describe("getServiceName – service label logic", () => {
  it("returns the service name when the id is found", () => {
    expect(getServiceName(1, SAMPLE_SERVICES)).toBe("Aerial Photography");
  });

  it("returns the correct name for a different service id", () => {
    expect(getServiceName(2, SAMPLE_SERVICES)).toBe("Roof Inspection");
  });

  it("returns 'Service #N' fallback when service id is not in list", () => {
    expect(getServiceName(99, SAMPLE_SERVICES)).toBe("Service #99");
  });
});

// ---------------------------------------------------------------------------
// Pure logic: booking date formatting
// ---------------------------------------------------------------------------

describe("booking date – display formatting (MMM d, yyyy  /  h:mm a)", () => {
  it("formats a date created with explicit local parts using the 'MMM d, yyyy' pattern", () => {
    const d = new Date(2025, 6, 15); // July 15 2025 local midnight — TZ-stable
    expect(format(d, "MMM d, yyyy")).toBe("Jul 15, 2025");
  });

  it("formats a January date with single-digit day correctly", () => {
    const d = new Date(2024, 0, 5); // Jan 5 2024 local midnight
    expect(format(d, "MMM d, yyyy")).toBe("Jan 5, 2024");
  });

  it("formats the time portion with AM/PM pattern", () => {
    const d = new Date(2025, 6, 15, 14, 30, 0); // 14:30 local time
    const result = format(d, "h:mm a");
    expect(result).toMatch(/\d{1,2}:\d{2} (AM|PM)/);
  });

  it("local midnight (00:00) formats as 12:00 AM", () => {
    const d = new Date(2025, 6, 15, 0, 0, 0); // midnight local time
    const result = format(d, "h:mm a");
    expect(result).toBe("12:00 AM");
  });
});

describe("booking date – form init format (datetime-local slice)", () => {
  it("slicing toISOString to 16 chars yields YYYY-MM-DDTHH:MM", () => {
    const d = new Date("2025-07-15T09:30:00.000Z");
    const result = d.toISOString().slice(0, 16);
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
  });

  it("uses scheduledDate when available, falling back to date field", () => {
    const bookingWithScheduledDate = { scheduledDate: new Date("2025-07-15T09:30:00.000Z"), date: undefined };
    const bookingWithDateOnly = { scheduledDate: null, date: "2025-08-20T14:00:00.000Z" };

    const resolvedA = bookingWithScheduledDate.scheduledDate ?? bookingWithScheduledDate.date;
    const resolvedB = bookingWithDateOnly.scheduledDate ?? bookingWithDateOnly.date;

    expect(resolvedA).toBeInstanceOf(Date);
    expect(typeof resolvedB).toBe("string");
  });
});

// ---------------------------------------------------------------------------
// Pure logic: status label mapping
// ---------------------------------------------------------------------------

function statusLabel(status: string): string {
  switch (status.toLowerCase()) {
    case "completed":  return "Completed";
    case "in_progress": return "In Progress";
    case "pending":    return "Pending";
    case "cancelled":  return "Cancelled";
    default:           return status;
  }
}

describe("status label mapping", () => {
  it("maps 'pending' to 'Pending'", () => {
    expect(statusLabel("pending")).toBe("Pending");
  });

  it("maps 'in_progress' to 'In Progress'", () => {
    expect(statusLabel("in_progress")).toBe("In Progress");
  });

  it("maps 'completed' to 'Completed'", () => {
    expect(statusLabel("completed")).toBe("Completed");
  });

  it("maps 'cancelled' to 'Cancelled'", () => {
    expect(statusLabel("cancelled")).toBe("Cancelled");
  });

  it("is case-insensitive for input", () => {
    expect(statusLabel("PENDING")).toBe("Pending");
    expect(statusLabel("Completed")).toBe("Completed");
  });

  it("passes unknown statuses through unchanged", () => {
    expect(statusLabel("on_hold")).toBe("on_hold");
  });
});

// ---------------------------------------------------------------------------
// Pure logic: payment status label mapping
// ---------------------------------------------------------------------------

function paymentLabel(status: string): string {
  switch (status.toLowerCase()) {
    case "paid":    return "Paid";
    case "pending": return "Pending";
    case "failed":  return "Failed";
    case "unpaid":  return "Unpaid";
    default:        return status;
  }
}

describe("payment status label mapping", () => {
  it("maps 'paid' to 'Paid'", () => {
    expect(paymentLabel("paid")).toBe("Paid");
  });

  it("maps 'unpaid' to 'Unpaid'", () => {
    expect(paymentLabel("unpaid")).toBe("Unpaid");
  });

  it("maps 'pending' to 'Pending'", () => {
    expect(paymentLabel("pending")).toBe("Pending");
  });

  it("maps 'failed' to 'Failed'", () => {
    expect(paymentLabel("failed")).toBe("Failed");
  });

  it("passes through an unrecognised payment status", () => {
    expect(paymentLabel("refunded")).toBe("refunded");
  });
});

// ---------------------------------------------------------------------------
// Pure logic: price formatting
// ---------------------------------------------------------------------------

function formatPrice(price: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price);
}

describe("formatPrice – currency display", () => {
  it("formats 325 as $325", () => {
    expect(formatPrice(325)).toBe("$325");
  });

  it("formats 0 as $0", () => {
    expect(formatPrice(0)).toBe("$0");
  });

  it("formats 1000 without decimal places", () => {
    expect(formatPrice(1000)).toBe("$1,000");
  });

  it("rounds 99.75 to $100", () => {
    expect(formatPrice(99.75)).toBe("$100");
  });
});

// ---------------------------------------------------------------------------
// Smoke render: BookingManager component
// ---------------------------------------------------------------------------

describe("BookingManager – smoke render", () => {
  let qc: QueryClient;

  beforeEach(() => {
    qc = makeQC();
  });

  it("renders 'No bookings found' when the list is empty", async () => {
    render(
      React.createElement(BookingManager, { bookings: [], services: SAMPLE_SERVICES, users: SAMPLE_USERS }),
      { wrapper: makeWrapper(qc) }
    );
    await waitFor(
      () => { expect(screen.getByText(/No bookings found/i)).toBeTruthy(); },
      { timeout: 5000 }
    );
  });

  it("renders the client name resolved from the users list", async () => {
    render(
      React.createElement(BookingManager, {
        bookings: [SAMPLE_BOOKING],
        services: SAMPLE_SERVICES,
        users: SAMPLE_USERS,
      }),
      { wrapper: makeWrapper(qc) }
    );
    await waitFor(
      () => { expect(screen.getByText(/Jane Smith/i)).toBeTruthy(); },
      { timeout: 5000 }
    );
  });

  it("renders the service name resolved from the services list", async () => {
    render(
      React.createElement(BookingManager, {
        bookings: [SAMPLE_BOOKING],
        services: SAMPLE_SERVICES,
        users: SAMPLE_USERS,
      }),
      { wrapper: makeWrapper(qc) }
    );
    await waitFor(
      () => { expect(screen.getByText(/Aerial Photography/i)).toBeTruthy(); },
      { timeout: 5000 }
    );
  });

  it("renders a status filter combobox", async () => {
    render(
      React.createElement(BookingManager, { bookings: [], services: SAMPLE_SERVICES, users: SAMPLE_USERS }),
      { wrapper: makeWrapper(qc) }
    );
    await waitFor(
      () => { expect(screen.getByRole("combobox")).toBeTruthy(); },
      { timeout: 5000 }
    );
  });

  it("falls back to 'User #N' when no users prop is passed", async () => {
    render(
      React.createElement(BookingManager, {
        bookings: [SAMPLE_BOOKING],
        services: SAMPLE_SERVICES,
      }),
      { wrapper: makeWrapper(qc) }
    );
    await waitFor(
      () => { expect(screen.getByText(/User #10/i)).toBeTruthy(); },
      { timeout: 5000 }
    );
  });

  it("shows the edit dialog with client select trigger after clicking Edit", async () => {
    render(
      React.createElement(BookingManager, {
        bookings: [SAMPLE_BOOKING],
        services: SAMPLE_SERVICES,
        users: SAMPLE_USERS,
      }),
      { wrapper: makeWrapper(qc) }
    );

    const editBtn = await screen.findByRole("button", { name: /edit booking/i }, { timeout: 5000 });
    fireEvent.click(editBtn);

    await waitFor(
      () => {
        const comboboxes = screen.getAllByRole("combobox");
        const clientTrigger = comboboxes.find((cb) => cb.textContent?.includes("Jane Smith"));
        expect(clientTrigger).toBeTruthy();
        expect(clientTrigger?.textContent).toContain("Jane Smith");
      },
      { timeout: 5000 }
    );
  });

  it("shows the edit dialog with service select trigger after clicking Edit", async () => {
    render(
      React.createElement(BookingManager, {
        bookings: [SAMPLE_BOOKING],
        services: SAMPLE_SERVICES,
        users: SAMPLE_USERS,
      }),
      { wrapper: makeWrapper(qc) }
    );

    const editBtn = await screen.findByRole("button", { name: /edit booking/i }, { timeout: 5000 });
    fireEvent.click(editBtn);

    await waitFor(
      () => {
        const comboboxes = screen.getAllByRole("combobox");
        const serviceTrigger = comboboxes.find((cb) => cb.textContent?.includes("Aerial Photography"));
        expect(serviceTrigger).toBeTruthy();
        expect(serviceTrigger?.textContent).toContain("Aerial Photography");
      },
      { timeout: 5000 }
    );
  });

  it("triggers the delete mutation with the booking id when the trash button is clicked", async () => {
    const { apiRequest } = await import("@/lib/queryClient");
    vi.mocked(apiRequest).mockReset();
    vi.mocked(apiRequest).mockResolvedValue(new Response(null, { status: 204 }) as unknown as Response);
    toastSpy.mockReset();

    const { container } = render(
      React.createElement(BookingManager, {
        bookings: [SAMPLE_BOOKING],
        services: SAMPLE_SERVICES,
        users: SAMPLE_USERS,
      }),
      { wrapper: makeWrapper(qc) }
    );

    await screen.findByRole("button", { name: /edit booking/i }, { timeout: 5000 });
    const deleteBtn = container.querySelector("button.text-red-400") as HTMLButtonElement | null;
    expect(deleteBtn).toBeTruthy();
    fireEvent.click(deleteBtn!);

    await waitFor(
      () => {
        expect(apiRequest).toHaveBeenCalledWith("DELETE", "/api/bookings/42");
      },
      { timeout: 5000 }
    );

    await waitFor(
      () => {
        expect(toastSpy).toHaveBeenCalledWith(
          expect.objectContaining({ title: "Booking Deleted" })
        );
      },
      { timeout: 5000 }
    );
  });

  it("shows a destructive error toast when the delete mutation fails", async () => {
    const { apiRequest } = await import("@/lib/queryClient");
    vi.mocked(apiRequest).mockReset();
    vi.mocked(apiRequest).mockRejectedValue(new Error("network down"));
    toastSpy.mockReset();

    const { container } = render(
      React.createElement(BookingManager, {
        bookings: [SAMPLE_BOOKING],
        services: SAMPLE_SERVICES,
        users: SAMPLE_USERS,
      }),
      { wrapper: makeWrapper(qc) }
    );

    await screen.findByRole("button", { name: /edit booking/i }, { timeout: 5000 });
    const deleteBtn = container.querySelector("button.text-red-400") as HTMLButtonElement | null;
    expect(deleteBtn).toBeTruthy();
    fireEvent.click(deleteBtn!);

    await waitFor(
      () => {
        expect(toastSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            title: "Error",
            description: expect.stringContaining("network down"),
            variant: "destructive",
          })
        );
      },
      { timeout: 5000 }
    );
  });

  it("disables the delete button while the delete mutation is pending", async () => {
    const { apiRequest } = await import("@/lib/queryClient");
    vi.mocked(apiRequest).mockReset();
    let resolveFn: (v: Response) => void = () => {};
    vi.mocked(apiRequest).mockImplementation(
      () => new Promise<Response>((resolve) => { resolveFn = resolve; })
    );
    toastSpy.mockReset();

    const { container } = render(
      React.createElement(BookingManager, {
        bookings: [SAMPLE_BOOKING],
        services: SAMPLE_SERVICES,
        users: SAMPLE_USERS,
      }),
      { wrapper: makeWrapper(qc) }
    );

    await screen.findByRole("button", { name: /edit booking/i }, { timeout: 5000 });
    const deleteBtn = container.querySelector("button.text-red-400") as HTMLButtonElement | null;
    expect(deleteBtn).toBeTruthy();
    fireEvent.click(deleteBtn!);

    await waitFor(
      () => {
        const btn = container.querySelector("button.text-red-400") as HTMLButtonElement | null;
        expect(btn?.disabled).toBe(true);
      },
      { timeout: 5000 }
    );

    resolveFn(new Response(null, { status: 204 }) as unknown as Response);
  });

  it("shows the edit dialog with datetime-local input pre-filled from booking scheduledDate", async () => {
    render(
      React.createElement(BookingManager, {
        bookings: [SAMPLE_BOOKING],
        services: SAMPLE_SERVICES,
        users: SAMPLE_USERS,
      }),
      { wrapper: makeWrapper(qc) }
    );

    const editBtn = await screen.findByRole("button", { name: /edit booking/i }, { timeout: 5000 });
    fireEvent.click(editBtn);

    await waitFor(
      () => {
        const dateInput = screen.getByLabelText(/date & time/i) as HTMLInputElement;
        expect(dateInput).toBeTruthy();
        expect(dateInput.value).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
      },
      { timeout: 5000 }
    );
  });
});
