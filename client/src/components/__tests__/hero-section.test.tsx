import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

vi.mock("embla-carousel-react", () => ({
  default: () => [vi.fn(), undefined],
}));

vi.mock("@assets/generated_images/hero_red_rock_canyon.png", () => ({
  default: "/__test__/red-rock.png",
}));
vi.mock("@assets/generated_images/hero_luxury_estate.png", () => ({
  default: "/__test__/luxury.png",
}));
vi.mock("@assets/generated_images/hero_construction_site.png", () => ({
  default: "/__test__/construction.png",
}));

import { HeroSection } from "../hero-section";

function renderWithClient(fetchImpl: typeof fetch) {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = fetchImpl;
  const qc = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        queryFn: async ({ queryKey }) => {
          const res = await fetch(queryKey[0] as string);
          if (!res.ok) throw new Error(`${res.status}`);
          return res.json();
        },
      },
    },
  });
  const utils = render(
    React.createElement(
      QueryClientProvider,
      { client: qc },
      React.createElement(HeroSection),
    ),
  );
  return {
    ...utils,
    cleanupFetch: () => {
      globalThis.fetch = originalFetch;
    },
  };
}

describe("HeroSection fallback + API rendering", () => {
  let cleanup: (() => void) | null = null;

  beforeEach(() => {
    cleanup = null;
  });

  afterEach(() => {
    if (cleanup) cleanup();
  });

  it("renders the three Southern Utah fallback slides when the API returns []", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(JSON.stringify([]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    ) as unknown as typeof fetch;

    const { cleanupFetch } = renderWithClient(fetchImpl);
    cleanup = cleanupFetch;

    // Wait for the query to settle, then verify fallback titles render.
    await waitFor(() => {
      expect(
        screen.getByAltText("Southern Utah Red Rock Canyon at Golden Hour"),
      ).toBeInTheDocument();
    });
    expect(screen.getByAltText("Luxury Desert Estate from Above")).toBeInTheDocument();
    expect(screen.getByAltText("Active Commercial Construction Site")).toBeInTheDocument();

    // Three fallback indicator dots are rendered.
    const dots = screen.getAllByRole("button", { name: /^Go to slide \d+$/ });
    expect(dots).toHaveLength(3);
  });

  it("renders slides from the API when the response is non-empty", async () => {
    const apiSlides = [
      {
        id: 11,
        type: "image",
        title: "API Slide One",
        url: "/uploads/api-1.png",
        displayOrder: 1,
        isActive: true,
        createdAt: new Date(0).toISOString(),
        updatedAt: new Date(0).toISOString(),
      },
      {
        id: 22,
        type: "image",
        title: "API Slide Two",
        url: "/uploads/api-2.png",
        displayOrder: 2,
        isActive: true,
        createdAt: new Date(0).toISOString(),
        updatedAt: new Date(0).toISOString(),
      },
    ];
    const fetchImpl = vi.fn(async () =>
      new Response(JSON.stringify(apiSlides), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    ) as unknown as typeof fetch;

    const { cleanupFetch } = renderWithClient(fetchImpl);
    cleanup = cleanupFetch;

    await waitFor(() => {
      expect(screen.getByAltText("API Slide One")).toBeInTheDocument();
    });
    expect(screen.getByAltText("API Slide Two")).toBeInTheDocument();

    // Fallback titles must NOT render when the API returns data.
    expect(
      screen.queryByAltText("Southern Utah Red Rock Canyon at Golden Hour"),
    ).not.toBeInTheDocument();

    // Indicator dots match API slide count, not the fallback count.
    const dots = screen.getAllByRole("button", { name: /^Go to slide \d+$/ });
    expect(dots).toHaveLength(2);
  });
});
