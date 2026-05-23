import React from "react";
import { render, screen, waitFor, act, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import ProjectTasks from "../project-tasks";

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

const PROJECT_ID = 42;

const TASK_HIGH_INPROGRESS = {
  id: 1,
  projectId: PROJECT_ID,
  title: "High priority task",
  description: "Fix critical bug",
  dueDate: null,
  priority: "high",
  status: "in-progress",
  clientNotes: "",
  adminNotes: "",
  completedAt: null,
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z",
  files: [],
};

const TASK_LOW_TODO = {
  id: 2,
  projectId: PROJECT_ID,
  title: "Low priority task",
  description: "Minor improvement",
  dueDate: null,
  priority: "low",
  status: "todo",
  clientNotes: "",
  adminNotes: "",
  completedAt: null,
  createdAt: "2024-01-02T00:00:00.000Z",
  updatedAt: "2024-01-02T00:00:00.000Z",
  files: [],
};

function makeWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

function seedQC(qc: QueryClient, tasks: typeof TASK_HIGH_INPROGRESS[] = []) {
  qc.setQueryData(["/api/client-projects", PROJECT_ID, "tasks"], tasks);
}

describe("ProjectTasks – priority and status dropdown retention", () => {
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

  it("New task dialog priority trigger defaults to 'Medium'", async () => {
    render(
      React.createElement(ProjectTasks, { projectId: PROJECT_ID }),
      { wrapper: makeWrapper(qc) }
    );

    const addBtn = await screen.findByRole("button", { name: /add task/i });
    await act(async () => { fireEvent.click(addBtn); });

    await waitFor(() => expect(screen.getByRole("dialog")).toBeInTheDocument(), { timeout: 3000 });

    const dialog = screen.getByRole("dialog");
    await waitFor(() => {
      const comboboxes = dialog.querySelectorAll('[role="combobox"]');
      const priorityCombobox = Array.from(comboboxes).find(
        (cb) => (cb as HTMLElement).textContent?.includes("Medium")
      );
      expect(priorityCombobox).toBeTruthy();
    }, { timeout: 3000 });
  });

  it("New task dialog status trigger defaults to 'To Do'", async () => {
    render(
      React.createElement(ProjectTasks, { projectId: PROJECT_ID }),
      { wrapper: makeWrapper(qc) }
    );

    const addBtn = await screen.findByRole("button", { name: /add task/i });
    await act(async () => { fireEvent.click(addBtn); });

    await waitFor(() => expect(screen.getByRole("dialog")).toBeInTheDocument(), { timeout: 3000 });

    const dialog = screen.getByRole("dialog");
    await waitFor(() => {
      const comboboxes = dialog.querySelectorAll('[role="combobox"]');
      const statusCombobox = Array.from(comboboxes).find(
        (cb) => (cb as HTMLElement).textContent?.includes("To Do")
      );
      expect(statusCombobox).toBeTruthy();
    }, { timeout: 3000 });
  });

  it("Edit dialog priority updates when editing a different task (proves value= not defaultValue=)", async () => {
    seedQC(qc, [TASK_HIGH_INPROGRESS, TASK_LOW_TODO]);

    render(
      React.createElement(ProjectTasks, { projectId: PROJECT_ID }),
      { wrapper: makeWrapper(qc) }
    );

    await screen.findByText("High priority task", {}, { timeout: 5000 });
    await screen.findByText("Low priority task", {}, { timeout: 5000 });

    const allBtns = screen.getAllByRole("button");
    const iconOnlyBtns = allBtns.filter(
      (btn) => btn.querySelector("svg") !== null && btn.textContent?.trim() === ""
    );
    expect(iconOnlyBtns.length).toBeGreaterThan(0);

    await act(async () => { fireEvent.click(iconOnlyBtns[0]); });

    await waitFor(() => expect(screen.getByRole("dialog")).toBeInTheDocument(), { timeout: 3000 });

    const dialog1 = screen.getByRole("dialog");
    await waitFor(() => {
      const comboboxes = dialog1.querySelectorAll('[role="combobox"]');
      const priorityCombobox = Array.from(comboboxes).find(
        (cb) => (cb as HTMLElement).textContent?.includes("High")
      );
      expect(priorityCombobox).toBeTruthy();
    }, { timeout: 3000 });

    const closeBtn = dialog1.querySelector('[aria-label="Close"]') as HTMLElement
      || dialog1.querySelector('[data-radix-dialog-close]') as HTMLElement;
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

    const allBtns2 = screen.getAllByRole("button");
    const iconOnlyBtns2 = allBtns2.filter(
      (btn) => btn.querySelector("svg") !== null && btn.textContent?.trim() === ""
    );

    const secondTaskBtns = iconOnlyBtns2.slice(Math.floor(iconOnlyBtns2.length / 2));
    await act(async () => { fireEvent.click(secondTaskBtns[0]); });

    await waitFor(() => expect(screen.getByRole("dialog")).toBeInTheDocument(), { timeout: 3000 });

    const dialog2 = screen.getByRole("dialog");
    await waitFor(() => {
      const comboboxes = dialog2.querySelectorAll('[role="combobox"]');
      const priorityCombobox = Array.from(comboboxes).find(
        (cb) => (cb as HTMLElement).textContent?.includes("Low")
      );
      expect(priorityCombobox).toBeTruthy();
    }, { timeout: 3000 });
  });
});
