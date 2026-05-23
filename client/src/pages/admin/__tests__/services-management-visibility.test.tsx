import React from "react";
import { render, screen, waitFor, act, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HelmetProvider } from "react-helmet-async";
import ServicesManagement from "../services-management";

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock("@/lib/queryClient", () => ({
  apiRequest: vi.fn(),
  queryClient: { invalidateQueries: vi.fn() },
  getQueryFn: vi.fn(),
}));

const VISIBLE_SERVICE: Record<string, unknown> = {
  id: 100,
  name: "Visible Aerial Photo Service",
  slug: "visible-aerial-photo",
  description: "A service that is visible to clients",
  tooltipDescription: null,
  aboutServiceContent: null,
  imageUrl: "/img/visible.jpg",
  videoUrl: null,
  videoPlayback: "hover",
  price: 19900,
  minPrice: 0,
  maxPrice: 0,
  unitType: "unit",
  basePriceQuantity: 1,
  additionalPricePerUnit: 0,
  pricingDescription: null,
  features: [],
  whatsIncludedContent: [],
  possibilities: [],
  processSteps: [],
  classification: "Revenue Generation",
  pricingType: "flat",
  category: "Real Estate & Marketing",
  isSubscription: false,
  weeklySubscriptionEnabled: false,
  weeklyPrice: null,
  weeklyPriceType: "fixed",
  weeklyPercentage: 0,
  biWeeklySubscriptionEnabled: false,
  biWeeklyPrice: null,
  biWeeklyPriceType: "fixed",
  biWeeklyPercentage: 0,
  monthlySubscriptionEnabled: false,
  monthlyPrice: null,
  monthlyPriceType: "fixed",
  monthlyPercentage: 0,
  billingFrequency: null,
  frequencyDetails: null,
  displayOrder: 1,
  keywords: [],
  metaTitle: null,
  metaDescription: null,
  isActive: true,
  hideFromServicesPage: false,
  pricingTiers: [],
  availableAddOns: [],
  bundleRecommendations: [],
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z",
};

const HIDDEN_SERVICE: Record<string, unknown> = {
  ...VISIBLE_SERVICE,
  id: 101,
  name: "Hidden Internal Service",
  slug: "hidden-internal",
  hideFromServicesPage: true,
};

function makeWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(
      HelmetProvider,
      null,
      React.createElement(QueryClientProvider, { client: queryClient }, children)
    );
  };
}

function seedQC(qc: QueryClient) {
  qc.setQueryData(["/api/services"], [VISIBLE_SERVICE, HIDDEN_SERVICE]);
  qc.setQueryData(["/api/addons"], []);
  qc.setQueryData(["/api/service-addons"], []);
}

describe("ServicesManagement – per-service visibility", () => {
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

  it("shows the 'Hidden from clients' switch checked only for services with hideFromServicesPage=true", async () => {
    render(
      React.createElement(ServicesManagement, null),
      { wrapper: makeWrapper(qc) }
    );

    await screen.findByText("Hidden Internal Service", {}, { timeout: 5000 });
    await screen.findByText("Visible Aerial Photo Service", {}, { timeout: 5000 });

    const hiddenSwitch = screen.getByTestId(`switch-hide-from-services-${HIDDEN_SERVICE.id}`);
    const visibleSwitch = screen.getByTestId(`switch-hide-from-services-${VISIBLE_SERVICE.id}`);
    expect(hiddenSwitch).toBeChecked();
    expect(visibleSwitch).not.toBeChecked();
  });

  async function openEditDialogForService(name: string) {
    const heading = await screen.findByText(name, {}, { timeout: 5000 });
    const card = heading.closest("[class*='rounded-lg']") || heading.closest("div");
    expect(card).not.toBeNull();
    const iconBtns = Array.from((card as HTMLElement).querySelectorAll("button")).filter(
      (btn) => btn.querySelector("svg") !== null && btn.textContent?.trim() === ""
    );
    expect(iconBtns.length).toBeGreaterThanOrEqual(1);
    await act(async () => { fireEvent.click(iconBtns[0]); });
    await waitFor(() => expect(screen.getByRole("dialog")).toBeInTheDocument(), { timeout: 5000 });
  }

  it("'Visible to clients' switch reflects !hideFromServicesPage when editing a hidden service", async () => {
    render(
      React.createElement(ServicesManagement, null),
      { wrapper: makeWrapper(qc) }
    );

    await openEditDialogForService("Hidden Internal Service");
    const sw = await screen.findByTestId("switch-visible-to-clients");
    expect(sw).toBeInTheDocument();
    expect(sw.getAttribute("aria-checked")).toBe("false");
  });

  it("'Visible to clients' switch reflects !hideFromServicesPage when editing a visible service", async () => {
    render(
      React.createElement(ServicesManagement, null),
      { wrapper: makeWrapper(qc) }
    );

    await openEditDialogForService("Visible Aerial Photo Service");
    const sw = await screen.findByTestId("switch-visible-to-clients");
    expect(sw).toBeInTheDocument();
    expect(sw.getAttribute("aria-checked")).toBe("true");
  });
});
