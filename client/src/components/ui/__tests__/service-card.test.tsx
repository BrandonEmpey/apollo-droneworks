import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { ServiceCard } from "../service-card";
import { Service } from "@shared/schema";

function makeService(overrides: Partial<Service> = {}): Service {
  const now = new Date();
  return {
    id: 1,
    name: "Aerial Photography",
    slug: "aerial-photography",
    description: "Professional aerial photography services.",
    tooltipDescription: null,
    disclaimer: null,
    price: 29900,
    imageUrl: "/uploads/test.jpg",
    videoUrl: null,
    videoPlayback: "hover",
    images: [],
    videos: [],
    features: [],
    keywords: [],
    displayOrder: 1,
    classification: "Revenue Generation",
    aboutServiceContent: null,
    whatsIncludedContent: [],
    possibilities: [],
    processSteps: [],
    isSubscription: false,
    weeklySubscriptionEnabled: false,
    weeklyPrice: 0,
    weeklyPriceType: "fixed",
    weeklyPercentage: 0,
    biWeeklySubscriptionEnabled: false,
    biWeeklyPrice: 0,
    biWeeklyPriceType: "fixed",
    biWeeklyPercentage: 0,
    monthlySubscriptionEnabled: false,
    monthlyPrice: 0,
    monthlyPriceType: "fixed",
    monthlyPercentage: 0,
    billingFrequency: "monthly",
    frequencyDetails: null,
    pricingType: "flat",
    unitType: "unit",
    basePriceQuantity: 1,
    additionalPricePerUnit: 0,
    pricingDescription: null,
    priceRanges: [],
    pricingTiers: [],
    bundleDiscountPercentage: 0,
    availableAddOns: [],
    isAvailableAsAddon: false,
    addonPrice: 0,
    bundleConfigurations: [],
    featuredBadge: false,
    hideFromServicesPage: false,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  } as Service;
}

describe("ServiceCard - Serving Southern Utah badge", () => {
  it("renders the badge when featuredBadge is true", () => {
    render(React.createElement(ServiceCard, { service: makeService({ featuredBadge: true }) }));
    expect(screen.getByText("Serving Southern Utah")).toBeInTheDocument();
  });

  it("does not render the badge when featuredBadge is false", () => {
    render(React.createElement(ServiceCard, { service: makeService({ featuredBadge: false }) }));
    expect(screen.queryByText("Serving Southern Utah")).not.toBeInTheDocument();
  });

  it("toggles the badge between renders when featuredBadge changes", () => {
    const { rerender } = render(
      React.createElement(ServiceCard, { service: makeService({ featuredBadge: false }) })
    );
    expect(screen.queryByText("Serving Southern Utah")).not.toBeInTheDocument();

    rerender(
      React.createElement(ServiceCard, { service: makeService({ featuredBadge: true }) })
    );
    expect(screen.getByText("Serving Southern Utah")).toBeInTheDocument();

    rerender(
      React.createElement(ServiceCard, { service: makeService({ featuredBadge: false }) })
    );
    expect(screen.queryByText("Serving Southern Utah")).not.toBeInTheDocument();
  });
});
