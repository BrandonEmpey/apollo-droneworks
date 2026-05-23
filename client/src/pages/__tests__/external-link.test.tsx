import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Router } from "wouter";
import { memoryLocation } from "wouter/memory-location";
import { HelmetProvider } from "react-helmet-async";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import ExternalLinkPage from "../external-link";

function renderAt(search: string) {
  window.history.replaceState({}, "", `/external-link${search}`);
  const { hook } = memoryLocation({ path: `/external-link${search}` });
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    React.createElement(
      QueryClientProvider,
      { client: qc },
      React.createElement(
        HelmetProvider,
        null,
        React.createElement(
          Router,
          { hook },
          React.createElement(ExternalLinkPage, null)
        )
      )
    )
  );
}

describe("ExternalLinkPage interstitial", () => {
  let openSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    openSpy = vi.spyOn(window, "open").mockImplementation(() => null);
  });

  afterEach(() => {
    openSpy.mockRestore();
    vi.restoreAllMocks();
  });

  it("renders destination host for an https URL and shows acknowledge gate", () => {
    renderAt("?to=" + encodeURIComponent("https://example.com/asset/123") + "&label=My%20Asset");

    expect(screen.getByTestId("external-link-interstitial")).toBeInTheDocument();
    expect(screen.getByTestId("text-destination-host")).toHaveTextContent("example.com");
    expect(screen.getByTestId("text-destination-url")).toHaveTextContent("https://example.com/asset/123");

    const continueBtn = screen.getByTestId("button-continue-external") as HTMLButtonElement;
    expect(continueBtn).toBeDisabled();
  });

  it("shows the NIRA-specific note when destination host is on nira.app", () => {
    renderAt("?to=" + encodeURIComponent("https://viewer.nira.app/m/abc"));
    expect(screen.getByText(/About NIRA\.app/i)).toBeInTheDocument();
  });

  it("does NOT show the NIRA note for non-nira hosts", () => {
    renderAt("?to=" + encodeURIComponent("https://example.com/x"));
    expect(screen.queryByText(/About NIRA\.app/i)).not.toBeInTheDocument();
  });

  it("rejects non-https URLs with an invalid-link card", () => {
    renderAt("?to=" + encodeURIComponent("http://insecure.example.com/x"));
    expect(screen.getByText(/Invalid external link/i)).toBeInTheDocument();
    expect(screen.queryByTestId("external-link-interstitial")).not.toBeInTheDocument();
  });

  it("rejects malformed URLs with an invalid-link card", () => {
    renderAt("?to=not-a-url");
    expect(screen.getByText(/Invalid external link/i)).toBeInTheDocument();
  });

  it("rejects missing 'to' param with an invalid-link card", () => {
    renderAt("");
    expect(screen.getByText(/Invalid external link/i)).toBeInTheDocument();
  });

  it("opens the destination in a new tab with noopener,noreferrer once acknowledged", async () => {
    renderAt("?to=" + encodeURIComponent("https://example.com/asset"));

    const checkbox = screen.getByTestId("checkbox-acknowledge");
    await act(async () => { fireEvent.click(checkbox); });

    const continueBtn = screen.getByTestId("button-continue-external") as HTMLButtonElement;
    expect(continueBtn).not.toBeDisabled();
    await act(async () => { fireEvent.click(continueBtn); });

    expect(openSpy).toHaveBeenCalledTimes(1);
    expect(openSpy).toHaveBeenCalledWith(
      "https://example.com/asset",
      "_blank",
      "noopener,noreferrer"
    );
  });
});
