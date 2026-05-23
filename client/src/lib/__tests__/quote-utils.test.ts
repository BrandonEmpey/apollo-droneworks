import { describe, it, expect } from "vitest";
import { calculateTotal, type QuoteData } from "@/lib/quote-utils";

const EMPTY: QuoteData = {
  timeEstimates: [],
  personnel: [],
  equipment: [],
  expenses: [],
  thirdPartyProducts: [],
};

describe("calculateTotal – empty input", () => {
  it("returns 0 when every section is empty", () => {
    expect(calculateTotal(EMPTY)).toBe(0);
  });
});

describe("calculateTotal – time estimates", () => {
  it("sums hours × rate across all line items", () => {
    const data: QuoteData = {
      ...EMPTY,
      timeEstimates: [
        { activity: "Pre-flight Planning", hours: 1, rate: 35 },
        { activity: "Time on-site", hours: 3, rate: 50 },
        { activity: "Photo Editing", hours: 2, rate: 40 },
      ],
    };
    // 1*35 + 3*50 + 2*40 = 265
    expect(calculateTotal(data)).toBe(265);
  });

  it("supports fractional hours", () => {
    const data: QuoteData = {
      ...EMPTY,
      timeEstimates: [{ activity: "Setup", hours: 0.5, rate: 100 }],
    };
    expect(calculateTotal(data)).toBe(50);
  });

  it("treats a zero-hour line item as no contribution", () => {
    const data: QuoteData = {
      ...EMPTY,
      timeEstimates: [
        { activity: "Skipped", hours: 0, rate: 200 },
        { activity: "Real", hours: 2, rate: 50 },
      ],
    };
    expect(calculateTotal(data)).toBe(100);
  });
});

describe("calculateTotal – personnel exclusion rules", () => {
  it("excludes Pilot in Command from the total (cost is captured in time estimates)", () => {
    const data: QuoteData = {
      ...EMPTY,
      personnel: [{ role: "Pilot in Command", hourlyRate: 50, quantity: 1 }],
    };
    expect(calculateTotal(data)).toBe(0);
  });

  it("excludes Pilot in Command regardless of quantity", () => {
    const data: QuoteData = {
      ...EMPTY,
      personnel: [{ role: "Pilot in Command", hourlyRate: 75, quantity: 4 }],
    };
    expect(calculateTotal(data)).toBe(0);
  });

  it("includes additional crew roles using hourlyRate × quantity", () => {
    const data: QuoteData = {
      ...EMPTY,
      personnel: [
        { role: "Pilot in Command", hourlyRate: 50, quantity: 1 },
        { role: "Visual Observer", hourlyRate: 40, quantity: 2 },
        { role: "Ground Crew", hourlyRate: 25, quantity: 1 },
      ],
    };
    // VO: 40*2 = 80; Ground Crew: 25*1 = 25; PIC excluded
    expect(calculateTotal(data)).toBe(105);
  });

  it("role match is case-sensitive; lowercase 'pilot in command' is NOT excluded", () => {
    const data: QuoteData = {
      ...EMPTY,
      personnel: [{ role: "pilot in command", hourlyRate: 50, quantity: 1 }],
    };
    expect(calculateTotal(data)).toBe(50);
  });
});

describe("calculateTotal – equipment toggling", () => {
  it("counts an included equipment item by its hourly rate", () => {
    const data: QuoteData = {
      ...EMPTY,
      equipment: [{ name: "DJI Mavic 3", hourlyRate: 20, included: true, quantity: 1 }],
    };
    expect(calculateTotal(data)).toBe(20);
  });

  it("ignores excluded equipment items", () => {
    const data: QuoteData = {
      ...EMPTY,
      equipment: [{ name: "Spare Battery", hourlyRate: 8, included: false, quantity: 1 }],
    };
    expect(calculateTotal(data)).toBe(0);
  });

  it("toggling an item from excluded to included adds its hourly rate", () => {
    const excluded: QuoteData = {
      ...EMPTY,
      equipment: [{ name: "ND Filters", hourlyRate: 10, included: false, quantity: 1 }],
    };
    const included: QuoteData = {
      ...excluded,
      equipment: [{ name: "ND Filters", hourlyRate: 10, included: true, quantity: 1 }],
    };
    expect(calculateTotal(included) - calculateTotal(excluded)).toBe(10);
  });

  it("equipment quantity does NOT multiply the cost (only hourlyRate counts)", () => {
    const data: QuoteData = {
      ...EMPTY,
      equipment: [{ name: "DJI Mavic 3", hourlyRate: 20, included: true, quantity: 5 }],
    };
    expect(calculateTotal(data)).toBe(20);
  });

  it("sums multiple included items", () => {
    const data: QuoteData = {
      ...EMPTY,
      equipment: [
        { name: "Drone", hourlyRate: 20, included: true, quantity: 1 },
        { name: "Filters", hourlyRate: 10, included: true, quantity: 1 },
        { name: "Battery", hourlyRate: 8, included: false, quantity: 1 },
      ],
    };
    expect(calculateTotal(data)).toBe(30);
  });
});

describe("calculateTotal – expenses", () => {
  it("adds each expense's cost to the total", () => {
    const data: QuoteData = {
      ...EMPTY,
      expenses: [
        { name: "Mileage", cost: 34, expenseType: "Travel" },
        { name: "Lodging", cost: 120, expenseType: "Travel" },
      ],
    };
    expect(calculateTotal(data)).toBe(154);
  });

  it("ignores expenseType when summing (all types are added)", () => {
    const data: QuoteData = {
      ...EMPTY,
      expenses: [
        { name: "Travel", cost: 50, expenseType: "Travel" },
        { name: "Meals", cost: 25, expenseType: "Meals" },
        { name: "Permit", cost: 75, expenseType: "Other" },
      ],
    };
    expect(calculateTotal(data)).toBe(150);
  });
});

describe("calculateTotal – third-party products", () => {
  it("adds each third-party product's cost to the total", () => {
    const data: QuoteData = {
      ...EMPTY,
      thirdPartyProducts: [
        { name: "Pix4D Processing", cost: 75, expenseType: "Other" },
        { name: "Print", cost: 40, expenseType: "Other" },
      ],
    };
    expect(calculateTotal(data)).toBe(115);
  });
});

describe("calculateTotal – combined scenarios", () => {
  it("aggregates time, personnel, equipment, expenses, and third-party products", () => {
    const data: QuoteData = {
      timeEstimates: [
        { activity: "Pre-flight Planning", hours: 1, rate: 35 },
        { activity: "Time on-site", hours: 3, rate: 50 },
        { activity: "Photo Editing", hours: 2, rate: 40 },
      ],
      personnel: [
        { role: "Pilot in Command", hourlyRate: 50, quantity: 1 },
        { role: "Visual Observer", hourlyRate: 40, quantity: 1 },
      ],
      equipment: [
        { name: "DJI Mavic 3", hourlyRate: 20, included: true, quantity: 1 },
        { name: "ND Filter Set", hourlyRate: 10, included: true, quantity: 1 },
      ],
      expenses: [{ name: "Mileage", cost: 34, expenseType: "Travel" }],
      thirdPartyProducts: [{ name: "Pix4D Processing", cost: 75, expenseType: "Other" }],
    };
    // time 265 + crew 40 + equipment 30 + expense 34 + 3rd-party 75 = 444
    expect(calculateTotal(data)).toBe(444);
  });
});
