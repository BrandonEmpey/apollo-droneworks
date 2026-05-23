import React from "react";
import { render, screen, waitFor, act, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import AdminAboutPageEditor from "../about-page-editor";

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock("@/lib/queryClient", () => ({
  apiRequest: vi.fn(),
  queryClient: { invalidateQueries: vi.fn() },
  getQueryFn: vi.fn(),
}));

const MISSION_CONTENT = {
  id: 1,
  section: "mission",
  title: "Our Mission",
  content: "We deliver excellence.",
  imageUrl: null,
  displayOrder: 1,
  isVisible: true,
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z",
};

const CERTIFICATIONS_CONTENT = {
  id: 2,
  section: "certifications",
  title: "Our Certifications",
  content: "Certified professionals.",
  imageUrl: null,
  displayOrder: 1,
  isVisible: true,
  createdAt: "2024-01-02T00:00:00.000Z",
  updatedAt: "2024-01-02T00:00:00.000Z",
};

function makeWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

function seedQC(qc: QueryClient, content = {
  mission: [MISSION_CONTENT],
  values: [],
  certifications: [CERTIFICATIONS_CONTENT],
}) {
  qc.setQueryData(["/api/about-content"], content);
}

describe("AdminAboutPageEditor – section dropdown retention", () => {
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

  it("Add Content dialog section trigger defaults to 'Mission' (active tab default)", async () => {
    render(
      React.createElement(AdminAboutPageEditor, null),
      { wrapper: makeWrapper(qc) }
    );

    const addBtn = await screen.findByRole("button", { name: /add content/i });
    await act(async () => { fireEvent.click(addBtn); });

    await waitFor(() => expect(screen.getByRole("dialog")).toBeInTheDocument(), { timeout: 3000 });

    const dialog = screen.getByRole("dialog");
    const comboboxes = dialog.querySelectorAll('[role="combobox"]');
    expect(comboboxes.length).toBeGreaterThanOrEqual(1);
    expect((comboboxes[0] as HTMLElement)).toHaveTextContent("Mission");
  });

  it("Edit dialog section trigger shows loaded value 'Mission' for a mission item", async () => {
    render(
      React.createElement(AdminAboutPageEditor, null),
      { wrapper: makeWrapper(qc) }
    );

    const editBtns = await screen.findAllByRole("button", { name: /edit/i });
    await act(async () => { fireEvent.click(editBtns[0]); });

    await waitFor(() => expect(screen.getByRole("dialog")).toBeInTheDocument(), { timeout: 3000 });

    const dialog = screen.getByRole("dialog");
    await waitFor(() => {
      const comboboxes = dialog.querySelectorAll('[role="combobox"]');
      expect(comboboxes.length).toBeGreaterThanOrEqual(1);
      expect((comboboxes[0] as HTMLElement)).toHaveTextContent("Mission");
    }, { timeout: 3000 });
  });

  it("Edit dialog section trigger shows 'Certifications' for a certifications item (form.reset binds Select via value=)", async () => {
    render(
      React.createElement(AdminAboutPageEditor, null),
      { wrapper: makeWrapper(qc) }
    );

    const user = userEvent.setup();
    const certTab = await screen.findByRole("tab", { name: /certifications/i });
    await user.click(certTab);

    await waitFor(() => {
      expect(certTab.getAttribute("data-state")).toBe("active");
    }, { timeout: 3000 });

    await waitFor(() => {
      const editBtns = screen.queryAllByRole("button", { name: /edit/i });
      expect(editBtns.length).toBeGreaterThan(0);
    }, { timeout: 3000 });

    const editBtns = screen.getAllByRole("button", { name: /edit/i });
    await user.click(editBtns[0]);

    await waitFor(() => expect(screen.getByRole("dialog")).toBeInTheDocument(), { timeout: 3000 });

    const dialog = screen.getByRole("dialog");
    await waitFor(() => {
      const comboboxes = dialog.querySelectorAll('[role="combobox"]');
      expect(comboboxes.length).toBeGreaterThanOrEqual(1);
      expect((comboboxes[0] as HTMLElement)).toHaveTextContent("Certifications");
    }, { timeout: 3000 });
  });
});
