import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
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
    user: { id: 1, username: "janedoe", firstName: "Jane", email: "jane@example.com", isAdmin: false },
  }),
}));

const mockSetLocation = vi.fn();

vi.mock("wouter", () => ({
  Link: ({ children, href }: { children: React.ReactNode; href: string }) =>
    React.createElement("a", { href }, children),
  useLocation: () => ["/booking", mockSetLocation],
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

vi.mock("@/components/ui/booking-calendar", () => ({
  BookingCalendar: ({ selectedDate }: { selectedDate?: Date; onDateSelect: (d: Date) => void }) =>
    React.createElement(
      "div",
      { "data-testid": "booking-calendar" },
      React.createElement(
        "span",
        { "data-testid": "calendar-selected-date" },
        selectedDate ? selectedDate.toISOString() : "",
      ),
    ),
}));

import BookingPage from "../booking-page";

const mockServices = [
  { id: 1, name: "Aerial Photography", price: 29900, description: "Photo", imageUrl: "/i.jpg", hideFromServicesPage: false },
  { id: 7, name: "Free Consultation", price: 0, description: "Free", imageUrl: "/c.jpg", hideFromServicesPage: false },
];

// 2027-06-15 at 10:00 in local time so format(d, 'h:mm a') yields "10:00 AM"
const scheduledDate = new Date(2027, 5, 15, 10, 0, 0);

const mockEditBooking = {
  id: 42,
  userId: 1,
  serviceId: 1,
  scheduledDate,
  date: scheduledDate,
  projectName: "Downtown Condo",
  projectLocation: "123 Main St, St. George, UT",
  notes: "Please arrive on time",
  selectedServices: [1],
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
  qc.setQueryData(["/api/services"], mockServices);
  qc.setQueryData(["/api/bookings", "42"], mockEditBooking);
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: qc }, children);
  };
}

describe("BookingPage - edit mode prefill", () => {
  beforeEach(() => {
    mockApiRequest.mockReset();
    mockInvalidateQueries.mockReset();
    mockSetLocation.mockReset();
    window.history.pushState({}, "", "/booking?edit=42");
  });

  it("prefills form fields with the existing booking data", async () => {
    render(React.createElement(BookingPage, null), { wrapper: makeWrapper() });

    await waitFor(() => {
      const inputs = screen.getAllByPlaceholderText(
        "Enter a name for your project",
      ) as HTMLInputElement[];
      expect(inputs.length).toBeGreaterThan(0);
      inputs.forEach((input) => expect(input.value).toBe("Downtown Condo"));
    });

    const addressInput = screen.getByPlaceholderText("Enter the full address") as HTMLInputElement;
    expect(addressInput.value).toBe("123 Main St, St. George, UT");

    const notesInput = screen.getByPlaceholderText(
      "Any special requirements or details we should know",
    ) as HTMLTextAreaElement;
    expect(notesInput.value).toBe("Please arrive on time");

    const calendarDate = screen.getByTestId("calendar-selected-date");
    expect(calendarDate.textContent).toBe(scheduledDate.toISOString());

    expect(screen.getAllByText("10:00 AM").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Aerial Photography").length).toBeGreaterThan(0);

    expect(screen.getByRole("button", { name: /save changes/i })).toBeInTheDocument();
  });

  // Note: Task #168's acceptance criteria mentioned PATCH, but the booking
  // page (`booking-page.tsx`) and the server route
  // (`app.put("/api/bookings/:id", ...)` in `server/routes.ts`) both use PUT.
  // We assert the actual implementation method here.
  it("submits an update request to /api/bookings/42 when Save Changes is clicked", async () => {
    mockApiRequest.mockResolvedValue({
      ok: true,
      json: async () => ({ ...mockEditBooking }),
    });

    const user = userEvent.setup();
    render(React.createElement(BookingPage, null), { wrapper: makeWrapper() });

    const saveBtn = await screen.findByRole("button", { name: /save changes/i });
    await waitFor(() => {
      const inputs = screen.getAllByPlaceholderText(
        "Enter a name for your project",
      ) as HTMLInputElement[];
      expect(inputs[0].value).toBe("Downtown Condo");
    });

    await user.click(saveBtn);

    await waitFor(() => {
      expect(mockApiRequest).toHaveBeenCalledWith(
        "PUT",
        "/api/bookings/42",
        expect.objectContaining({
          serviceId: 1,
          projectName: "Downtown Condo",
          projectLocation: "123 Main St, St. George, UT",
          notes: "Please arrive on time",
          selectedServices: [1],
        }),
      );
    });
  });
});
