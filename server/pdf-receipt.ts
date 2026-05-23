import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

interface ReceiptLineItem {
  name: string;
  price: number; // dollars (e.g. 150.00)
}

interface ReceiptData {
  receiptNumber: string;
  bookingDate: string;
  customerName: string;
  email: string;
  paymentStatus: string;
  projectName?: string | null;
  lineItems: ReceiptLineItem[];
  subtotal: number;
  discount: number;
  total: number;
  hasDiscount: boolean;
  disclaimers: Array<{ names: string[]; text: string }>;
}

// Brand colours
const NAVY = rgb(0.074, 0.149, 0.259); // #132642
const GOLD = rgb(0.780, 0.682, 0.416); // #C7AE6A
const GRAY = rgb(0.42, 0.447, 0.502);  // #6b7280
const BLACK = rgb(0.067, 0.094, 0.153); // #111827
const WHITE = rgb(1, 1, 1);
const LIGHT = rgb(0.976, 0.980, 0.984); // #f9fafb
const GREEN_BG = rgb(0.820, 0.976, 0.894); // #d1fae5
const GREEN_FG = rgb(0.024, 0.373, 0.275); // #065f46
const YELLOW_BG = rgb(0.996, 0.976, 0.761); // #fef9c3
const YELLOW_FG = rgb(0.573, 0.251, 0.055); // #92400e
const BORDER = rgb(0.898, 0.906, 0.922); // #e5e7eb

