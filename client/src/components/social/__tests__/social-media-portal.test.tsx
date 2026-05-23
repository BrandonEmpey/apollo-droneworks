import React from "react";
import { render, screen, waitFor, act, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import SocialMediaPortal from "../social-media-portal";

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock("@/lib/queryClient", () => ({
  apiRequest: vi.fn(),
  queryClient: { invalidateQueries: vi.fn() },
  getQueryFn: vi.fn(),
}));

function makeWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

function seedCommon(queryClient: QueryClient) {
  queryClient.setQueryData(["/api/social-accounts"], []);
  queryClient.setQueryData(["/api/social-posts"], []);
}

describe("SocialMediaPortal - dropdown selected-value retention", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, staleTime: Infinity },
        mutations: { retry: false },
      },
    });
    seedCommon(queryClient);
  });

  it("Create Post dialog mediaType trigger shows placeholder when no type selected", async () => {
    render(
      React.createElement(SocialMediaPortal, null),
      { wrapper: makeWrapper(queryClient) }
    );

    const newDraftBtn = await screen.findByRole("button", { name: /new draft/i });
    await act(async () => { fireEvent.click(newDraftBtn); });

    await waitFor(
      () => expect(screen.getByRole("dialog")).toBeInTheDocument(),
      { timeout: 3000 }
    );

    const dialog = screen.getByRole("dialog");
    const comboboxes = dialog.querySelectorAll('[role="combobox"]');
    expect(comboboxes.length).toBeGreaterThan(0);
    const mediaTypeCombobox = comboboxes[0] as HTMLElement;
    expect(mediaTypeCombobox).toHaveTextContent("Select media type");
  });

  it("Create Post dialog mediaType trigger shows no pre-selected type (proves value= not defaultValue=)", async () => {
    render(
      React.createElement(SocialMediaPortal, null),
      { wrapper: makeWrapper(queryClient) }
    );

    const newDraftBtn = await screen.findByRole("button", { name: /new draft/i });
    await act(async () => { fireEvent.click(newDraftBtn); });

    await waitFor(
      () => expect(screen.getByRole("dialog")).toBeInTheDocument(),
      { timeout: 3000 }
    );

    const dialog = screen.getByRole("dialog");
    const comboboxes = dialog.querySelectorAll('[role="combobox"]');
    const mediaTypeCombobox = comboboxes[0] as HTMLElement;
    expect(mediaTypeCombobox).not.toHaveTextContent("Image");
    expect(mediaTypeCombobox).not.toHaveTextContent("Video");
    expect(mediaTypeCombobox).not.toHaveTextContent("Link");
  });

  it("posts tab is default and New Draft button is accessible without tab switching", async () => {
    render(
      React.createElement(SocialMediaPortal, null),
      { wrapper: makeWrapper(queryClient) }
    );

    const postsTab = await screen.findByRole("tab", { name: /content creation/i });
    expect(postsTab).toHaveAttribute("data-state", "active");

    const newDraftBtn = screen.getByRole("button", { name: /new draft/i });
    expect(newDraftBtn).toBeInTheDocument();
  });

  it("Create Post dialog mediaType combobox is bound to value= (empty string shows placeholder)", async () => {
    render(
      React.createElement(SocialMediaPortal, null),
      { wrapper: makeWrapper(queryClient) }
    );

    const newDraftBtn = await screen.findByRole("button", { name: /new draft/i });
    await act(async () => { fireEvent.click(newDraftBtn); });

    await waitFor(
      () => expect(screen.getByRole("dialog")).toBeInTheDocument(),
      { timeout: 3000 }
    );

    const dialog = screen.getByRole("dialog");
    const mediaTypeCombobox = dialog.querySelectorAll('[role="combobox"]')[0] as HTMLElement;
    const displayedValue = mediaTypeCombobox.textContent?.trim();
    expect(displayedValue).toBe("Select media type");
  });
});
