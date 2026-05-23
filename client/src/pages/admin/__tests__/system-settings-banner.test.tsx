import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { BannerRow } from "../system-settings";
import type { BannerRegistryEntry } from "@/hooks/use-dismissible-banner";

const mockToast = vi.fn();

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: mockToast }),
}));

vi.mock("@/lib/queryClient", () => ({
  apiRequest: vi.fn(),
  queryClient: { invalidateQueries: vi.fn() },
  getQueryFn: vi.fn(),
}));

const TEST_ENTRY: BannerRegistryEntry = {
  key: "test-banner-key",
  label: "Test Banner",
  description: "A banner used for testing.",
};

describe("BannerRow – dismiss and restore", () => {
  beforeEach(() => {
    localStorage.clear();
    mockToast.mockClear();
  });

  it("shows the Dismiss button when the banner is visible", () => {
    render(<BannerRow entry={TEST_ENTRY} />);
    expect(screen.getByRole("button", { name: /dismiss/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /restore/i })).not.toBeInTheDocument();
  });

  it("clicking Dismiss hides the banner button and shows a toast", () => {
    render(<BannerRow entry={TEST_ENTRY} />);

    fireEvent.click(screen.getByRole("button", { name: /dismiss/i }));

    expect(screen.queryByRole("button", { name: /dismiss/i })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /restore/i })).toBeInTheDocument();

    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Hint dismissed",
        description: expect.stringContaining("Test Banner"),
      })
    );
  });

  it("shows the Restore button when the banner is already dismissed and clicking it restores it", () => {
    localStorage.setItem(TEST_ENTRY.key, "true");

    render(<BannerRow entry={TEST_ENTRY} />);

    expect(screen.getByRole("button", { name: /restore/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /dismiss/i })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /restore/i }));

    expect(screen.getByRole("button", { name: /dismiss/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /restore/i })).not.toBeInTheDocument();

    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Hint restored",
        description: expect.stringContaining("Test Banner"),
      })
    );
  });
});