export async function generateReceiptPdf(data: ReceiptData): Promise<Uint8Array> {
  const doc = await PDFDocument.create();

  // Estimate required height so we produce one page that fits the content
  const baseHeight = 560;
  const lineItemHeight = data.lineItems.length * 24;
  const discountRowHeight = data.hasDiscount ? 48 : 0;
  const projectRowHeight = data.projectName ? 56 : 0;
  const disclaimerHeight = data.disclaimers.reduce((acc, d) => {
    const lines = Math.ceil(d.text.length / 68) + 2;
    return acc + lines * 13 + 24;
  }, data.disclaimers.length > 0 ? 36 : 0);

  const pageHeight = baseHeight + lineItemHeight + discountRowHeight + projectRowHeight + disclaimerHeight;
  const pageWidth = 595; // A4-ish width

  const page = doc.addPage([pageWidth, pageHeight]);
  const helveticaBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const helvetica = await doc.embedFont(StandardFonts.Helvetica);

  let y = pageHeight;

  // ── Header ──────────────────────────────────────────────────────────────
  const headerH = 100;
  page.drawRectangle({ x: 0, y: y - headerH, width: pageWidth, height: headerH, color: NAVY });
  // Gold bottom border on header
  page.drawRectangle({ x: 0, y: y - headerH, width: pageWidth, height: 3, color: GOLD });

  page.drawText("Apollo DroneWorks", {
    x: pageWidth / 2 - helveticaBold.widthOfTextAtSize("Apollo DroneWorks", 22) / 2,
    y: y - 38,
    size: 22,
    font: helveticaBold,
    color: GOLD,
  });
  page.drawText("Professional Drone Services", {
    x: pageWidth / 2 - helvetica.widthOfTextAtSize("Professional Drone Services", 10) / 2,
    y: y - 56,
    size: 10,
    font: helvetica,
    color: rgb(0.8, 0.8, 0.8),
  });
  page.drawText("Service Receipt", {
    x: pageWidth / 2 - helveticaBold.widthOfTextAtSize("Service Receipt", 14) / 2,
    y: y - 80,
    size: 14,
    font: helveticaBold,
    color: WHITE,
  });

  y -= headerH + 4; // small gap after header

  // ── Receipt info row ─────────────────────────────────────────────────────
  const infoY = y - 20;
  // Left column: Receipt Number
  page.drawText("RECEIPT NUMBER", { x: 40, y: infoY, size: 8, font: helveticaBold, color: GRAY });
  page.drawText(data.receiptNumber, { x: 40, y: infoY - 14, size: 11, font: helvetica, color: BLACK });

  // Right column: Date
  const dateLabel = "DATE";
  const dateLabelW = helveticaBold.widthOfTextAtSize(dateLabel, 8);
  page.drawText(dateLabel, { x: pageWidth - 40 - dateLabelW, y: infoY, size: 8, font: helveticaBold, color: GRAY });
  const dateValueW = helvetica.widthOfTextAtSize(data.bookingDate, 11);
  page.drawText(data.bookingDate, { x: pageWidth - 40 - dateValueW, y: infoY - 14, size: 11, font: helvetica, color: BLACK });

  y -= 52;

  // ── Customer / Payment row ───────────────────────────────────────────────
  page.drawText("CUSTOMER", { x: 40, y, size: 8, font: helveticaBold, color: GRAY });
  page.drawText(data.customerName, { x: 40, y: y - 14, size: 11, font: helvetica, color: BLACK });
  page.drawText(data.email, { x: 40, y: y - 28, size: 10, font: helvetica, color: GRAY });

  // Payment status badge
  const statusLabel = "PAYMENT STATUS";
  const statusLabelW = helveticaBold.widthOfTextAtSize(statusLabel, 8);
  page.drawText(statusLabel, { x: pageWidth - 40 - statusLabelW, y, size: 8, font: helveticaBold, color: GRAY });

  const isPaid = data.paymentStatus === "Paid";
  const badgeBg = isPaid ? GREEN_BG : YELLOW_BG;
  const badgeFg = isPaid ? GREEN_FG : YELLOW_FG;
  const badgeText = data.paymentStatus;
  const badgeTextW = helveticaBold.widthOfTextAtSize(badgeText, 10);
  const badgePadX = 10;
  const badgeW = badgeTextW + badgePadX * 2;
  const badgeH = 18;
  const badgeX = pageWidth - 40 - badgeW;
  const badgeY = y - 30;
  page.drawRectangle({ x: badgeX, y: badgeY, width: badgeW, height: badgeH, color: badgeBg });
  page.drawText(badgeText, { x: badgeX + badgePadX, y: badgeY + 5, size: 10, font: helveticaBold, color: badgeFg });

  y -= 56;

  // ── Project name ─────────────────────────────────────────────────────────
  if (data.projectName) {
    page.drawRectangle({ x: 40, y: y - 44, width: pageWidth - 80, height: 44, color: LIGHT });
    page.drawText("PROJECT NAME", { x: 52, y: y - 16, size: 8, font: helveticaBold, color: GRAY });
    page.drawText(data.projectName, { x: 52, y: y - 30, size: 12, font: helveticaBold, color: GOLD });
    y -= 56;
  }

  // ── Services table ────────────────────────────────────────────────────────
  // Header row
  page.drawLine({ start: { x: 40, y }, end: { x: pageWidth - 40, y }, thickness: 1.5, color: GOLD });
  page.drawText("SERVICE", { x: 52, y: y - 14, size: 8, font: helveticaBold, color: GRAY });
  page.drawText("PRICE", { x: pageWidth - 40 - helveticaBold.widthOfTextAtSize("PRICE", 8), y: y - 14, size: 8, font: helveticaBold, color: GRAY });
  y -= 24;
  page.drawLine({ start: { x: 40, y }, end: { x: pageWidth - 40, y }, thickness: 0.5, color: GOLD });

  // Line items
  for (const item of data.lineItems) {
    y -= 22;
    page.drawText(item.name, { x: 52, y, size: 10, font: helvetica, color: BLACK });
    const priceStr = `$${item.price.toFixed(2)}`;
    page.drawText(priceStr, { x: pageWidth - 40 - helvetica.widthOfTextAtSize(priceStr, 10), y, size: 10, font: helvetica, color: BLACK });
    page.drawLine({ start: { x: 40, y: y - 6 }, end: { x: pageWidth - 40, y: y - 6 }, thickness: 0.4, color: BORDER });
  }

  // Discount rows
  if (data.hasDiscount) {
    y -= 22;
    page.drawText("Subtotal", { x: 52, y, size: 10, font: helvetica, color: GRAY });
    const subStr = `$${data.subtotal.toFixed(2)}`;
    page.drawText(subStr, { x: pageWidth - 40 - helvetica.widthOfTextAtSize(subStr, 10), y, size: 10, font: helvetica, color: GRAY });

    y -= 22;
    page.drawText("Discount", { x: 52, y, size: 10, font: helvetica, color: rgb(0.086, 0.639, 0.239) });
    const discStr = `-$${data.discount.toFixed(2)}`;
    page.drawText(discStr, { x: pageWidth - 40 - helvetica.widthOfTextAtSize(discStr, 10), y, size: 10, font: helvetica, color: rgb(0.086, 0.639, 0.239) });
  }

  // Total row
  page.drawLine({ start: { x: 40, y: y - 6 }, end: { x: pageWidth - 40, y: y - 6 }, thickness: 1.5, color: GOLD });
  y -= 24;
  page.drawRectangle({ x: 40, y: y - 10, width: pageWidth - 80, height: 28, color: LIGHT });
  const totalLabel = data.hasDiscount ? "Total Due" : "Total";
  page.drawText(totalLabel, { x: 52, y: y + 4, size: 12, font: helveticaBold, color: BLACK });
  const totalStr = `$${data.total.toFixed(2)}`;
  page.drawText(totalStr, { x: pageWidth - 40 - helveticaBold.widthOfTextAtSize(totalStr, 14), y: y + 2, size: 14, font: helveticaBold, color: GOLD });

  y -= 28;

  // ── Disclaimers ───────────────────────────────────────────────────────────
  if (data.disclaimers.length > 0) {
    y -= 16;
    page.drawText("SERVICE DISCLAIMERS", { x: 40, y, size: 8, font: helveticaBold, color: GRAY });
    y -= 12;

    for (const d of data.disclaimers) {
      const names = d.names.join(", ");
      // Wrap long disclaimer text
      const words = d.text.split(" ");
      const wrappedLines: string[] = [];
      let currentLine = "";
      const maxW = pageWidth - 80 - 24; // account for padding
      for (const word of words) {
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        if (helvetica.widthOfTextAtSize(testLine, 9) > maxW) {
          if (currentLine) wrappedLines.push(currentLine);
          currentLine = word;
        } else {
          currentLine = testLine;
        }
      }
      if (currentLine) wrappedLines.push(currentLine);

      const blockH = (wrappedLines.length + 1) * 13 + 16;
      // Draw left gold border accent
      page.drawRectangle({ x: 40, y: y - blockH, width: pageWidth - 80, height: blockH, color: rgb(0.980, 0.973, 0.949) });
      page.drawRectangle({ x: 40, y: y - blockH, width: 3, height: blockH, color: GOLD });

      page.drawText(names, { x: 52, y: y - 12, size: 9, font: helveticaBold, color: BLACK });
      for (let i = 0; i < wrappedLines.length; i++) {
        page.drawText(wrappedLines[i], { x: 52, y: y - 24 - i * 13, size: 9, font: helvetica, color: GRAY });
      }

      y -= blockH + 8;
    }
  }

  // ── Footer ────────────────────────────────────────────────────────────────
  y -= 16;
  page.drawLine({ start: { x: 40, y }, end: { x: pageWidth - 40, y }, thickness: 0.5, color: BORDER });
  y -= 16;
  const thankYou = "Thank you for choosing Apollo DroneWorks!";
  page.drawText(thankYou, {
    x: pageWidth / 2 - helvetica.widthOfTextAtSize(thankYou, 11) / 2,
    y,
    size: 11,
    font: helvetica,
    color: GRAY,
  });
  const contact = "Questions? Contact us at support@apollodroneworks.com";
  page.drawText(contact, {
    x: pageWidth / 2 - helvetica.widthOfTextAtSize(contact, 9) / 2,
    y: y - 14,
    size: 9,
    font: helvetica,
    color: rgb(0.612, 0.639, 0.675),
  });

  const pdfBytes = await doc.save();
  return pdfBytes;
}
