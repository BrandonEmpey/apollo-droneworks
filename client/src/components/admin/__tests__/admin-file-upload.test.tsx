import React from "react";
import { render, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import AdminFileUpload from "../admin-file-upload";

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock("@/lib/queryClient", () => ({
  apiRequest: vi.fn(),
  queryClient: { invalidateQueries: vi.fn() },
  getQueryFn: vi.fn(),
}));

const mockClients = [
  { id: 1, name: "Acme Corp", email: "acme@example.com" },
  { id: 2, name: "Beta LLC", email: "beta@example.com" },
];

function makeWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

function seedQC(qc: QueryClient) {
  qc.setQueryData(["/api/crm/clients"], mockClients);
  qc.setQueryData(["/api/client-projects", ""], []);
  qc.setQueryData(["/api/client-projects", "1"], []);
}

describe("AdminFileUpload – client and project dropdown retention", () => {
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

  it("Client select shows placeholder when clientId value is empty (no pre-selection)", async () => {
    render(
      React.createElement(AdminFileUpload, {}),
      { wrapper: makeWrapper(qc) }
    );

    await waitFor(() => {
      const comboboxes = document.querySelectorAll('[role="combobox"]');
      const clientCombobox = comboboxes[0] as HTMLElement;
      expect(clientCombobox).toBeTruthy();
      expect(clientCombobox.textContent).toMatch(/select a client/i);
    }, { timeout: 3000 });
  });

  it("Project select shows 'Select a client first' when clientId is empty (value= controls dependent placeholder)", async () => {
    render(
      React.createElement(AdminFileUpload, {}),
      { wrapper: makeWrapper(qc) }
    );

    await waitFor(() => {
      const comboboxes = document.querySelectorAll('[role="combobox"]');
      expect(comboboxes.length).toBeGreaterThanOrEqual(2);
      const projectCombobox = comboboxes[1] as HTMLElement;
      expect(projectCombobox.textContent).toMatch(/select a client first/i);
    }, { timeout: 3000 });
  });

  it("Project select is disabled when clientId value is empty (value= binding drives disabled state)", async () => {
    render(
      React.createElement(AdminFileUpload, {}),
      { wrapper: makeWrapper(qc) }
    );

    await waitFor(() => {
      const comboboxes = document.querySelectorAll('[role="combobox"]');
      expect(comboboxes.length).toBeGreaterThanOrEqual(2);
      const projectCombobox = comboboxes[1] as HTMLElement;
      expect(projectCombobox).toBeDisabled();
    }, { timeout: 3000 });
  });

  it("Client select is disabled when preselectedClientId locks the value= binding", async () => {
    render(
      React.createElement(AdminFileUpload, { preselectedClientId: 1 }),
      { wrapper: makeWrapper(qc) }
    );

    await waitFor(() => {
      const comboboxes = document.querySelectorAll('[role="combobox"]');
      const clientCombobox = comboboxes[0] as HTMLElement;
      expect(clientCombobox).toBeDisabled();
    }, { timeout: 3000 });
  });

  it("Project select dependent placeholder reacts to clientId value= binding (preselected vs none)", async () => {
    const { unmount } = render(
      React.createElement(AdminFileUpload, {}),
      { wrapper: makeWrapper(qc) }
    );

    await waitFor(() => {
      const comboboxes = document.querySelectorAll('[role="combobox"]');
      expect(comboboxes.length).toBeGreaterThanOrEqual(2);
      expect((comboboxes[1] as HTMLElement).textContent).toMatch(/select a client first/i);
    }, { timeout: 3000 });

    unmount();

    render(
      React.createElement(AdminFileUpload, { preselectedClientId: 1 }),
      { wrapper: makeWrapper(qc) }
    );

    await waitFor(() => {
      const comboboxes = document.querySelectorAll('[role="combobox"]');
      expect(comboboxes.length).toBeGreaterThanOrEqual(2);
      const projectCombobox = comboboxes[1] as HTMLElement;
      expect(projectCombobox.textContent).not.toMatch(/select a client first/i);
    }, { timeout: 3000 });
  });

  it("Project select disabled state and dependent placeholder both flip when clientId value= changes", async () => {
    const { unmount } = render(
      React.createElement(AdminFileUpload, {}),
      { wrapper: makeWrapper(qc) }
    );

    await waitFor(() => {
      const comboboxes = document.querySelectorAll('[role="combobox"]');
      expect(comboboxes.length).toBeGreaterThanOrEqual(2);
      const projectCombobox = comboboxes[1] as HTMLElement;
      expect(projectCombobox).toBeDisabled();
      expect(projectCombobox.textContent).toMatch(/select a client first/i);
    }, { timeout: 3000 });

    unmount();

    render(
      React.createElement(AdminFileUpload, { preselectedClientId: 1 }),
      { wrapper: makeWrapper(qc) }
    );

    await waitFor(() => {
      const comboboxes = document.querySelectorAll('[role="combobox"]');
      expect(comboboxes.length).toBeGreaterThanOrEqual(2);
      const projectCombobox = comboboxes[1] as HTMLElement;
      expect(projectCombobox.textContent).not.toMatch(/select a client first/i);
    }, { timeout: 3000 });
  });
});
