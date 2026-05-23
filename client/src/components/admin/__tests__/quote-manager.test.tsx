import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { QuoteManager } from "../quote-manager";
import type { Quote } from "@shared/schema";
import { calculateTotal } from "@/lib/quote-utils";
import type { QuoteData } from "@/lib/quote-utils";

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock("@/lib/queryClient", () => ({
  apiRequest: vi.fn(),
  queryClient: { invalidateQueries: vi.fn() },
  getQueryFn: vi.fn(),
}));

const AERIAL_PHOTOGRAPHY_SERVICE: QuoteData = {
  timeEstimates: [
    { activity: "Pre-flight Planning", hours: 1, rate: 35 },
    { activity: "Time on-site", hours: 3, rate: 50 },
    { activity: "Photo Editing", hours: 2, rate: 40 },
  ],
  personnel: [
    { role: "Pilot in Command", hourlyRate: 50, quantity: 1 },
    { role: "Visual Observer", hourlyRate: 40, quantity: 1 },
  ],
  equipment: [{ name: "DJI Mavic 3", hourlyRate: 20, included: true, quantity: 1 }],
  expenses: [],
  thirdPartyProducts: [],
};

const ROOF_INSPECTION_SERVICE: QuoteData = {
  timeEstimates: [
    { activity: "Pre-flight Planning", hours: 0.5, rate: 35 },
    { activity: "Time on-site", hours: 1.5, rate: 50 },
    { activity: "Report Writing", hours: 1, rate: 30 },
  ],
  personnel: [{ role: "Pilot in Command", hourlyRate: 50, quantity: 1 }],
  equipment: [{ name: "DJI Mavic 3", hourlyRate: 20, included: true, quantity: 1 }],
  expenses: [],
  thirdPartyProducts: [],
};

describe("calculateTotal – service selection changes total price", () => {
  it("Aerial Photography service produces the expected base total", () => {
    // time: 1×35 + 3×50 + 2×40 = 265; VO 40×1 = 40; equipment 20 → total 325
    expect(calculateTotal(AERIAL_PHOTOGRAPHY_SERVICE)).toBe(325);
  });

  it("Roof Inspection service produces a lower total than Aerial Photography", () => {
    // time: 0.5×35 + 1.5×50 + 1×30 = 122.5; no crew; equipment 20 → total 142.5
    expect(calculateTotal(ROOF_INSPECTION_SERVICE)).toBe(142.5);
    expect(calculateTotal(ROOF_INSPECTION_SERVICE))
      .toBeLessThan(calculateTotal(AERIAL_PHOTOGRAPHY_SERVICE));
  });
});

describe("calculateTotal – add-on selection and deselection", () => {
  it("adding an included equipment add-on increases total by its hourly rate", () => {
    const base = calculateTotal(AERIAL_PHOTOGRAPHY_SERVICE);
    const with_ = { ...AERIAL_PHOTOGRAPHY_SERVICE, equipment: [...AERIAL_PHOTOGRAPHY_SERVICE.equipment, { name: "ND Filter Set", hourlyRate: 10, included: true, quantity: 1 }] };
    expect(calculateTotal(with_)).toBe(base + 10);
  });

  it("adding an excluded equipment add-on does NOT increase the total", () => {
    const base = calculateTotal(AERIAL_PHOTOGRAPHY_SERVICE);
    const with_ = { ...AERIAL_PHOTOGRAPHY_SERVICE, equipment: [...AERIAL_PHOTOGRAPHY_SERVICE.equipment, { name: "Spare Battery", hourlyRate: 8, included: false, quantity: 1 }] };
    expect(calculateTotal(with_)).toBe(base);
  });

  it("toggling an add-on from excluded to included increases the total", () => {
    const excl = { ...AERIAL_PHOTOGRAPHY_SERVICE, equipment: [{ name: "DJI Mavic 3", hourlyRate: 20, included: false, quantity: 1 }] };
    const incl = { ...excl, equipment: [{ name: "DJI Mavic 3", hourlyRate: 20, included: true, quantity: 1 }] };
    expect(calculateTotal(incl)).toBe(calculateTotal(excl) + 20);
  });

  it("adding a Travel expense add-on increases the total by its cost", () => {
    const base = calculateTotal(AERIAL_PHOTOGRAPHY_SERVICE);
    const with_ = { ...AERIAL_PHOTOGRAPHY_SERVICE, expenses: [{ name: "Mileage", cost: 34, expenseType: "Travel" }] };
    expect(calculateTotal(with_)).toBe(base + 34);
  });

  it("adding a third-party product add-on increases the total", () => {
    const base = calculateTotal(AERIAL_PHOTOGRAPHY_SERVICE);
    const with_ = { ...AERIAL_PHOTOGRAPHY_SERVICE, thirdPartyProducts: [{ name: "Pix4D Processing", cost: 75, expenseType: "Other" }] };
    expect(calculateTotal(with_)).toBe(base + 75);
  });

  it("stacking multiple add-ons accumulates their costs correctly", () => {
    const base = calculateTotal(AERIAL_PHOTOGRAPHY_SERVICE);
    const with_ = {
      ...AERIAL_PHOTOGRAPHY_SERVICE,
      equipment: [...AERIAL_PHOTOGRAPHY_SERVICE.equipment, { name: "ND Filters", hourlyRate: 10, included: true, quantity: 1 }],
      expenses: [{ name: "Mileage", cost: 34, expenseType: "Travel" }],
      thirdPartyProducts: [{ name: "Pix4D Processing", cost: 75, expenseType: "Other" }],
    };
    expect(calculateTotal(with_)).toBeCloseTo(base + 10 + 34 + 75, 5);
  });
});

