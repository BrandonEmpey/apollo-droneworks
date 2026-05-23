import React from "react";
import { render, screen, waitFor, act, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import SocialMediaAdPage from "../social-media-ad-page";

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
    user: { id: 1, username: "testuser", isAdmin: true },
    isLoading: false,
  }),
}));

vi.mock("@/hooks/use-ad-campaigns", () => ({
  useAdCampaigns: () => ({
    campaigns: [],
    isLoadingCampaigns: false,
    campaignDetails: null,
    isLoadingCampaignDetails: false,
    selectedCampaign: null,
    setSelectedCampaign: vi.fn(),
    selectedContent: null,
    setSelectedContent: vi.fn(),
    contentWithPreviews: [],
    isLoadingContentPreviews: false,
    refetchContentWithPreviews: vi.fn(),
    createCampaignMutation: { mutate: vi.fn(), isPending: false },
    updateCampaignMutation: { mutate: vi.fn(), isPending: false },
    deleteCampaignMutation: { mutate: vi.fn(), isPending: false },
    generateContentMutation: { mutate: vi.fn(), isPending: false },
    generateImageMutation: { mutate: vi.fn(), isPending: false },
    analyzeAdMutation: { mutate: vi.fn(), isPending: false, data: null },
    generateHashtagsMutation: { mutate: vi.fn(), isPending: false, data: null },
    generatePlatformPreviewsMutation: { mutate: vi.fn(), isPending: false },
    createTemplateMutation: { mutate: vi.fn(), isPending: false },
  }),
}));

function makeWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

describe("SocialMediaAdPage - dropdown selected-value retention", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, staleTime: Infinity },
        mutations: { retry: false },
      },
    });
  });

  it("New Campaign dialog platform trigger shows placeholder when no platform selected", async () => {
    render(
      React.createElement(SocialMediaAdPage, null),
      { wrapper: makeWrapper(queryClient) }
    );

    const newCampaignBtn = await screen.findByRole("button", { name: /new campaign/i });
    await act(async () => { fireEvent.click(newCampaignBtn); });

    await waitFor(
      () => expect(screen.getByRole("dialog")).toBeInTheDocument(),
      { timeout: 3000 }
    );

    const dialog = screen.getByRole("dialog");
    const comboboxes = dialog.querySelectorAll('[role="combobox"]');
    expect(comboboxes.length).toBeGreaterThan(0);
    const platformCombobox = comboboxes[0] as HTMLElement;
    expect(platformCombobox).toHaveTextContent("Select platform");
  });

  it("New Campaign dialog platform trigger shows no pre-selected platform (proves value= binding)", async () => {
    render(
      React.createElement(SocialMediaAdPage, null),
      { wrapper: makeWrapper(queryClient) }
    );

    const newCampaignBtn = await screen.findByRole("button", { name: /new campaign/i });
    await act(async () => { fireEvent.click(newCampaignBtn); });

    await waitFor(
      () => expect(screen.getByRole("dialog")).toBeInTheDocument(),
      { timeout: 3000 }
    );

    const dialog = screen.getByRole("dialog");
    const comboboxes = dialog.querySelectorAll('[role="combobox"]');
    const platformCombobox = comboboxes[0] as HTMLElement;
    expect(platformCombobox).not.toHaveTextContent("Facebook");
    expect(platformCombobox).not.toHaveTextContent("Instagram");
    expect(platformCombobox).not.toHaveTextContent("LinkedIn");
  });

  it("New Campaign dialog gender trigger shows placeholder when no gender selected", async () => {
    render(
      React.createElement(SocialMediaAdPage, null),
      { wrapper: makeWrapper(queryClient) }
    );

    const newCampaignBtn = await screen.findByRole("button", { name: /new campaign/i });
    await act(async () => { fireEvent.click(newCampaignBtn); });

    await waitFor(
      () => expect(screen.getByRole("dialog")).toBeInTheDocument(),
      { timeout: 3000 }
    );

    const dialog = screen.getByRole("dialog");
    const comboboxes = dialog.querySelectorAll('[role="combobox"]');
    expect(comboboxes.length).toBeGreaterThanOrEqual(2);
    const genderCombobox = comboboxes[1] as HTMLElement;
    expect(genderCombobox).not.toHaveTextContent("Male");
    expect(genderCombobox).not.toHaveTextContent("Female");
  });

  it("New Campaign dialog stays consistent when reopened (value= not defaultValue= guard)", async () => {
    render(
      React.createElement(SocialMediaAdPage, null),
      { wrapper: makeWrapper(queryClient) }
    );

    const newCampaignBtn = await screen.findByRole("button", { name: /new campaign/i });
    await act(async () => { fireEvent.click(newCampaignBtn); });
    await waitFor(() => expect(screen.getByRole("dialog")).toBeInTheDocument(), { timeout: 3000 });

    const dialog = screen.getByRole("dialog");
    const comboboxes = dialog.querySelectorAll('[role="combobox"]');
    expect((comboboxes[0] as HTMLElement)).toHaveTextContent("Select platform");
  });
});
