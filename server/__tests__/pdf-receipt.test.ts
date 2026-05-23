import { describe, it, expect } from "vitest";
import { generateReceiptPdf } from "../pdf-receipt";

// The PDF receipt helper (server/pdf-receipt.ts) is invoked by the
// POST /api/bookings/:id/email-receipt route in server/routes.ts to
// produce a base64 attachment for SendGrid. Before this test landed it
// had zero automated coverage, so any layout-related throw (font,
// negative dimensions, wrap loop) would have only surfaced in
// production at email-send time. These tests drive the helper with a
// representative booking that exercises every conditional branch:
// project-name block, discount rows, multiple line items, and wrapped
// disclaimer text.

const PDF_MAGIC = "%PDF";

function startsWithPdfMagic(bytes: Uint8Array): boolean {
  return (
    bytes.length > 4 &&
    String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3]) === PDF_MAGIC
  );
}

describe("generateReceiptPdf", () => {
  it("produces valid PDF bytes for a representative booking with discount, project name, and disclaimers", async () => {
    const bytes = await generateReceiptPdf({
      receiptNumber: "RCPT-2026-0001",
      bookingDate: "May 10, 2026",
      customerName: "Jane Roe",
      email: "jane@example.com",
      paymentStatus: "Paid",
      projectName: "Sunset Ridge Estates – Aerial Tour",
      lineItems: [
        { name: "Aerial Photo Package", price: 350.0 },
        { name: "Virtual Tour Hosting (12 mo)", price: 240.0 },
      ],
      subtotal: 590.0,
      discount: 90.0,
      total: 500.0,
      hasDiscount: true,
      disclaimers: [
        {
          names: ["Aerial Photo Package"],
          text: "Aerial photography is subject to FAA Part 107 weather and airspace constraints; reshoots may be scheduled at no additional cost when conditions prevent a safe flight.",
        },
        {
          names: ["Virtual Tour Hosting (12 mo)"],
          text: "Hosting fees renew annually unless cancelled in writing 30 days prior to the renewal date.",
        },
      ],
    });

    expect(bytes).toBeInstanceOf(Uint8Array);
    expect(bytes.length).toBeGreaterThan(1000);
    expect(startsWithPdfMagic(bytes)).toBe(true);
  });

  it("produces a smaller-but-valid PDF for a no-discount, no-project, no-disclaimer booking", async () => {
    const bytes = await generateReceiptPdf({
      receiptNumber: "RCPT-2026-0002",
      bookingDate: "May 11, 2026",
      customerName: "John Doe",
      email: "john@example.com",
      paymentStatus: "Pending",
      projectName: null,
      lineItems: [{ name: "Single Aerial Photo", price: 75.0 }],
      subtotal: 75.0,
      discount: 0,
      total: 75.0,
      hasDiscount: false,
      disclaimers: [],
    });

    expect(bytes).toBeInstanceOf(Uint8Array);
    expect(bytes.length).toBeGreaterThan(500);
    expect(startsWithPdfMagic(bytes)).toBe(true);
  });

  it("base64-encodes cleanly so it can be passed straight to a SendGrid attachment payload", async () => {
    const bytes = await generateReceiptPdf({
      receiptNumber: "RCPT-2026-0003",
      bookingDate: "May 12, 2026",
      customerName: "Acme Realty",
      email: "ops@acme.example.com",
      paymentStatus: "Paid",
      projectName: "Acme HQ",
      lineItems: [
        { name: "Roof Inspection Flight", price: 199.99 },
        { name: "Edited Highlight Reel", price: 300.0 },
      ],
      subtotal: 499.99,
      discount: 49.99,
      total: 450.0,
      hasDiscount: true,
      disclaimers: [
        {
          names: ["Roof Inspection Flight", "Edited Highlight Reel"],
          text: "Deliverables are licensed for the client's marketing use; resale or sublicensing requires written consent.",
        },
      ],
    });

    const base64 = Buffer.from(bytes).toString("base64");
    // base64 should be non-empty, well-formed (no whitespace, only valid chars),
    // and round-trip back to bytes that still start with the PDF magic header.
    expect(base64.length).toBeGreaterThan(0);
    expect(base64).toMatch(/^[A-Za-z0-9+/]+=*$/);
    const roundTripped = Buffer.from(base64, "base64");
    expect(roundTripped.length).toBe(bytes.length);
    expect(roundTripped.subarray(0, 4).toString("utf8")).toBe(PDF_MAGIC);
  });
});