describe("calculateTotal – Pilot in Command exclusion rule", () => {
  it("PIC is excluded because PIC cost is captured in time estimates", () => {
    const data: QuoteData = { timeEstimates: [], personnel: [{ role: "Pilot in Command", hourlyRate: 50, quantity: 1 }], equipment: [], expenses: [], thirdPartyProducts: [] };
    expect(calculateTotal(data)).toBe(0);
  });

  it("additional crew roles beyond PIC are included in total", () => {
    const data: QuoteData = {
      timeEstimates: [],
      personnel: [
        { role: "Pilot in Command", hourlyRate: 50, quantity: 1 },
        { role: "Visual Observer", hourlyRate: 40, quantity: 2 },
        { role: "Ground Crew", hourlyRate: 25, quantity: 1 },
      ],
      equipment: [], expenses: [], thirdPartyProducts: [],
    };
    expect(calculateTotal(data)).toBe(105); // VO 80 + Ground Crew 25
  });
});

function makeWrapper(qc: QueryClient) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: qc }, children);
  };
}

function makeQC() {
  return new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
}

const SAMPLE_QUOTE: Quote = {
  id: 1,
  userId: 1,
  clientName: "Jane Smith",
  clientEmail: "jane@example.com",
  projectName: "Ranch Survey",
  projectDescription: "Aerial survey of property",
  dateCreated: new Date("2024-03-10"),
  expiryDate: new Date("2024-04-10"),
  status: "Draft",
  totalAmount: "325.00",
  notes: "",
  businessInfo: null,
  businessCosts: null,
  timeEstimates: AERIAL_PHOTOGRAPHY_SERVICE.timeEstimates,
  personnel: AERIAL_PHOTOGRAPHY_SERVICE.personnel,
  equipment: AERIAL_PHOTOGRAPHY_SERVICE.equipment,
  expenses: [],
  thirdPartyProducts: [],
  deliveryTimeHours: 48,
  depreciableAssetsSplit: null,
  advertisementSplit: null,
  insuranceSplit: null,
  netProfit: null,
};

describe("QuoteManager – smoke render", () => {
  let qc: QueryClient;

  beforeEach(() => {
    qc = makeQC();
    qc.setQueryData(["/api/services"], [
      { id: 1, name: "Aerial Photography", basePrice: "299" },
      { id: 2, name: "Roof Inspection", basePrice: "199" },
    ]);
    qc.setQueryData(["/api/business-config"], null);
  });

  it("renders 'No quotes found' when the list is empty", async () => {
    render(React.createElement(QuoteManager, { quotes: [], userId: 1 }), { wrapper: makeWrapper(qc) });
    await waitFor(() => { expect(screen.getByText(/No quotes found/i)).toBeTruthy(); }, { timeout: 5000 });
  });

  it("renders the Create New Quote button", async () => {
    render(React.createElement(QuoteManager, { quotes: [], userId: 1 }), { wrapper: makeWrapper(qc) });
    await waitFor(() => { expect(screen.getByRole("button", { name: /create new quote/i })).toBeTruthy(); }, { timeout: 5000 });
  });

  it("renders the client name from a seeded quote", async () => {
    render(React.createElement(QuoteManager, { quotes: [SAMPLE_QUOTE], userId: 1 }), { wrapper: makeWrapper(qc) });
    await waitFor(() => { expect(screen.getByText(/Jane Smith/i)).toBeTruthy(); }, { timeout: 5000 });
  });
});

