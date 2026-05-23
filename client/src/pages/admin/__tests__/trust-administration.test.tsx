import React from "react";
import { render, screen, waitFor, act, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HelmetProvider } from "react-helmet-async";
import TrustAdministration from "../trust-administration";

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock("@/lib/queryClient", () => ({
  apiRequest: vi.fn(),
  queryClient: { invalidateQueries: vi.fn() },
  getQueryFn: vi.fn(),
}));

vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({
    user: { id: 1, username: "admin", role: "admin", isAdmin: true },
    isLoading: false,
  }),
}));

const ENTITY_IRREVOCABLE = {
  id: 1,
  name: "Family Irrevocable Trust",
  type: "irrevocable",
  establishmentDate: "2020-06-15",
  jurisdiction: "Utah",
  taxId: "12-3456789",
  status: "terminated",
  purpose: "Asset protection",
  termConditions: "Ceases at 2050",
  governingLaw: "Utah",
  businessConfigId: null,
  trustAgreementUrl: null,
  amendmentsUrl: [],
  notes: null,
  createdAt: "2020-06-15T00:00:00.000Z",
  updatedAt: "2020-06-15T00:00:00.000Z",
};

const ENTITY_REVOCABLE = {
  id: 2,
  name: "Living Revocable Trust",
  type: "revocable",
  establishmentDate: "2021-03-01",
  jurisdiction: "California",
  taxId: null,
  status: "active",
  purpose: "Estate planning",
  termConditions: null,
  governingLaw: "California",
  businessConfigId: null,
  trustAgreementUrl: null,
  amendmentsUrl: [],
  notes: null,
  createdAt: "2021-03-01T00:00:00.000Z",
  updatedAt: "2021-03-01T00:00:00.000Z",
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

function seedQC(qc: QueryClient, entities: typeof ENTITY_IRREVOCABLE[] = []) {
  qc.setQueryData(["/api/trust-entities"], entities);
  for (const e of entities) {
    qc.setQueryData(["/api/trust-assets", e.id], []);
    qc.setQueryData(["/api/trust-asset-history", e.id], []);
    qc.setQueryData(["/api/trust-trustees", e.id], []);
    qc.setQueryData(["/api/trust-beneficiaries", e.id], []);
    qc.setQueryData(["/api/trust-distributions", e.id], []);
  }
  qc.setQueryData(["/api/trust-assets", null], []);
}

describe("TrustAdministration – entity form dropdown-retention", () => {
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

  it("New entity dialog type trigger defaults to 'Family Trust'", async () => {
    render(
      React.createElement(TrustAdministration, null),
      { wrapper: makeWrapper(qc) }
    );

    const createBtn = await screen.findByTestId("button-create-trust-entity");
    await act(async () => { fireEvent.click(createBtn); });

    await waitFor(() => expect(screen.getByRole("dialog")).toBeInTheDocument(), { timeout: 3000 });

    const dialog = screen.getByRole("dialog");
    const comboboxes = dialog.querySelectorAll('[role="combobox"]');
    expect(comboboxes.length).toBeGreaterThanOrEqual(2);
    expect((comboboxes[0] as HTMLElement)).toHaveTextContent("Family Trust");
  });

  it("New entity dialog status trigger defaults to 'Active'", async () => {
    render(
      React.createElement(TrustAdministration, null),
      { wrapper: makeWrapper(qc) }
    );

    const createBtn = await screen.findByTestId("button-create-trust-entity");
    await act(async () => { fireEvent.click(createBtn); });

    await waitFor(() => expect(screen.getByRole("dialog")).toBeInTheDocument(), { timeout: 3000 });

    const dialog = screen.getByRole("dialog");
    const comboboxes = dialog.querySelectorAll('[role="combobox"]');
    expect((comboboxes[1] as HTMLElement)).toHaveTextContent("Active");
  });

  it("Edit dialog type trigger shows loaded value 'Irrevocable'", async () => {
    seedQC(qc, [ENTITY_IRREVOCABLE]);

    render(
      React.createElement(TrustAdministration, null),
      { wrapper: makeWrapper(qc) }
    );

    const editBtn = await screen.findByTestId("button-edit-trust-1", {}, { timeout: 5000 });
    await act(async () => { fireEvent.click(editBtn); });

    await waitFor(() => expect(screen.getByRole("dialog")).toBeInTheDocument(), { timeout: 3000 });

    const dialog = screen.getByRole("dialog");
    await waitFor(() => {
      const comboboxes = dialog.querySelectorAll('[role="combobox"]');
      expect(comboboxes.length).toBeGreaterThanOrEqual(2);
      expect((comboboxes[0] as HTMLElement)).toHaveTextContent("Irrevocable");
    }, { timeout: 3000 });
  });

  it("Edit dialog status trigger shows loaded value 'Terminated'", async () => {
    seedQC(qc, [ENTITY_IRREVOCABLE]);

    render(
      React.createElement(TrustAdministration, null),
      { wrapper: makeWrapper(qc) }
    );

    const editBtn = await screen.findByTestId("button-edit-trust-1", {}, { timeout: 5000 });
    await act(async () => { fireEvent.click(editBtn); });

    await waitFor(() => expect(screen.getByRole("dialog")).toBeInTheDocument(), { timeout: 3000 });

    const dialog = screen.getByRole("dialog");
    await waitFor(() => {
      const comboboxes = dialog.querySelectorAll('[role="combobox"]');
      expect((comboboxes[1] as HTMLElement)).toHaveTextContent("Terminated");
    }, { timeout: 3000 });
  });

  it("Type trigger updates when editing a different entity (proves value= not defaultValue=)", async () => {
    seedQC(qc, [ENTITY_IRREVOCABLE, ENTITY_REVOCABLE]);

    render(
      React.createElement(TrustAdministration, null),
      { wrapper: makeWrapper(qc) }
    );

    await screen.findByTestId("button-edit-trust-1", {}, { timeout: 5000 });

    await act(async () => { fireEvent.click(screen.getByTestId("button-edit-trust-1")); });
    await waitFor(() => {
      const dialog = screen.getByRole("dialog");
      const comboboxes = dialog.querySelectorAll('[role="combobox"]');
      expect((comboboxes[0] as HTMLElement)).toHaveTextContent("Irrevocable");
    }, { timeout: 3000 });

    const dialog = screen.getByRole("dialog");
    const closeBtn = dialog.querySelector('[aria-label="Close"]') as HTMLElement;
    if (closeBtn) { await act(async () => { fireEvent.click(closeBtn); }); }
    else {
      const cancelBtn = Array.from(dialog.querySelectorAll("button")).find(b => /cancel/i.test(b.textContent || ""));
      if (cancelBtn) { await act(async () => { fireEvent.click(cancelBtn); }); }
    }

    await act(async () => { fireEvent.click(screen.getByTestId("button-edit-trust-2")); });
    await waitFor(() => {
      const dialog2 = screen.getByRole("dialog");
      const comboboxes = dialog2.querySelectorAll('[role="combobox"]');
      expect((comboboxes[0] as HTMLElement)).toHaveTextContent("Revocable");
    }, { timeout: 3000 });
  });
});

const ASSET_SECURITIES = {
  id: 11,
  trustId: 2,
  assetType: "securities",
  assetName: "Brokerage Holdings",
  description: null,
  acquisitionDate: null,
  acquisitionValue: null,
  currentValue: "150000",
  valuationDate: null,
  valuationMethod: null,
  assetIdentifier: null,
  location: null,
  custodian: null,
  generatesincome: false,
  incomeFrequency: null,
  lastIncomeDate: null,
  isDepreciable: false,
  depreciationMethod: null,
  depreciationRate: null,
  notes: null,
  createdAt: "2022-01-01T00:00:00.000Z",
  updatedAt: "2022-01-01T00:00:00.000Z",
};

const TRUSTEE_CORPORATE = {
  id: 21,
  trustId: 2,
  firstName: "Acme",
  lastName: "Trust Co",
  email: null,
  phone: null,
  address: null,
  city: null,
  state: null,
  postalCode: null,
  country: null,
  trusteeType: "corporate",
  roleDescription: null,
  appointmentDate: "2021-04-01",
  terminationDate: null,
  isActive: true,
  notes: null,
  createdAt: "2021-04-01T00:00:00.000Z",
  updatedAt: "2021-04-01T00:00:00.000Z",
};

const DISTRIBUTION_PRINCIPAL = {
  id: 31,
  trustId: 2,
  beneficiaryId: 99,
  distributionDate: "2024-05-10",
  distributionType: "principal",
  amount: "5000",
  description: null,
  purpose: null,
  paymentMethod: "check",
  checkNumber: null,
  taxYear: null,
  approvedBy: null,
  notes: null,
  createdAt: "2024-05-10T00:00:00.000Z",
  updatedAt: "2024-05-10T00:00:00.000Z",
};

const BENEFICIARY_CONTINGENT = {
  id: 41,
  trustId: 2,
  userId: null,
  firstName: "Jane",
  lastName: "Doe",
  email: null,
  phone: null,
  address: null,
  city: null,
  state: null,
  postalCode: null,
  country: null,
  dateOfBirth: null,
  beneficiaryType: "contingent",
  relationshipToTrustor: null,
  isActive: true,
  notes: null,
  createdAt: "2022-02-02T00:00:00.000Z",
  updatedAt: "2022-02-02T00:00:00.000Z",
};

async function switchTab(tabName: RegExp) {
  const tab = await screen.findByRole("tab", { name: tabName }, { timeout: 5000 });
  const user = userEvent.setup();
  await user.click(tab);
}

describe("TrustAdministration – sub-form dropdown-retention", () => {
  let qc: QueryClient;

  beforeEach(() => {
    qc = new QueryClient({
      defaultOptions: {
        queries: { retry: false, staleTime: Infinity },
        mutations: { retry: false },
      },
    });
  });

  it("New asset dialog assetType trigger defaults to 'Real Estate'", async () => {
    seedQC(qc, [ENTITY_REVOCABLE]);

    render(
      React.createElement(TrustAdministration, null),
      { wrapper: makeWrapper(qc) }
    );

    await switchTab(/schedule of assets/i);

    const addBtn = await screen.findByTestId("button-add-asset", {}, { timeout: 5000 });
    await act(async () => { fireEvent.click(addBtn); });

    await waitFor(() => expect(screen.getByRole("dialog")).toBeInTheDocument(), { timeout: 3000 });

    await waitFor(() => {
      const trigger = screen.getByTestId("select-asset-type");
      expect(trigger).toHaveTextContent("Real Estate");
    }, { timeout: 3000 });
  });

  it("Edit asset dialog assetType trigger shows loaded value 'Securities'", async () => {
    seedQC(qc, [ENTITY_REVOCABLE]);
    qc.setQueryData(["/api/trust-assets", ENTITY_REVOCABLE.id], [ASSET_SECURITIES]);

    render(
      React.createElement(TrustAdministration, null),
      { wrapper: makeWrapper(qc) }
    );

    await switchTab(/schedule of assets/i);

    const editBtn = await screen.findByTestId(`button-edit-asset-${ASSET_SECURITIES.id}`, {}, { timeout: 5000 });
    await act(async () => { fireEvent.click(editBtn); });

    await waitFor(() => expect(screen.getByRole("dialog")).toBeInTheDocument(), { timeout: 3000 });

    await waitFor(() => {
      const trigger = screen.getByTestId("select-asset-type");
      expect(trigger).toHaveTextContent("Securities");
    }, { timeout: 3000 });
  });

  it("New trustee dialog trusteeType trigger defaults to 'Individual'", async () => {
    seedQC(qc, [ENTITY_REVOCABLE]);

    render(
      React.createElement(TrustAdministration, null),
      { wrapper: makeWrapper(qc) }
    );

    await switchTab(/^trustees$/i);

    const addBtn = await screen.findByTestId("button-add-trustee", {}, { timeout: 5000 });
    await act(async () => { fireEvent.click(addBtn); });

    await waitFor(() => expect(screen.getByRole("dialog")).toBeInTheDocument(), { timeout: 3000 });

    await waitFor(() => {
      const trigger = screen.getByTestId("select-trustee-type");
      expect(trigger).toHaveTextContent("Individual");
    }, { timeout: 3000 });
  });

  it("Edit trustee dialog trusteeType trigger shows loaded value 'Corporate'", async () => {
    seedQC(qc, [ENTITY_REVOCABLE]);
    qc.setQueryData(["/api/trust-trustees", ENTITY_REVOCABLE.id], [TRUSTEE_CORPORATE]);

    render(
      React.createElement(TrustAdministration, null),
      { wrapper: makeWrapper(qc) }
    );

    await switchTab(/^trustees$/i);

    const editBtn = await screen.findByTestId(`button-edit-trustee-${TRUSTEE_CORPORATE.id}`, {}, { timeout: 5000 });
    await act(async () => { fireEvent.click(editBtn); });

    await waitFor(() => expect(screen.getByRole("dialog")).toBeInTheDocument(), { timeout: 3000 });

    await waitFor(() => {
      const trigger = screen.getByTestId("select-trustee-type");
      expect(trigger).toHaveTextContent("Corporate");
    }, { timeout: 3000 });
  });

  it("New distribution dialog distributionType trigger defaults to 'Income'", async () => {
    seedQC(qc, [ENTITY_REVOCABLE]);

    render(
      React.createElement(TrustAdministration, null),
      { wrapper: makeWrapper(qc) }
    );

    await switchTab(/^distributions$/i);

    const addBtn = await screen.findByTestId("button-add-distribution", {}, { timeout: 5000 });
    await act(async () => { fireEvent.click(addBtn); });

    await waitFor(() => expect(screen.getByRole("dialog")).toBeInTheDocument(), { timeout: 3000 });

    await waitFor(() => {
      const trigger = screen.getByTestId("select-distribution-type");
      expect(trigger).toHaveTextContent("Income");
    }, { timeout: 3000 });
  });

  it("New beneficiary dialog beneficiaryType trigger defaults to 'Primary'", async () => {
    seedQC(qc, [ENTITY_REVOCABLE]);

    render(
      React.createElement(TrustAdministration, null),
      { wrapper: makeWrapper(qc) }
    );

    await switchTab(/^beneficiaries$/i);

    const addBtn = await screen.findByTestId("button-add-beneficiary", {}, { timeout: 5000 });
    await act(async () => { fireEvent.click(addBtn); });

    await waitFor(() => expect(screen.getByRole("dialog")).toBeInTheDocument(), { timeout: 3000 });

    await waitFor(() => {
      const trigger = screen.getByTestId("select-beneficiary-type");
      expect(trigger).toHaveTextContent("Primary");
    }, { timeout: 3000 });
  });

  it("Edit beneficiary dialog beneficiaryType trigger shows loaded value 'Contingent'", async () => {
    seedQC(qc, [ENTITY_REVOCABLE]);
    qc.setQueryData(["/api/trust-beneficiaries", ENTITY_REVOCABLE.id], [BENEFICIARY_CONTINGENT]);

    render(
      React.createElement(TrustAdministration, null),
      { wrapper: makeWrapper(qc) }
    );

    await switchTab(/^beneficiaries$/i);

    const editBtn = await screen.findByTestId(`button-edit-beneficiary-${BENEFICIARY_CONTINGENT.id}`, {}, { timeout: 5000 });
    await act(async () => { fireEvent.click(editBtn); });

    await waitFor(() => expect(screen.getByRole("dialog")).toBeInTheDocument(), { timeout: 3000 });

    await waitFor(() => {
      const trigger = screen.getByTestId("select-beneficiary-type");
      expect(trigger).toHaveTextContent("Contingent");
    }, { timeout: 3000 });
  });

  it("Edit distribution dialog distributionType trigger shows loaded value 'Principal'", async () => {
    seedQC(qc, [ENTITY_REVOCABLE]);
    qc.setQueryData(["/api/trust-distributions", ENTITY_REVOCABLE.id], [DISTRIBUTION_PRINCIPAL]);

    render(
      React.createElement(TrustAdministration, null),
      { wrapper: makeWrapper(qc) }
    );

    await switchTab(/^distributions$/i);

    const editBtn = await screen.findByTestId(`button-edit-distribution-${DISTRIBUTION_PRINCIPAL.id}`, {}, { timeout: 5000 });
    await act(async () => { fireEvent.click(editBtn); });

    await waitFor(() => expect(screen.getByRole("dialog")).toBeInTheDocument(), { timeout: 3000 });

    await waitFor(() => {
      const trigger = screen.getByTestId("select-distribution-type");
      expect(trigger).toHaveTextContent("Principal");
    }, { timeout: 3000 });
  });
});
