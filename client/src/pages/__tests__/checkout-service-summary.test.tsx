import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { CheckoutServiceSummary } from "../../components/client/checkout-service-summary";
import type { Service } from "@shared/schema";

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

describe("CheckoutServiceSummary – per-line disclaimers", () => {
  it("renders a disclaimer block for each service that has one, plus the acknowledgement note", () => {
    const primary = makeService({
      id: 10,
      name: "Real Estate Listings",
      disclaimer: "Weather may delay this shoot.",
    });
    const additional = makeService({
      id: 20,
      name: "Roof Inspections",
      disclaimer: "Permit may be required for certain heights.",
    });

    render(
      React.createElement(CheckoutServiceSummary, {
        primaryService: primary,
        selectedServices: [additional],
        totalAmount: "549.00",
      })
    );

    expect(
      screen.getByTestId("checkout-line-disclaimer-10")
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("checkout-line-disclaimer-10")
    ).toHaveTextContent("Weather may delay this shoot.");

    expect(
      screen.getByTestId("checkout-line-disclaimer-20")
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("checkout-line-disclaimer-20")
    ).toHaveTextContent("Permit may be required for certain heights.");

    expect(screen.getByTestId("checkout-disclaimers")).toBeInTheDocument();
    expect(screen.getByTestId("checkout-disclaimers")).toHaveTextContent(
      /acknowledge the service disclaimer/i
    );
  });

  it("renders nothing for services without disclaimers and omits the acknowledgement note", () => {
    const primary = makeService({ id: 10, name: "Aerial Mapping", disclaimer: null });
    const additional = makeService({ id: 20, name: "Timelapse Creation", disclaimer: "" });

    render(
      React.createElement(CheckoutServiceSummary, {
        primaryService: primary,
        selectedServices: [additional],
        totalAmount: "349.00",
      })
    );

    expect(
      screen.queryByTestId("checkout-line-disclaimer-10")
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId("checkout-line-disclaimer-20")
    ).not.toBeInTheDocument();
    expect(screen.queryByTestId("checkout-disclaimers")).not.toBeInTheDocument();
  });

  it("shows only the primary service disclaimer when only it has one", () => {
    const primary = makeService({
      id: 10,
      name: "Real Estate Listings",
      disclaimer: "Only primary has this disclaimer.",
    });
    const additional = makeService({ id: 20, name: "Timelapse Creation", disclaimer: null });

    render(
      React.createElement(CheckoutServiceSummary, {
        primaryService: primary,
        selectedServices: [additional],
        totalAmount: "299.00",
      })
    );

    expect(screen.getByTestId("checkout-line-disclaimer-10")).toBeInTheDocument();
    expect(screen.queryByTestId("checkout-line-disclaimer-20")).not.toBeInTheDocument();
    expect(screen.getByTestId("checkout-disclaimers")).toBeInTheDocument();
  });

  it("shows only the additional service disclaimer when only it has one", () => {
    const primary = makeService({ id: 10, name: "Real Estate Listings", disclaimer: null });
    const additional = makeService({
      id: 20,
      name: "Roof Inspections",
      disclaimer: "Only additional has this disclaimer.",
    });

    render(
      React.createElement(CheckoutServiceSummary, {
        primaryService: primary,
        selectedServices: [additional],
        totalAmount: "299.00",
      })
    );

    expect(screen.queryByTestId("checkout-line-disclaimer-10")).not.toBeInTheDocument();
    expect(screen.getByTestId("checkout-line-disclaimer-20")).toBeInTheDocument();
    expect(screen.getByTestId("checkout-disclaimers")).toBeInTheDocument();
  });

  it("trims whitespace-only disclaimers and treats them as absent", () => {
    const primary = makeService({ id: 10, disclaimer: "   " });
    const additional = makeService({ id: 20, disclaimer: "\n\t" });

    render(
      React.createElement(CheckoutServiceSummary, {
        primaryService: primary,
        selectedServices: [additional],
        totalAmount: "0.00",
      })
    );

    expect(screen.queryByTestId("checkout-line-disclaimer-10")).not.toBeInTheDocument();
    expect(screen.queryByTestId("checkout-line-disclaimer-20")).not.toBeInTheDocument();
    expect(screen.queryByTestId("checkout-disclaimers")).not.toBeInTheDocument();
  });
});
