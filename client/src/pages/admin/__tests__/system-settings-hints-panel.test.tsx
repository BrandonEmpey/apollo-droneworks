import React from "react";
import { render, screen, fireEvent, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HelmetProvider } from "react-helmet-async";
import SystemSettings, { BannerRow } from "../system-settings";
import { BANNER_REGISTRY } from "@/hooks/use-dismissible-banner";

const mockToast = vi.fn();

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: mockToast }),
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
  useLocation: () => ["/", vi.fn()],
}));

function HintsPanel() {
  return (
    <div>
      {BANNER_REGISTRY.map((entry) => (
        <BannerRow key={entry.key} entry={entry} />
      ))}
    </div>
  );
}

describe("Hints panel – banner registry rendering", () => {
  beforeEach(() => {
    localStorage.clear();
    mockToast.mockClear();
  });

  it("renders a row for every banner registered in BANNER_REGISTRY", () => {
    render(<HintsPanel />);

    for (const entry of BANNER_REGISTRY) {
      expect(
        screen.getByText(entry.label),
        `Expected banner label "${entry.label}" to appear in the Hints panel`,
      ).toBeInTheDocument();
    }
  });

  it.each([
    ["AI Ad Campaign banner"],
    ["Galleries & Blog navigation banner"],
  ])("renders the required banner label: %s", (label) => {
    render(<HintsPanel />);
    expect(screen.getByText(label)).toBeInTheDocument();
  });

  it("each registered banner exposes a Dismiss control that toggles to Restore", () => {
    render(<HintsPanel />);

    for (const entry of BANNER_REGISTRY) {
      const labelNode = screen.getByText(entry.label);
      // Walk up to the row container that holds both the label and its buttons.
      let row: HTMLElement | null = labelNode.parentElement;
      while (row && !within(row).queryByRole("button", { name: /dismiss|restore/i })) {
        row = row.parentElement;
      }
      expect(row, `Could not find row for "${entry.label}"`).not.toBeNull();
      const rowEl = row as HTMLElement;

      fireEvent.click(within(rowEl).getByRole("button", { name: /dismiss/i }));
      expect(
        within(rowEl).getByRole("button", { name: /restore/i }),
      ).toBeInTheDocument();

      fireEvent.click(within(rowEl).getByRole("button", { name: /restore/i }));
      expect(
        within(rowEl).getByRole("button", { name: /dismiss/i }),
      ).toBeInTheDocument();
    }
  });
});

describe("SystemSettings page – Hints panel integration", () => {
  beforeEach(() => {
    localStorage.clear();
    mockToast.mockClear();
  });

  function renderPage() {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: 0, staleTime: Infinity },
      },
    });
    return render(
      <HelmetProvider>
        <QueryClientProvider client={queryClient}>
          <SystemSettings />
        </QueryClientProvider>
      </HelmetProvider>,
    );
  }

  it("renders every BANNER_REGISTRY entry inside the real System Settings page", async () => {
    const user = userEvent.setup();
    renderPage();

    // The Hints panel lives under the System Info tab — switch to it.
    await user.click(screen.getByRole("tab", { name: /system info/i }));

    expect(await screen.findByText("Admin Hints")).toBeInTheDocument();

    for (const entry of BANNER_REGISTRY) {
      expect(
        screen.getByText(entry.label),
        `Expected banner label "${entry.label}" to be wired into SystemSettings`,
      ).toBeInTheDocument();
    }
  });
});
