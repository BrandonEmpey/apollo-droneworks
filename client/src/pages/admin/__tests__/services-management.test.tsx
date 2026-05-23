import React from "react";
import { render, screen, waitFor, act, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HelmetProvider } from "react-helmet-async";
import ServicesManagement from "../services-management";
import { apiRequest } from "@/lib/queryClient";

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock("@/lib/queryClient", () => ({
  apiRequest: vi.fn(),
  queryClient: { invalidateQueries: vi.fn() },
  getQueryFn: vi.fn(),
}));

const SERVICE_PER_UNIT: Record<string, unknown> = {
  id: 10,
  name: "Roof Inspection",
  slug: "roof-inspection",
  description: "Professional roof drone inspection",
  tooltipDescription: null,
  aboutServiceContent: null,
  imageUrl: "/img/roof.jpg",
  videoUrl: null,
  videoPlayback: "hover",
  price: 29900,
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
  pricingType: "per_unit",
  category: "Property Inspections",
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
  pricingTiers: [],
  availableAddOns: [],
  bundleRecommendations: [],
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z",
};

const SERVICE_TIERED: Record<string, unknown> = {
  ...SERVICE_PER_UNIT,
  id: 11,
  name: "Aerial Photography Package",
  slug: "aerial-photography",
  pricingType: "tiered",
  classification: "Overhead Reduction",
  price: 49900,
};

const TIER_WITH_FEATURES = {
  id: 1,
  name: "Standard",
  quantityType: "range",
  minQuantity: 1,
  maxQuantity: 5,
  exactQuantity: null,
  quantityUnit: "acres",
  price: 29900,
  priceType: "fixed",
  minPrice: null,
  maxPrice: null,
  description: "Standard aerial package",
  deliverables: [],
  features: ["4K aerial video", "Same-day delivery"],
  isPopular: true,
  displayOrder: 0,
};

const SERVICE_WITH_TIERS: Record<string, unknown> = {
  ...SERVICE_PER_UNIT,
  id: 12,
  name: "Tiered Aerial Package",
  slug: "tiered-aerial",
  pricingType: "tiered",
  pricingTiers: [TIER_WITH_FEATURES],
};

