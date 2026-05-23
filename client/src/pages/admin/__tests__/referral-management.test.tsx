import React from "react";
import { render, screen, waitFor, act, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import ReferralManagement from "../referral-management";

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock("@/lib/queryClient", () => ({
  apiRequest: vi.fn(),
  queryClient: { invalidateQueries: vi.fn() },
  getQueryFn: vi.fn(),
}));


const mockPrograms = [
  {
    id: 1,
    name: "Spring Referral",
    description: "Spring program",
    referrerRewardType: "service_credit",
    referrerRewardValue: "50",
    refereeRewardType: "fixed_amount",
    refereeRewardValue: "25",
    isActive: true,
    startDate: "2024-01-01",
    createdAt: "2024-01-01",
    updatedAt: "2024-01-01",
  },
];

function makeWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

function seedCommon(queryClient: QueryClient, programs = [] as typeof mockPrograms) {
  queryClient.setQueryData(["/api/referral/programs"], programs);
  queryClient.setQueryData(["/api/referral/codes"], []);
  queryClient.setQueryData(["/api/referral/analytics"], {
    totalReferrals: 0,
    totalRewards: 0,
    conversionRate: 0,
  });
}

describe("ReferralManagement - dropdown selected-value retention", () => {
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

  it("New Program dialog referrerRewardType shows default 'Percentage' on open", async () => {
    render(
      React.createElement(ReferralManagement, null),
      { wrapper: makeWrapper(queryClient) }
    );

    const newProgramBtn = await screen.findByRole("button", { name: /new program/i });
    await act(async () => { fireEvent.click(newProgramBtn); });

    await waitFor(
      () => expect(screen.getByRole("dialog")).toBeInTheDocument(),
      { timeout: 3000 }
    );

    const dialog = screen.getByRole("dialog");
    const comboboxes = dialog.querySelectorAll('[role="combobox"]');
    expect(comboboxes.length).toBeGreaterThanOrEqual(2);
    expect((comboboxes[0] as HTMLElement)).toHaveTextContent("Percentage");
    expect((comboboxes[1] as HTMLElement)).toHaveTextContent("Percentage");
  });

  it("New Program dialog refereeRewardType shows 'Percentage' (proves value= binding reflects default)", async () => {
    render(
      React.createElement(ReferralManagement, null),
      { wrapper: makeWrapper(queryClient) }
    );

    const newProgramBtn = await screen.findByRole("button", { name: /new program/i });
    await act(async () => { fireEvent.click(newProgramBtn); });

    await waitFor(
      () => expect(screen.getByRole("dialog")).toBeInTheDocument(),
      { timeout: 3000 }
    );

    const dialog = screen.getByRole("dialog");
    const comboboxes = dialog.querySelectorAll('[role="combobox"]');
    const refereeCombobox = comboboxes[1] as HTMLElement;
    expect(refereeCombobox).toHaveTextContent("Percentage");
    expect(refereeCombobox).not.toHaveTextContent("Fixed Amount");
    expect(refereeCombobox).not.toHaveTextContent("Service Credit");
  });

  it("Edit Program dialog referrerRewardType shows loaded value 'Service Credit'", async () => {
    seedCommon(queryClient, mockPrograms);

    render(
      React.createElement(ReferralManagement, null),
      { wrapper: makeWrapper(queryClient) }
    );

    await screen.findByText("Spring Referral");

    const allBtns = screen.getAllByRole("button");
    const iconOnlyBtns = allBtns.filter(
      (btn) => btn.querySelector("svg") !== null && btn.textContent?.trim() === ""
    );
    expect(iconOnlyBtns.length).toBeGreaterThan(0);

    await act(async () => { fireEvent.click(iconOnlyBtns[0]); });

    await waitFor(
      () => expect(screen.getByRole("dialog")).toBeInTheDocument(),
      { timeout: 3000 }
    );

    const dialog = screen.getByRole("dialog");
    await waitFor(
      () => {
        const comboboxes = dialog.querySelectorAll('[role="combobox"]');
        expect(comboboxes.length).toBeGreaterThanOrEqual(2);
        expect((comboboxes[0] as HTMLElement)).toHaveTextContent("Service Credit");
      },
      { timeout: 3000 }
    );
  });

  it("Edit Program dialog refereeRewardType shows loaded value 'Fixed Amount'", async () => {
    seedCommon(queryClient, mockPrograms);

    render(
      React.createElement(ReferralManagement, null),
      { wrapper: makeWrapper(queryClient) }
    );

    await screen.findByText("Spring Referral");

    const allBtns = screen.getAllByRole("button");
    const iconOnlyBtns = allBtns.filter(
      (btn) => btn.querySelector("svg") !== null && btn.textContent?.trim() === ""
    );
    expect(iconOnlyBtns.length).toBeGreaterThan(0);

    await act(async () => { fireEvent.click(iconOnlyBtns[0]); });

    await waitFor(
      () => expect(screen.getByRole("dialog")).toBeInTheDocument(),
      { timeout: 3000 }
    );

    const dialog = screen.getByRole("dialog");
    await waitFor(
      () => {
        const comboboxes = dialog.querySelectorAll('[role="combobox"]');
        expect((comboboxes[1] as HTMLElement)).toHaveTextContent("Fixed Amount");
      },
      { timeout: 3000 }
    );
  });

  it("New Program dialog resets to default Percentage after opening fresh (re-render check)", async () => {
    render(
      React.createElement(ReferralManagement, null),
      { wrapper: makeWrapper(queryClient) }
    );

    const newProgramBtn = await screen.findByRole("button", { name: /new program/i });
    await act(async () => { fireEvent.click(newProgramBtn); });
    await waitFor(() => expect(screen.getByRole("dialog")).toBeInTheDocument(), { timeout: 3000 });

    const dialog = screen.getByRole("dialog");
    const comboboxes = dialog.querySelectorAll('[role="combobox"]');
    expect((comboboxes[0] as HTMLElement)).toHaveTextContent("Percentage");
  });
});