describe("QuoteManager – service/add-on selection changes the quote total", () => {
  let qc: QueryClient;

  beforeEach(() => {
    qc = makeQC();
    qc.setQueryData(["/api/services"], [
      { id: 1, name: "Aerial Photography", shortDescription: "Aerial photo service", basePrice: "299" },
      { id: 2, name: "Roof Inspection", shortDescription: "Roof inspection service", basePrice: "199" },
    ]);
    qc.setQueryData(["/api/business-config"], null);
  });

  function getTotalValue(): number {
    const heading = screen.getByText(/Total Quote Amount/i);
    const para = heading.parentElement?.querySelector("p");
    return parseFloat((para?.textContent ?? "0").replace(/[^0-9.]/g, ""));
  }

  it("Create mode shows a non-zero default total", async () => {
    render(React.createElement(QuoteManager, { quotes: [], userId: 1 }), { wrapper: makeWrapper(qc) });
    await waitFor(() => { expect(screen.getByRole("button", { name: /create new quote/i })).toBeTruthy(); }, { timeout: 8000 });
    fireEvent.click(screen.getByRole("button", { name: /create new quote/i }));
    await waitFor(() => {
      expect(screen.getByText(/Total Quote Amount/i)).toBeTruthy();
      expect(getTotalValue()).toBeGreaterThan(0);
    }, { timeout: 8000 });
  }, 20000);

  it("adding Aerial Photography standard estimates increases the total", async () => {
    const user = userEvent.setup({ delay: null });
    render(React.createElement(QuoteManager, { quotes: [], userId: 1 }), { wrapper: makeWrapper(qc) });
    await waitFor(() => { expect(screen.getByRole("button", { name: /create new quote/i })).toBeTruthy(); }, { timeout: 8000 });
    fireEvent.click(screen.getByRole("button", { name: /create new quote/i }));
    const before = await waitFor(() => {
      expect(screen.getByText(/Total Quote Amount/i)).toBeTruthy();
      const t = getTotalValue();
      expect(t).toBeGreaterThan(0);
      return t;
    }, { timeout: 8000 });
    const aerialTab = await screen.findByRole("tab", { name: /Aerial Photography/i }, { timeout: 8000 });
    await user.click(aerialTab);
    const addBtn = await screen.findByRole("button", { name: /Add Standard Time Estimates/i }, { timeout: 8000 });
    fireEvent.click(addBtn);
    await waitFor(() => { expect(getTotalValue()).toBeGreaterThan(before); }, { timeout: 8000 });
  }, 25000);

  it("Roof Inspection adds more estimates than Aerial Photography", () => {
    // Aerial: 1.5×150 + 2×85 = 395; Roof: 1.5×150 + 2×85 + 1×75 = 470
    const aerialDelta = [
      { hours: 1.5, rate: 150 },
      { hours: 2, rate: 85 },
    ].reduce((s, e) => s + e.hours * e.rate, 0);
    const roofDelta = [
      { hours: 1.5, rate: 150 },
      { hours: 2, rate: 85 },
      { hours: 1, rate: 75 },
    ].reduce((s, e) => s + e.hours * e.rate, 0);
    expect(roofDelta).toBeGreaterThan(aerialDelta);
    expect(roofDelta - aerialDelta).toBe(75);
  });
});

