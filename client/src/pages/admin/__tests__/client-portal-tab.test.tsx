import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HelmetProvider } from "react-helmet-async";
import ClientOperations from "../client-operations";

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock("@/lib/queryClient", () => ({
  apiRequest: vi.fn(),
  queryClient: { invalidateQueries: vi.fn() },
  getQueryFn: vi.fn(),
}));

vi.mock("@/components/layout/header", () => ({
  default: () => <div data-testid="mock-header" />,
}));

vi.mock("wouter", () => ({
  Link: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useLocation: () => ["/admin/client-portal", vi.fn()],
}));

// The 10 canonical services with real categories from server/init-db.ts
const CANONICAL_SERVICES = [
  { id: 1,  name: "Real Estate Listings",                  category: "Real Estate & Marketing" },
  { id: 2,  name: "Property Tours",                        category: "Real Estate & Marketing" },
  { id: 3,  name: "Promotional Content",                   category: "Real Estate & Marketing" },
  { id: 4,  name: "Roof Inspections",                      category: "Property Inspections"    },
  { id: 5,  name: "Property & Site Evaluation",            category: "Property Inspections"    },
  { id: 6,  name: "Infrastructure & Structure Inspections",category: "Property Inspections"    },
  { id: 7,  name: "Construction Planning & Monitoring",    category: "Mapping & Modeling"      },
  { id: 8,  name: "Aerial Mapping",                        category: "Mapping & Modeling"      },
  { id: 9,  name: "3D Modeling",                           category: "Mapping & Modeling"      },
  { id: 10, name: "Timelapse Creation",                    category: "Mapping & Modeling"      },
].map(s => ({
  ...s,
  slug: s.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
  description: "Test description",
  price: 10000,
  pricingType: "flat",
  isActive: true,
  features: [],
  availableAddOns: [],
}));

const MOCK_CUSTOMERS = [
  { id: 1, firstName: "Jane", lastName: "Doe", email: "jane@example.com", phone: null, company: null, status: "active" },
];

function makeWrapper(qc: QueryClient) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(
      HelmetProvider,
      null,
      React.createElement(QueryClientProvider, { client: qc }, children)
    );
  };
}

function makeQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

describe("Client Portal tab — service picker", () => {
  let qc: QueryClient;

  beforeEach(() => {
    qc = makeQueryClient();
    qc.setQueryData(["/api/services"], CANONICAL_SERVICES);
    qc.setQueryData(["/api/crm/customers"], MOCK_CUSTOMERS);
  });

  it("shows all 10 canonical service checkboxes after clicking New Project", async () => {
    render(<ClientOperations />, { wrapper: makeWrapper(qc) });

    // The client-portal tab should be active (URL is /admin/client-portal)
    // Click "New Project" to reveal the service picker form
    const newProjectButton = screen.getAllByRole("button", { name: /new project/i })[0];
    fireEvent.click(newProjectButton);

    // All 10 canonical service names should appear as labels next to checkboxes
    await waitFor(() => {
      for (const svc of CANONICAL_SERVICES) {
        expect(screen.getByText(svc.name)).toBeInTheDocument();
      }
    });

    // Also confirm exactly 10 checkboxes are present in the service picker
    const checkboxes = screen.getAllByRole("checkbox");
    expect(checkboxes).toHaveLength(10);
  });
});
