import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { BookingServiceSummaryItem } from "../booking-page";
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

function renderItem(service: Service) {
  return render(
    React.createElement(BookingServiceSummaryItem, {
      service,
      selectedRange: null,
      isRangeBased: false,
      tierIdx: null,
      effectivePriceCents: service.price,
    })
  );
}

describe("BookingServiceSummaryItem – disclaimer rendering", () => {
  it("renders a disclaimer block when the service has a non-blank disclaimer", () => {
    const service = makeService({
      id: 10,
      name: "Real Estate Listings",
      disclaimer: "Weather may delay this shoot.",
    });

    renderItem(service);

    const block = screen.getByTestId("booking-line-disclaimer-10");
    expect(block).toBeInTheDocument();
    expect(block).toHaveTextContent("Weather may delay this shoot.");
  });

  it("renders no disclaimer block when the disclaimer is null", () => {
    const service = makeService({ id: 20, name: "Aerial Mapping", disclaimer: null });

    renderItem(service);

    expect(screen.queryByTestId("booking-line-disclaimer-20")).not.toBeInTheDocument();
  });

  it("renders no disclaimer block when the disclaimer is an empty string", () => {
    const service = makeService({ id: 30, name: "Timelapse Creation", disclaimer: "" });

    renderItem(service);

    expect(screen.queryByTestId("booking-line-disclaimer-30")).not.toBeInTheDocument();
  });

  it("trims whitespace-only disclaimers and treats them as absent", () => {
    const spaceOnly = makeService({ id: 40, name: "Roof Inspections", disclaimer: "   " });
    const tabNewline = makeService({ id: 50, name: "3D Modeling", disclaimer: "\n\t" });

    const { unmount } = renderItem(spaceOnly);
    expect(screen.queryByTestId("booking-line-disclaimer-40")).not.toBeInTheDocument();
    unmount();

    renderItem(tabNewline);
    expect(screen.queryByTestId("booking-line-disclaimer-50")).not.toBeInTheDocument();
  });
});