const SERVICE_WITH_EMPTY_TIERS: Record<string, unknown> = {
  ...SERVICE_PER_UNIT,
  id: 13,
  name: "Empty Tier Service",
  slug: "empty-tier",
  pricingType: "tiered",
  pricingTiers: [
    {
      ...TIER_WITH_FEATURES,
      id: 2,
      features: [],
      isPopular: false,
    },
  ],
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

function seedQC(qc: QueryClient, services: Record<string, unknown>[] = []) {
  qc.setQueryData(["/api/services"], services);
  qc.setQueryData(["/api/addons"], []);
  qc.setQueryData(["/api/service-addons"], []);
}

async function openEditDialog(serviceName: string) {
  await screen.findByText(serviceName, {}, { timeout: 5000 });
  const allBtns = screen.getAllByRole("button");
  const iconOnlyBtns = allBtns.filter(
    (btn) => btn.querySelector("svg") !== null && btn.textContent?.trim() === ""
  );
  expect(iconOnlyBtns.length).toBeGreaterThan(0);
  await act(async () => { fireEvent.click(iconOnlyBtns[0]); });
  await waitFor(() => expect(screen.getByRole("dialog")).toBeInTheDocument(), { timeout: 3000 });
}

async function expandTierByName(tierName: string) {
  await waitFor(
    () => {
      const matches = screen.queryAllByText(tierName);
      expect(matches.length).toBeGreaterThan(0);
    },
    { timeout: 8000 }
  );
  const allMatches = screen.queryAllByText(tierName);
  const h4Match = allMatches.find((el) => el.tagName === "H4");
  const toClick = h4Match ?? allMatches[0];
  if (toClick) {
    await act(async () => { fireEvent.click(toClick); });
  }
}

async function clickSaveChanges() {
  const saveBtn = await screen.findByRole("button", { name: /save changes/i }, { timeout: 3000 });
  await act(async () => { fireEvent.click(saveBtn); });
}

describe("ServicesManagement – tier features and Popular badge round-trip", () => {
  let qc: QueryClient;
  let mockApiReq: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    qc = new QueryClient({
      defaultOptions: {
        queries: { retry: false, staleTime: Infinity },
        mutations: { retry: false },
      },
    });
    mockApiReq = vi.mocked(apiRequest);
    mockApiReq.mockReset();
    mockApiReq.mockResolvedValue({ ok: true, text: async () => "{}" } as unknown as Response);
  });

  it("existing tier features and isPopular survive an unrelated edit and save", async () => {
    seedQC(qc, [SERVICE_WITH_TIERS]);

    render(React.createElement(ServicesManagement, null), { wrapper: makeWrapper(qc) });

    await openEditDialog("Tiered Aerial Package");

    await waitFor(
      () => {
        const matches = screen.queryAllByText("Standard");
        expect(matches.length).toBeGreaterThan(0);
      },
      { timeout: 8000 }
    );

    const dialog = screen.getByRole("dialog");
    const descriptionInputs = Array.from(dialog.querySelectorAll("textarea"));
    if (descriptionInputs.length > 0) {
      await act(async () => {
        fireEvent.change(descriptionInputs[0], {
          target: { value: "Updated description — unrelated to tier metadata" },
        });
      });
    }

    await clickSaveChanges();

    await waitFor(() => expect(mockApiReq).toHaveBeenCalled(), { timeout: 8000 });

    const [method, url, payload] = mockApiReq.mock.calls[0] as [string, string, Record<string, unknown>];
    expect(method).toBe("PATCH");
    expect(url).toContain(`/api/services/${SERVICE_WITH_TIERS.id}`);

    const tiers = (payload.pricingTiers as Array<Record<string, unknown>>);
    expect(Array.isArray(tiers)).toBe(true);
    expect(tiers.length).toBeGreaterThan(0);
    expect(tiers[0].features).toEqual(["4K aerial video", "Same-day delivery"]);
    expect(tiers[0].isPopular).toBe(true);
  }, 30000);

  it("newly added tier feature and toggled Popular badge appear in the save payload", async () => {
    seedQC(qc, [SERVICE_WITH_EMPTY_TIERS]);

    render(React.createElement(ServicesManagement, null), { wrapper: makeWrapper(qc) });

    await openEditDialog("Empty Tier Service");

    await expandTierByName("Standard");

    await waitFor(
      () => expect(screen.getByTestId("button-add-tier-feature-0")).toBeInTheDocument(),
      { timeout: 5000 }
    );

    await act(async () => {
      fireEvent.click(screen.getByTestId("button-add-tier-feature-0"));
    });

    await waitFor(
      () => expect(screen.getByTestId("input-tier-feature-0-0")).toBeInTheDocument(),
      { timeout: 5000 }
    );

    await act(async () => {
      fireEvent.change(screen.getByTestId("input-tier-feature-0-0"), {
        target: { value: "HD aerial imagery" },
      });
    });

    await act(async () => {
      fireEvent.click(screen.getByTestId("checkbox-tier-popular-0"));
    });

    await clickSaveChanges();

    await waitFor(() => expect(mockApiReq).toHaveBeenCalled(), { timeout: 8000 });

    const [method, url, payload] = mockApiReq.mock.calls[0] as [string, string, Record<string, unknown>];
    expect(method).toBe("PATCH");
    expect(url).toContain(`/api/services/${SERVICE_WITH_EMPTY_TIERS.id}`);

    const tiers = (payload.pricingTiers as Array<Record<string, unknown>>);
    expect(Array.isArray(tiers)).toBe(true);
    expect(tiers.length).toBeGreaterThan(0);
    expect(tiers[0].features).toContain("HD aerial imagery");
    expect(tiers[0].isPopular).toBe(true);
  }, 30000);
});

