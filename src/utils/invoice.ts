import PDFDocument from "pdfkit";
import type { Response } from "express";
import type { Order, OrderItem } from "../generated/prisma/client";
import fs from "fs";
import path from "path";

const FONT_PATH = path.join(
  __dirname,
  "..",
  "..",
  "fonts",
  "NotoSansBengali-Regular.ttf"
);

const hasBanglaFont = fs.existsSync(FONT_PATH);

if (!hasBanglaFont) {
  console.error(`[invoice] Bangla font not found at ${FONT_PATH}`);
}

type InvoiceOrder = Order & {
  items: OrderItem[];
};

/* =========================================================
   FETCH REMOTE IMAGE
========================================================= */

async function fetchImageBuffer(
  url: string | null | undefined
): Promise<Buffer | null> {
  if (!url) return null;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: "image/*" },
    });

    clearTimeout(timeout);

    if (!response.ok) return null;

    const contentType = response.headers.get("content-type") || "";
    if (!contentType.startsWith("image/")) return null;

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (error) {
    console.error("[invoice] Image fetch error:", error);
    return null;
  }
}

/* =========================================================
   MAIN PDF GENERATOR
========================================================= */

export async function streamInvoicePdf(res: Response, order: InvoiceOrder) {
  const doc = new PDFDocument({
    size: "A4",
    margin: 0,
    bufferPages: true,
    info: {
      Title: `Invoice ${order.orderNumber}`,
      Author: "ShopScape",
      Subject: "ShopScape Order Invoice",
      Creator: "ShopScape",
    },
  });

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="invoice-${order.orderNumber}.pdf"`
  );
  res.setHeader("Access-Control-Expose-Headers", "Content-Disposition");

  doc.pipe(res);

  /* =======================================================
     COLOR PALETTE (SOFT & BALANCED)
  ======================================================= */
  const BG = "#F8FAFC";           // Subtle Background
  const WHITE = "#FFFFFF";        // Container Card
  const TEXT_MAIN = "#334155";    // Slate 700 (Slightly softer than Slate 900)
  const TEXT_MUTED = "#64748B";   // Slate 500
  const PRIMARY = "#6366F1";      // Indigo 500 (Softened primary accent)
  const PRIMARY_LIGHT = "#EEF2FF"; // Soft Indigo 50
  const ACCENT = "#10B981";       // Emerald 500
  const BORDER = "#E2E8F0";       // Soft Border
  const TABLE_TH = "#F8FAFC";     // Light Table Header
  const IMAGE_BG = "#F1F5F9";

  const pageWidth = doc.page.width;
  const pageHeight = doc.page.height;
  const margin = 32;
  const contentWidth = pageWidth - margin * 2;

  // Fill Page Background
  doc.rect(0, 0, pageWidth, pageHeight).fill(BG);

  /* =======================================================
     HELPERS
  ======================================================= */
  function setFont(size = 9, isBold = false) {
    if (hasBanglaFont) {
      doc.font(FONT_PATH);
    } else {
      doc.font(isBold ? "Helvetica-Bold" : "Helvetica");
    }
    doc.fontSize(size);
  }

  function money(value: number | string | null | undefined) {
    return `৳${Number(value ?? 0).toLocaleString("en-BD")}`;
  }

  function formatDate(date: Date) {
    return new Intl.DateTimeFormat("en-BD", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(new Date(date));
  }

  function drawPlaceholder(x: number, y: number, width: number, height: number) {
    doc.roundedRect(x, y, width, height, 6).fill(IMAGE_BG);
    setFont(7);
    doc.fillColor(TEXT_MUTED).text("No Image", x, y + height / 2 - 4, {
      width,
      align: "center",
    });
  }

  /* =======================================================
     CALCULATE DYNAMIC CARD HEIGHT
  ======================================================= */
  const headerHeight = 140;
  const infoHeight = 110;
  const tableHeaderHeight = 28;
  const rowHeight = 72;
  const itemsHeight = order.items.length * rowHeight;
  const footerNoteHeight = 60;
  const padding = 40;

  const calculatedCardHeight =
    headerHeight + infoHeight + tableHeaderHeight + itemsHeight + footerNoteHeight + padding;

  const cardX = margin;
  const cardY = 28;
  const cardWidth = contentWidth;
  const cardHeight = Math.min(Math.max(calculatedCardHeight, 500), pageHeight - cardY * 2);

  // Main Card Container
  doc
    .roundedRect(cardX, cardY, cardWidth, cardHeight, 12)
    .fillAndStroke(WHITE, BORDER);

  /* =======================================================
     HEADER SECTION (LOGO & BRAND)
  ====================================================== */
  const logoSize = 36;
  const logoX = cardX + cardWidth / 2 - logoSize / 2;
  const logoY = cardY + 24;

  // Soft Logo Box
  doc.roundedRect(logoX, logoY, logoSize, logoSize, 10).fill(PRIMARY_LIGHT);
  setFont(18, true);
  doc.fillColor(PRIMARY).text("S", logoX, logoY + 6, {
    width: logoSize,
    align: "center",
  });

  // Brand Name & Subtitle
  setFont(14, true);
  doc.fillColor(TEXT_MAIN).text("ShopScape", cardX, logoY + 42, {
    width: cardWidth,
    align: "center",
  });

  setFont(8.5);
  doc
    .fillColor(TEXT_MUTED)
    .text("Mohammadpur, Dhaka, Bangladesh", cardX, logoY + 62, {
      width: cardWidth,
      align: "center",
    });

  // Soft Badge: INVOICE
  const badgeWidth = 68;
  const badgeX = cardX + cardWidth / 2 - badgeWidth / 2;
  const badgeY = logoY + 78;

  doc.roundedRect(badgeX, badgeY, badgeWidth, 18, 9).fill(PRIMARY_LIGHT);
  setFont(7.5, true);
  doc.fillColor(PRIMARY).text("INVOICE", badgeX, badgeY + 4, {
    width: badgeWidth,
    align: "center",
  });

  // Soft Divider Line
  const dividerY = badgeY + 28;
  doc
    .moveTo(cardX + 24, dividerY)
    .lineTo(cardX + cardWidth - 24, dividerY)
    .strokeColor(BORDER)
    .lineWidth(0.6)
    .stroke();

  /* =======================================================
     ORDER & CUSTOMER METADATA (2-COLUMN GRID)
  ====================================================== */
  const gridY = dividerY + 16;
  const col1X = cardX + 24;
  const col2X = cardX + cardWidth / 2 + 10;
  const labelWidth = 65;

  const addressText = [
    order.division,
    order.district,
    order.area,
    order.addressLine,
  ]
    .filter(Boolean)
    .join(", ");

  const paymentLabel =
    order.paymentMethod === "BKASH"
      ? "bKash"
      : order.paymentMethod === "NAGAD"
      ? "Nagad"
      : "Cash on Delivery";

  let currentInfoY = gridY;

  const renderField = (x: number, y: number, label: string, val: string, valColor = TEXT_MAIN, isBold = false) => {
    setFont(8.5, false);
    doc.fillColor(TEXT_MUTED).text(label, x, y);
    setFont(8.5, isBold);
    doc.fillColor(valColor).text(`:  ${val}`, x + labelWidth, y, {
      width: cardWidth / 2 - labelWidth - 30,
    });
  };

  renderField(col1X, currentInfoY, "Order ID", order.orderNumber, PRIMARY, true);
  renderField(col2X, currentInfoY, "Date", formatDate(order.createdAt));

  currentInfoY += 18;
  renderField(col1X, currentInfoY, "Customer", order.fullName || "N/A", TEXT_MAIN, true);
  renderField(col2X, currentInfoY, "Payment", paymentLabel);

  currentInfoY += 18;
  renderField(col1X, currentInfoY, "Mobile", order.phone);
  renderField(col2X, currentInfoY, "Total COD", money(order.total), ACCENT, true);

  currentInfoY += 18;
  renderField(col1X, currentInfoY, "Address", addressText || "N/A");

  /* =======================================================
     FETCH IMAGES IN PARALLEL
  ====================================================== */
  const itemImages = await Promise.all(
    order.items.map((item) =>
      item.selectedImageUrl ? fetchImageBuffer(item.selectedImageUrl) : null
    )
  );

  /* =======================================================
     ITEMS TABLE
  ====================================================== */
  const tableX = cardX + 20;
  const tableY = currentInfoY + 28;
  const tableWidth = cardWidth - 40;

  const colImgW = 65;
  const colPriceW = 90;
  const colProductW = tableWidth - colImgW - colPriceW;

  // Table Header
  doc
    .roundedRect(tableX, tableY, tableWidth, tableHeaderHeight, 6)
    .fillAndStroke(TABLE_TH, BORDER);

  setFont(8, true);
  doc.fillColor(TEXT_MUTED);
  doc.text("Image", tableX + 12, tableY + 8);
  doc.text("Product Details", tableX + colImgW + 8, tableY + 8);
  doc.text("Total", tableX + colImgW + colProductW + 8, tableY + 8, {
    width: colPriceW - 16,
    align: "right",
  });

  // Table Rows
  let rowY = tableY + tableHeaderHeight + 6;

  for (const [index, item] of order.items.entries()) {
    doc
      .roundedRect(tableX, rowY, tableWidth, rowHeight - 6, 6)
      .fillAndStroke(WHITE, BORDER);

    const imgX = tableX + 8;
    const imgY = rowY + 6;
    const imgSize = 54;
    const imgBuffer = itemImages[index];

    if (imgBuffer) {
      try {
        doc.save();
        doc.roundedRect(imgX, imgY, imgSize, imgSize, 4).clip();
        doc.image(imgBuffer, imgX, imgY, {
          fit: [imgSize, imgSize],
          align: "center",
          valign: "center",
        });
        doc.restore();
      } catch {
        drawPlaceholder(imgX, imgY, imgSize, imgSize);
      }
    } else {
      drawPlaceholder(imgX, imgY, imgSize, imgSize);
    }

    const prodX = tableX + colImgW + 8;
    let detailTextY = rowY + 8;

    setFont(8.5, true);
    doc.fillColor(TEXT_MAIN).text(item.name, prodX, detailTextY, {
      width: colProductW - 16,
      height: 18,
      ellipsis: true,
    });

    detailTextY += 15;
    setFont(8);

    const attributes = [];
    if (item.selectedSize) attributes.push(`Size: ${item.selectedSize}`);
    if (item.selectedColor) attributes.push(`Color: ${item.selectedColor}`);

    if (attributes.length > 0) {
      doc.fillColor(TEXT_MUTED).text(attributes.join("  |  "), prodX, detailTextY);
      detailTextY += 12;
    }

    doc
      .fillColor(TEXT_MUTED)
      .text(`Qty: ${item.quantity} × ${money(item.price)}`, prodX, detailTextY);

    const priceX = tableX + colImgW + colProductW + 8;
    const totalItemPrice = Number(item.price) * Number(item.quantity);

    setFont(9, true);
    doc
      .fillColor(TEXT_MAIN)
      .text(money(totalItemPrice), priceX, rowY + (rowHeight - 6) / 2 - 6, {
        width: colPriceW - 20,
        align: "right",
      });

    rowY += rowHeight;
  }

  /* =======================================================
     THANK YOU NOTE & FOOTER
  ====================================================== */
  const noteY = rowY + 10;
  const noteWidth = cardWidth - 40;

  doc
    .roundedRect(cardX + 20, noteY, noteWidth, 34, 6)
    .fill(PRIMARY_LIGHT);

  setFont(8, false);
  doc.fillColor(PRIMARY).text(
    `প্রিয় ${order.fullName || "গ্রাহক"}, ShopScape-এ কেনাকাটা করার জন্য আপনাকে ধন্যবাদ।`,
    cardX + 20,
    noteY + 11,
    {
      width: noteWidth,
      align: "center",
    }
  );

  setFont(7.5);
  doc
    .fillColor(TEXT_MUTED)
    .text(
      `ShopScape E-Commerce System  •  Invoice: ${order.orderNumber}`,
      margin,
      pageHeight - 24,
      {
        width: contentWidth,
        align: "center",
      }
    );

  doc.end();
}