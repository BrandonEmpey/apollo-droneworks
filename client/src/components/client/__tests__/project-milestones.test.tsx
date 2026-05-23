import React from "react";
import { render, screen, waitFor, act, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import ProjectMilestones from "../project-milestones";

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock("@/lib/queryClient", () => ({
  apiRequest: vi.fn(),
  queryClient: { invalidateQueries: vi.fn() },
  getQueryFn: vi.fn(),
}));

const PROJECT_ID = 7;

const mockMilestone = {
  id: 1,
  projectId: PROJECT_ID,
  title: "Phase 1 Complete",
  description: "Initial deliverables done",
  date: "2024-06-01",
  status: "completed",
  type: "deliverable",
  fileIds: [],
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z",
};

function makeWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

function seedQC(qc: QueryClient, milestones: typeof mockMilestone[] = []) {
  qc.setQueryData(["/api/client-projects", PROJECT_ID, "milestones"], milestones);
}

describe("ProjectMilestones – type and status dropdown retention", () => {
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

  it("Add Milestone dialog type trigger defaults to 'Milestone'", async () => {
    render(
      React.createElement(ProjectMilestones, { projectId: PROJECT_ID }),
      { wrapper: makeWrapper(qc) }
    );

    const addBtn = await screen.findByRole("button", { name: /add milestone/i });
    await act(async () => { fireEvent.click(addBtn); });

    await waitFor(() => expect(screen.getByRole("dialog")).toBeInTheDocument(), { timeout: 3000 });

    const dialog = screen.getByRole("dialog");
    await waitFor(() => {
      const comboboxes = dialog.querySelectorAll('[role="combobox"]');
      const typeCombobox = Array.from(comboboxes).find(
        (cb) => (cb as HTMLElement).textContent?.includes("Milestone")
      );
      expect(typeCombobox).toBeTruthy();
    }, { timeout: 3000 });
  });

  it("Add Milestone dialog status trigger defaults to 'Pending'", async () => {
    render(
      React.createElement(ProjectMilestones, { projectId: PROJECT_ID }),
      { wrapper: makeWrapper(qc) }
    );

    const addBtn = await screen.findByRole("button", { name: /add milestone/i });
    await act(async () => { fireEvent.click(addBtn); });

    await waitFor(() => expect(screen.getByRole("dialog")).toBeInTheDocument(), { timeout: 3000 });

    const dialog = screen.getByRole("dialog");
    await waitFor(() => {
      const comboboxes = dialog.querySelectorAll('[role="combobox"]');
      const statusCombobox = Array.from(comboboxes).find(
        (cb) => (cb as HTMLElement).textContent?.includes("Pending")
      );
      expect(statusCombobox).toBeTruthy();
    }, { timeout: 3000 });
  });

  it("Type trigger shows default 'Milestone' after dialog is re-opened (value= not defaultValue=)", async () => {
    render(
      React.createElement(ProjectMilestones, { projectId: PROJECT_ID }),
      { wrapper: makeWrapper(qc) }
    );

    const addBtn = await screen.findByRole("button", { name: /^Add Milestone$/i });

    await act(async () => { fireEvent.click(addBtn); });
    await waitFor(() => expect(screen.getByRole("dialog")).toBeInTheDocument(), { timeout: 3000 });

    const dialog = screen.getByRole("dialog");
    const closeBtn = dialog.querySelector('[aria-label="Close"]') as HTMLElement
      || dialog.querySelector('[data-radix-dialog-close]') as HTMLElement;
    if (closeBtn) {
      await act(async () => { fireEvent.click(closeBtn); });
    } else {
      await act(async () => {
        fireEvent.keyDown(document.body, { key: "Escape", code: "Escape" });
      });
    }

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    }, { timeout: 5000 });

    const addBtn2 = await screen.findByRole("button", { name: /^Add Milestone$/i });
    await act(async () => { fireEvent.click(addBtn2); });
    await waitFor(() => expect(screen.getByRole("dialog")).toBeInTheDocument(), { timeout: 3000 });

    const dialog2 = screen.getByRole("dialog");
    await waitFor(() => {
      const comboboxes = dialog2.querySelectorAll('[role="combobox"]');
      const typeCombobox = Array.from(comboboxes).find(
        (cb) => (cb as HTMLElement).textContent?.includes("Milestone")
      );
      expect(typeCombobox).toBeTruthy();
    }, { timeout: 3000 });
  });
});