describe("ServicesManagement – disclaimer preview updates live", () => {
  let qc: QueryClient;
  let mockApiReq: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    qc = new QueryClient({
      defaultOptions: {
        queries: { retry: false, staleTime: Infinity },
        mutations: { retry: false },
      },
    });
    mockApiReq = vi.mocked(apiRequest);
    mockApiReq.mockReset();
    mockApiReq.mockResolvedValue({ ok: true, text: async () => "{}" } as unknown as Response);
  });

  it("preview panel appears when disclaimer text is entered", async () => {
    seedQC(qc, [SERVICE_PER_UNIT]);
    render(React.createElement(ServicesManagement, null), { wrapper: makeWrapper(qc) });

    await openEditDialog("Roof Inspection");

    const dialog = screen.getByRole("dialog");

    expect(screen.queryByText("Preview disclaimer")).not.toBeInTheDocument();

    const textareas = Array.from(dialog.querySelectorAll("textarea"));
    const disclaimerTextarea = textareas.find(
      (ta) => ta.placeholder?.toLowerCase().includes("disclaimer")
    );
    expect(disclaimerTextarea).toBeTruthy();

    await act(async () => {
      fireEvent.change(disclaimerTextarea!, {
        target: { value: "Weather-dependent scheduling applies." },
      });
    });

    await waitFor(() => {
      expect(screen.getByText("Preview disclaimer")).toBeInTheDocument();
    }, { timeout: 3000 });
  }, 30000);

  it("preview renders the trimmed value — leading/trailing whitespace is stripped", async () => {
    seedQC(qc, [SERVICE_PER_UNIT]);
    render(React.createElement(ServicesManagement, null), { wrapper: makeWrapper(qc) });

    await openEditDialog("Roof Inspection");

    const dialog = screen.getByRole("dialog");
    const textareas = Array.from(dialog.querySelectorAll("textarea"));
    const disclaimerTextarea = textareas.find(
      (ta) => ta.placeholder?.toLowerCase().includes("disclaimer")
    );
    expect(disclaimerTextarea).toBeTruthy();

    await act(async () => {
      fireEvent.change(disclaimerTextarea!, {
        target: { value: "  FAA waiver required.  " },
      });
    });

    await waitFor(() => {
      const previewLabel = screen.getByText("Preview disclaimer");
      expect(previewLabel).toBeInTheDocument();
      const previewBlock = previewLabel.closest(".space-y-1");
      const contentParagraph = previewBlock?.querySelector("p.whitespace-pre-line");
      expect(contentParagraph).toBeTruthy();
      expect(contentParagraph!.textContent).toBe("FAA waiver required.");
    }, { timeout: 3000 });
  }, 30000);

  it("preview panel disappears when the disclaimer field is cleared", async () => {
    seedQC(qc, [SERVICE_PER_UNIT]);
    render(React.createElement(ServicesManagement, null), { wrapper: makeWrapper(qc) });

    await openEditDialog("Roof Inspection");

    const dialog = screen.getByRole("dialog");
    const textareas = Array.from(dialog.querySelectorAll("textarea"));
    const disclaimerTextarea = textareas.find(
      (ta) => ta.placeholder?.toLowerCase().includes("disclaimer")
    );
    expect(disclaimerTextarea).toBeTruthy();

    await act(async () => {
      fireEvent.change(disclaimerTextarea!, {
        target: { value: "Some disclaimer text." },
      });
    });
    await waitFor(() => {
      expect(screen.getByText("Preview disclaimer")).toBeInTheDocument();
    }, { timeout: 3000 });

    await act(async () => {
      fireEvent.change(disclaimerTextarea!, { target: { value: "" } });
    });
    await waitFor(() => {
      expect(screen.queryByText("Preview disclaimer")).not.toBeInTheDocument();
    }, { timeout: 3000 });
  }, 30000);

  it("preview panel disappears when disclaimer contains only whitespace", async () => {
    seedQC(qc, [SERVICE_PER_UNIT]);
    render(React.createElement(ServicesManagement, null), { wrapper: makeWrapper(qc) });

    await openEditDialog("Roof Inspection");

    const dialog = screen.getByRole("dialog");
    const textareas = Array.from(dialog.querySelectorAll("textarea"));
    const disclaimerTextarea = textareas.find(
      (ta) => ta.placeholder?.toLowerCase().includes("disclaimer")
    );
    expect(disclaimerTextarea).toBeTruthy();

    await act(async () => {
      fireEvent.change(disclaimerTextarea!, { target: { value: "   " } });
    });
    await waitFor(() => {
      expect(screen.queryByText("Preview disclaimer")).not.toBeInTheDocument();
    }, { timeout: 3000 });
  }, 30000);

  it("preview panel has gold-bordered styling when text is present", async () => {
    seedQC(qc, [SERVICE_PER_UNIT]);
    render(React.createElement(ServicesManagement, null), { wrapper: makeWrapper(qc) });

    await openEditDialog("Roof Inspection");

    const dialog = screen.getByRole("dialog");
    const textareas = Array.from(dialog.querySelectorAll("textarea"));
    const disclaimerTextarea = textareas.find(
      (ta) => ta.placeholder?.toLowerCase().includes("disclaimer")
    );
    expect(disclaimerTextarea).toBeTruthy();

    await act(async () => {
      fireEvent.change(disclaimerTextarea!, {
        target: { value: "Subject to FAA approval." },
      });
    });

    await waitFor(() => {
      const previewLabel = screen.getByText("Preview disclaimer");
      const previewContainer = previewLabel.closest(".space-y-1")?.querySelector("div");
      expect(previewContainer).toBeTruthy();
      expect(previewContainer!.className).toContain("border-gold-dark");
    }, { timeout: 3000 });
  }, 30000);
});