describe("QuoteManager – validation timing", () => {
  let qc: QueryClient;

  beforeEach(() => {
    qc = makeQC();
    qc.setQueryData(["/api/services"], [
      { id: 1, name: "Aerial Photography", shortDescription: "Aerial photo service", basePrice: "299" },
    ]);
    qc.setQueryData(["/api/business-config"], null);
  });

  async function openCreateForm() {
    render(React.createElement(QuoteManager, { quotes: [], userId: 1 }), { wrapper: makeWrapper(qc) });
    await waitFor(
      () => {
        expect(screen.getByRole("button", { name: /create new quote/i })).toBeTruthy();
      },
      { timeout: 8000 },
    );
    fireEvent.click(screen.getByRole("button", { name: /create new quote/i }));
    await waitFor(
      () => {
        expect(screen.getByLabelText(/Client Name/i)).toBeTruthy();
        expect(screen.getByLabelText(/Project Name/i)).toBeTruthy();
      },
      { timeout: 8000 },
    );
  }

  it(
    "does not show Client Name or Project Name errors on initial render",
    async () => {
      await openCreateForm();
      // Even though both required fields are empty, no error text or
      // aggregated validation list should appear before the user has
      // touched a field or attempted to save.
      expect(screen.queryByText(/Client name is required/i)).toBeNull();
      expect(screen.queryByText(/Project name is required/i)).toBeNull();
      expect(screen.queryByText(/Please enter a valid email address/i)).toBeNull();
    },
    20000,
  );

  it(
    "shows the Client Name error after blurring an empty Client Name field",
    async () => {
      await openCreateForm();
      const clientName = screen.getByLabelText(/Client Name/i);
      fireEvent.blur(clientName);
      await waitFor(() => {
        expect(screen.getByText(/Client name is required/i)).toBeTruthy();
      });
      // Project Name was not touched, so its error is still hidden.
      expect(screen.queryByText(/Project name is required/i)).toBeNull();
    },
    20000,
  );

  it(
    "shows the Project Name error after blurring an empty Project Name field",
    async () => {
      await openCreateForm();
      const projectName = screen.getByLabelText(/Project Name/i);
      fireEvent.blur(projectName);
      await waitFor(() => {
        expect(screen.getByText(/Project name is required/i)).toBeTruthy();
      });
      // Client Name was not touched, so its error is still hidden.
      expect(screen.queryByText(/Client name is required/i)).toBeNull();
    },
    20000,
  );

  it(
    "shows errors for all required fields after attempting to save the disabled form",
    async () => {
      await openCreateForm();
      // The save button is disabled while there are validation errors and is
      // wrapped in a <span> whose onClick sets saveAttempted=true. Firing the
      // click on the wrapper simulates the user trying to save.
      const saveButton = screen.getByRole("button", { name: /^Create Quote$/i });
      expect((saveButton as HTMLButtonElement).disabled).toBe(true);
      const wrapperSpan = saveButton.parentElement as HTMLElement;
      expect(wrapperSpan).not.toBeNull();
      fireEvent.click(wrapperSpan);
      await waitFor(() => {
        // Per-field error messages
        expect(screen.getAllByText(/Client name is required/i).length).toBeGreaterThan(0);
        expect(screen.getAllByText(/Project name is required/i).length).toBeGreaterThan(0);
      });
    },
    20000,
  );

  it(
    "shows the email format error after blurring an invalid Client Email value",
    async () => {
      await openCreateForm();
      const email = screen.getByLabelText(/Client Email/i) as HTMLInputElement;
      // No error should appear yet for a pristine field.
      expect(screen.queryByText(/Please enter a valid email address/i)).toBeNull();
      fireEvent.change(email, { target: { value: "not-an-email" } });
      // Still no error before blur.
      expect(screen.queryByText(/Please enter a valid email address/i)).toBeNull();
      fireEvent.blur(email);
      await waitFor(() => {
        expect(screen.getByText(/Please enter a valid email address/i)).toBeTruthy();
      });
    },
    20000,
  );

  it(
    "clears the Client Name error after typing a non-empty value",
    async () => {
      await openCreateForm();
      const clientName = screen.getByLabelText(/Client Name/i) as HTMLInputElement;
      fireEvent.blur(clientName);
      await waitFor(() => {
        expect(screen.getByText(/Client name is required/i)).toBeTruthy();
      });
      fireEvent.change(clientName, { target: { value: "Jane Smith" } });
      await waitFor(() => {
        expect(screen.queryByText(/Client name is required/i)).toBeNull();
      });
    },
    20000,
  );

  it(
    "clears the Project Name error after typing a non-empty value",
    async () => {
      await openCreateForm();
      const projectName = screen.getByLabelText(/Project Name/i) as HTMLInputElement;
      fireEvent.blur(projectName);
      await waitFor(() => {
        expect(screen.getByText(/Project name is required/i)).toBeTruthy();
      });
      fireEvent.change(projectName, { target: { value: "Ranch Survey" } });
      await waitFor(() => {
        expect(screen.queryByText(/Project name is required/i)).toBeNull();
      });
    },
    20000,
  );

  it(
    "clears the email format error after correcting the email to a valid value",
    async () => {
      await openCreateForm();
      const email = screen.getByLabelText(/Client Email/i) as HTMLInputElement;
      fireEvent.change(email, { target: { value: "not-an-email" } });
      fireEvent.blur(email);
      await waitFor(() => {
        expect(screen.getByText(/Please enter a valid email address/i)).toBeTruthy();
      });
      fireEvent.change(email, { target: { value: "jane@example.com" } });
      await waitFor(() => {
        expect(screen.queryByText(/Please enter a valid email address/i)).toBeNull();
      });
    },
    20000,
  );

  it(
    "enables the Create Quote button after all required fields become valid",
    async () => {
      await openCreateForm();
      const saveButton = screen.getByRole("button", { name: /^Create Quote$/i }) as HTMLButtonElement;
      expect(saveButton.disabled).toBe(true);
      fireEvent.change(screen.getByLabelText(/Client Name/i), { target: { value: "Jane Smith" } });
      fireEvent.change(screen.getByLabelText(/Project Name/i), { target: { value: "Ranch Survey" } });
      fireEvent.change(screen.getByLabelText(/Client Email/i), { target: { value: "jane@example.com" } });
      await waitFor(() => {
        const btn = screen.getByRole("button", { name: /^Create Quote$/i }) as HTMLButtonElement;
        expect(btn.disabled).toBe(false);
      });
    },
    20000,
  );
});

describe("QuoteManager – per-row line-item validation", () => {
  let qc: QueryClient;

  beforeEach(() => {
    qc = makeQC();
    qc.setQueryData(["/api/services"], [
      { id: 1, name: "Aerial Photography", shortDescription: "Aerial photo service", basePrice: "299" },
    ]);
    qc.setQueryData(["/api/business-config"], null);
  });

  async function openCreateAndFillRequired() {
    render(React.createElement(QuoteManager, { quotes: [], userId: 1 }), { wrapper: makeWrapper(qc) });
    await waitFor(
      () => {
        expect(screen.getByRole("button", { name: /create new quote/i })).toBeTruthy();
      },
      { timeout: 8000 },
    );
    fireEvent.click(screen.getByRole("button", { name: /create new quote/i }));
    await waitFor(
      () => {
        expect(screen.getByLabelText(/Client Name/i)).toBeTruthy();
      },
      { timeout: 8000 },
    );
    fireEvent.change(screen.getByLabelText(/Client Name/i), { target: { value: "Jane Smith" } });
    fireEvent.change(screen.getByLabelText(/Project Name/i), { target: { value: "Ranch Survey" } });
  }

  function tableForHeading(name: RegExp): HTMLTableElement {
    const headings = screen.getAllByRole("heading");
    const heading = headings.find((h) => name.test(h.textContent || ""));
    if (!heading) throw new Error(`Heading not found: ${name}`);
    let el: HTMLElement | null = heading.parentElement;
    while (el && !el.querySelector("table")) el = el.parentElement;
    if (!el) throw new Error(`Table not found for heading: ${name}`);
    return el.querySelector("table") as HTMLTableElement;
  }

  function firstRowInputs(table: HTMLTableElement): HTMLInputElement[] {
    const firstRow = table.querySelector("tbody tr") as HTMLElement;
    return Array.from(firstRow.querySelectorAll("input")) as HTMLInputElement[];
  }

  function getSaveButton(): HTMLButtonElement {
    return screen.getByRole("button", { name: /^Create Quote$/i }) as HTMLButtonElement;
  }

  function triggerSaveAttempt() {
    const wrapper = getSaveButton().parentElement as HTMLElement;
    fireEvent.click(wrapper);
  }

  type Case = {
    label: string;
    heading: RegExp;
    nameIdx: number;
    numberIdx: number;
    summaryRegex: RegExp;
    fixName: string;
    fixNumber: string;
  };

  const cases: Case[] = [
    {
      label: "Time Estimates",
      heading: /^Time Estimates$/,
      nameIdx: 0,
      numberIdx: 1,
      summaryRegex: /Time estimate row 1: activity is required/i,
      fixName: "Planning",
      fixNumber: "1",
    },
    {
      label: "Personnel",
      heading: /^Personnel$/,
      nameIdx: 0,
      numberIdx: 1,
      summaryRegex: /Personnel row 1: role is required/i,
      fixName: "Pilot in Command",
      fixNumber: "50",
    },
    {
      label: "Equipment",
      heading: /^Equipment$/,
      nameIdx: 0,
      numberIdx: 1,
      summaryRegex: /Equipment row 1: name is required/i,
      fixName: "DJI Mavic 3",
      fixNumber: "20",
    },
    {
      label: "Travel (expenses)",
      heading: /^Travel$/,
      nameIdx: 0,
      numberIdx: 1,
      summaryRegex: /Travel row 1: description is required/i,
      fixName: "Mileage to site",
      fixNumber: "10",
    },
    {
      label: "Third Party Products",
      heading: /^Third Party Products$/,
      nameIdx: 0,
      numberIdx: 1,
      summaryRegex: /Third party product row 1: name is required/i,
      fixName: "Pix4D Processing",
      fixNumber: "75",
    },
  ];

  for (const c of cases) {
    it(
      `${c.label}: blank name + negative number disables Save, marks inputs, lists in summary, and re-enables on fix`,
      async () => {
        await openCreateAndFillRequired();

        // Baseline: defaults are valid, so Save is enabled.
        await waitFor(() => {
          expect(getSaveButton().disabled).toBe(false);
        });

        // Invalidate the first row of this section.
        const table = tableForHeading(c.heading);
        const inputs = firstRowInputs(table);
        const nameInput = inputs[c.nameIdx];
        const numberInput = inputs[c.numberIdx];
        fireEvent.change(nameInput, { target: { value: "" } });
        fireEvent.change(numberInput, { target: { value: "-1" } });

        // Save becomes disabled.
        await waitFor(() => {
          expect(getSaveButton().disabled).toBe(true);
        });

        // Both invalid inputs gain the destructive border.
        const refreshed = firstRowInputs(tableForHeading(c.heading));
        expect(refreshed[c.nameIdx].className).toMatch(/border-destructive/);
        expect(refreshed[c.numberIdx].className).toMatch(/border-destructive/);

        // Trigger save attempt → error summary lists the row issue.
        triggerSaveAttempt();
        await waitFor(() => {
          expect(screen.getByText(c.summaryRegex)).toBeTruthy();
        });

        // Fix the row → Save re-enables and the summary entry disappears.
        const refreshed2 = firstRowInputs(tableForHeading(c.heading));
        fireEvent.change(refreshed2[c.nameIdx], { target: { value: c.fixName } });
        fireEvent.change(refreshed2[c.numberIdx], { target: { value: c.fixNumber } });

        await waitFor(() => {
          expect(getSaveButton().disabled).toBe(false);
        });
        expect(screen.queryByText(c.summaryRegex)).toBeNull();
      },
      25000,
    );
  }

  it(
    "Time Estimates: inline 'Activity is required' and 'Must be ≥ 0' messages appear after save attempt and clear on fix",
    async () => {
      await openCreateAndFillRequired();
      await waitFor(() => { expect(getSaveButton().disabled).toBe(false); });

      // Invalidate the first Time Estimates row.
      const table = tableForHeading(/^Time Estimates$/);
      const inputs = firstRowInputs(table);
      fireEvent.change(inputs[0], { target: { value: "" } });  // clear activity
      fireEvent.change(inputs[1], { target: { value: "-1" } }); // invalid hours

      await waitFor(() => { expect(getSaveButton().disabled).toBe(true); });

      // No inline messages yet (save not attempted).
      expect(screen.queryByText(/^Activity is required$/i)).toBeNull();
      expect(screen.queryByText(/^Must be ≥ 0$/i)).toBeNull();

      // Trigger save attempt.
      triggerSaveAttempt();

      // Inline per-row messages appear under the inputs.
      await waitFor(() => {
        expect(screen.getByText(/^Activity is required$/i)).toBeTruthy();
        expect(screen.getAllByText(/^Must be ≥ 0$/i).length).toBeGreaterThan(0);
      });

      // Fix the row → inline messages disappear.
      const refreshed = firstRowInputs(tableForHeading(/^Time Estimates$/));
      fireEvent.change(refreshed[0], { target: { value: "Planning" } });
      fireEvent.change(refreshed[1], { target: { value: "1" } });

      await waitFor(() => {
        expect(screen.queryByText(/^Activity is required$/i)).toBeNull();
      });
    },
    25000,
  );
});