describe("ServicesManagement – service form dropdown-retention", () => {
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

  it("Edit dialog pricingType trigger shows loaded value 'Per Unit'", async () => {
    seedQC(qc, [SERVICE_PER_UNIT]);

    render(
      React.createElement(ServicesManagement, null),
      { wrapper: makeWrapper(qc) }
    );

    await openEditDialog("Roof Inspection");

    const dialog = screen.getByRole("dialog");
    await waitFor(() => {
      const comboboxes = dialog.querySelectorAll('[role="combobox"]');
      const pricingCombobox = Array.from(comboboxes).find(
        (cb) => (cb as HTMLElement).textContent?.includes("Per Unit")
      );
      expect(pricingCombobox).toBeTruthy();
    }, { timeout: 3000 });
  });

  it("Edit dialog classification trigger shows loaded value 'Revenue Generation'", async () => {
    seedQC(qc, [SERVICE_PER_UNIT]);

    render(
      React.createElement(ServicesManagement, null),
      { wrapper: makeWrapper(qc) }
    );

    await openEditDialog("Roof Inspection");

    const dialog = screen.getByRole("dialog");
    await waitFor(() => {
      const comboboxes = dialog.querySelectorAll('[role="combobox"]');
      const classCombobox = Array.from(comboboxes).find(
        (cb) => (cb as HTMLElement).textContent?.includes("Revenue Generation")
      );
      expect(classCombobox).toBeTruthy();
    }, { timeout: 3000 });
  });

  it("pricingType updates when editing a different service (proves value= not defaultValue=)", async () => {
    seedQC(qc, [SERVICE_PER_UNIT, SERVICE_TIERED]);

    render(
      React.createElement(ServicesManagement, null),
      { wrapper: makeWrapper(qc) }
    );

    await screen.findByText("Roof Inspection", {}, { timeout: 5000 });
    await screen.findByText("Aerial Photography Package", {}, { timeout: 5000 });

    const allBtns = screen.getAllByRole("button");
    const iconOnlyBtns = allBtns.filter(
      (btn) => btn.querySelector("svg") !== null && btn.textContent?.trim() === ""
    );

    await act(async () => { fireEvent.click(iconOnlyBtns[0]); });
    await waitFor(() => expect(screen.getByRole("dialog")).toBeInTheDocument(), { timeout: 3000 });
    await waitFor(() => {
      const dialog = screen.getByRole("dialog");
      const comboboxes = dialog.querySelectorAll('[role="combobox"]');
      const pricingCombobox = Array.from(comboboxes).find(
        (cb) => (cb as HTMLElement).textContent?.includes("Per Unit")
      );
      expect(pricingCombobox).toBeTruthy();
    }, { timeout: 3000 });

    const dialog = screen.getByRole("dialog");
    const closeBtn = dialog.querySelector('[data-radix-dialog-close]') as HTMLElement ||
      Array.from(dialog.querySelectorAll("button")).find(b => (b as HTMLElement).getAttribute("data-testid") === "close" || /close/i.test((b as HTMLElement).getAttribute("aria-label") || "")) as HTMLElement;
    if (closeBtn) { await act(async () => { fireEvent.click(closeBtn); }); }
    else {
      const cancelBtn = Array.from(dialog.querySelectorAll("button")).find(b => /cancel/i.test(b.textContent || ""));
      if (cancelBtn) { await act(async () => { fireEvent.click(cancelBtn); }); }
    }

    await act(async () => { fireEvent.click(iconOnlyBtns[1]); });
    await waitFor(() => {
      const dialog2 = screen.getByRole("dialog");
      const comboboxes = dialog2.querySelectorAll('[role="combobox"]');
      const pricingCombobox = Array.from(comboboxes).find(
        (cb) => (cb as HTMLElement).textContent?.includes("Tiered Pricing")
      );
      expect(pricingCombobox).toBeTruthy();
    }, { timeout: 3000 });
  });
});
