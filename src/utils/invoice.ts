import PDFDocument from "pdfkit";
import type { Response } from "express";
import type { Order, OrderItem } from "@prisma/client";
import fs from "fs";
import path from "path";

const STATUS_LABELS_BN: Record<string, string> = {
  PENDING: "অপেক্ষমান",
  CONFIRMED: "নিশ্চিত হয়েছে",
  PROCESSING: "প্রসেসিং চলছে",
  SHIPPED: "পাঠানো হয়েছে",
  DELIVERED: "ডেলিভারি হয়েছে",
  CANCELLED: "বাতিল হয়েছে",
};

const FONT_PATH = path.join(
  process.cwd(),
  "fonts",
  "NotoSansBengali-Regular.ttf"
);

const hasBanglaFont = fs.existsSync(FONT_PATH);

type InvoiceOrder = Order & {
  items: OrderItem[];
};

export function streamInvoicePdf(
  res: Response,
  order: InvoiceOrder
) {
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

  doc.pipe(res);

  // --------------------------------------------------
  // COLORS
  // --------------------------------------------------

  const BG = "#F5F6FF";
  const WHITE = "#FFFFFF";
  const TEXT = "#171717";
  const MUTED = "#777777";
  const PURPLE = "#7B3FA0";
  const PINK = "#FF2E88";
  const ORANGE = "#FF5A00";
  const GREEN = "#20D5A5";
  const BORDER = "#E2E4EC";
  const LIGHT = "#FAFAFC";

  // --------------------------------------------------
  // PAGE
  // --------------------------------------------------

  const pageWidth = doc.page.width;
  const pageHeight = doc.page.height;

  const margin = 35;
  const contentWidth = pageWidth - margin * 2;

  // Background
  doc.rect(0, 0, pageWidth, pageHeight).fill(BG);

  // --------------------------------------------------
  // HELPERS
  // --------------------------------------------------

  function setFont(size = 10) {
    if (hasBanglaFont) {
      doc.font(FONT_PATH);
    } else {
      doc.font("Helvetica");
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

  function roundedCard(
    x: number,
    y: number,
    width: number,
    height: number,
    radius = 7
  ) {
    doc
      .roundedRect(x, y, width, height, radius)
      .fillAndStroke(WHITE, BORDER);
  }

  function line(
    x1: number,
    y1: number,
    x2: number,
    y2: number
  ) {
    doc
      .moveTo(x1, y1)
      .lineTo(x2, y2)
      .strokeColor(BORDER)
      .stroke();
  }

  // --------------------------------------------------
  // INVOICE CARD
  // --------------------------------------------------

  const cardX = margin;
  const cardY = 35;
  const cardWidth = contentWidth;
  const cardHeight = 680;

  roundedCard(
    cardX,
    cardY,
    cardWidth,
    cardHeight,
    7
  );

  // --------------------------------------------------
  // INVOICE TITLE
  // --------------------------------------------------

  setFont(16);

  doc
    .fillColor(PURPLE)
    .text(
      "INVOICE",
      cardX,
      cardY + 28,
      {
        width: cardWidth,
        align: "center",
      }
    );

  // --------------------------------------------------
  // SHOPSCAPE LOGO
  // --------------------------------------------------

  const logoSize = 46;

  const logoX =
    cardX + cardWidth / 2 - logoSize / 2;

  const logoY = cardY + 65;

  doc
    .roundedRect(
      logoX,
      logoY,
      logoSize,
      logoSize,
      11
    )
    .fill(ORANGE);

  setFont(28);

  doc
    .fillColor(WHITE)
    .text(
      "S",
      logoX,
      logoY + 5,
      {
        width: logoSize,
        align: "center",
      }
    );

  // --------------------------------------------------
  // SHOP NAME
  // --------------------------------------------------

  setFont(16);

  doc
    .fillColor(TEXT)
    .text(
      "ShopScape",
      cardX,
      logoY + 57,
      {
        width: cardWidth,
        align: "center",
      }
    );

  setFont(10);

  doc
    .fillColor(TEXT)
    .text(
      "Mohammadpur, Dhaka, Bangladesh",
      cardX,
      logoY + 81,
      {
        width: cardWidth,
        align: "center",
      }
    );

  // --------------------------------------------------
  // DIVIDER
  // --------------------------------------------------

  const dividerY = logoY + 118;

  line(
    cardX + 20,
    dividerY,
    cardX + cardWidth - 20,
    dividerY
  );

  // --------------------------------------------------
  // ORDER INFORMATION
  // --------------------------------------------------

  let infoY = dividerY + 28;

  const labelX = cardX + 25;
  const valueX = cardX + 105;

  setFont(9.5);

  // Order ID
  doc.fillColor(TEXT).text(
    "Order ID",
    labelX,
    infoY
  );

  doc
    .fillColor(TEXT)
    .text(
      `: ${order.orderNumber}`,
      valueX,
      infoY
    );

  // Mobile
  infoY += 22;

  doc.fillColor(TEXT).text(
    "Mobile",
    labelX,
    infoY
  );

  doc.text(
    `: ${order.phone}`,
    valueX,
    infoY
  );

  // Name
  infoY += 22;

  doc.fillColor(TEXT).text(
    "Name",
    labelX,
    infoY
  );

  doc.text(
    `: ${order.fullName}`,
    valueX,
    infoY
  );

  // Address
  infoY += 22;

  doc.fillColor(TEXT).text(
    "Address",
    labelX,
    infoY
  );

  const address = [
    order.division,
    order.district,
    order.area,
    order.addressLine,
  ]
    .filter(Boolean)
    .join(" > ");

  doc.text(
    `: ${address}`,
    valueX,
    infoY,
    {
      width: cardWidth - 145,
    }
  );

  // COD
  infoY += 22;

  doc.fillColor(TEXT).text(
    "COD TK",
    labelX,
    infoY
  );

  setFont(10);

  doc
    .fillColor(PINK)
    .text(
      `: ${money(order.total)}`,
      valueX,
      infoY
    );

  // --------------------------------------------------
  // ORDER ITEMS TABLE
  // --------------------------------------------------

  const tableX = cardX + 20;

  const tableY = infoY + 30;

  const tableWidth = cardWidth - 40;

  const imageWidth = 85;
  const productWidth = 300;
  const priceWidth =
    tableWidth - imageWidth - productWidth;

  const headerHeight = 32;

  // Header
  doc
    .rect(
      tableX,
      tableY,
      tableWidth,
      headerHeight
    )
    .fill(LIGHT);

  doc
    .rect(
      tableX,
      tableY,
      tableWidth,
      headerHeight
    )
    .strokeColor(BORDER)
    .stroke();

  setFont(9);

  doc
    .fillColor(TEXT)
    .text(
      "Image",
      tableX + 8,
      tableY + 10
    );

  doc.text(
    "Product_Info",
    tableX + imageWidth + 8,
    tableY + 10
  );

  doc.text(
    "Price",
    tableX +
      imageWidth +
      productWidth +
      8,
    tableY + 10
  );

  // --------------------------------------------------
  // TABLE ROWS
  // --------------------------------------------------

  let currentY =
    tableY + headerHeight;

  for (const item of order.items) {
    const rowHeight = 72;

    doc
      .rect(
        tableX,
        currentY,
        tableWidth,
        rowHeight
      )
      .fillAndStroke(
        WHITE,
        BORDER
      );

    // Vertical line 1
    line(
      tableX + imageWidth,
      currentY,
      tableX + imageWidth,
      currentY + rowHeight
    );

    // Vertical line 2
    line(
      tableX +
        imageWidth +
        productWidth,
      currentY,
      tableX +
        imageWidth +
        productWidth,
      currentY + rowHeight
    );

    // ------------------------------------------------
    // PRODUCT IMAGE
    // ------------------------------------------------

    const possibleImage =
      (item as OrderItem & {
        image?: string | null;
        imageUrl?: string | null;
      }).imageUrl ??
      (item as OrderItem & {
        image?: string | null;
      }).image ??
      null;

    if (possibleImage) {
      try {
        doc.image(
          possibleImage,
          tableX + 8,
          currentY + 8,
          {
            fit: [60, 55],
            align: "center",
            valign: "center",
          }
        );
      } catch {
        // Ignore invalid image URL/path
      }
    }

    // ------------------------------------------------
    // PRODUCT INFO
    // ------------------------------------------------

    const productX =
      tableX + imageWidth + 8;

    setFont(9);

    doc
      .fillColor("#555555")
      .text(
        `Code: ${
          (item as any).productCode ??
          (item as any).code ??
          "-"
        }`,
        productX,
        currentY + 10
      );

    const size =
      (item as any).size ??
      "-";

    doc.text(
      `Size: ${size}`,
      productX,
      currentY + 26
    );

    doc.text(
      `Qty: ${item.quantity} X ${money(
        Number(item.price)
      )}`,
      productX,
      currentY + 42
    );

    // ------------------------------------------------
    // PRICE
    // ------------------------------------------------

    const priceX =
      tableX +
      imageWidth +
      productWidth +
      8;

    setFont(10);

    doc
      .fillColor(PINK)
      .text(
        money(Number(item.price) * item.quantity),
        priceX,
        currentY + 28
      );

    currentY += rowHeight;
  }

  // --------------------------------------------------
  // THANK YOU MESSAGE
  // --------------------------------------------------

  const thankYouY =
    currentY + 20;

  setFont(10);

  doc
    .fillColor(TEXT)
    .text(
      `Dear ${order.fullName}, thanks for confirm the order.`,
      cardX + 20,
      thankYouY,
      {
        width: cardWidth - 40,
      }
    );

  // --------------------------------------------------
  // STATUS SECTION
  // --------------------------------------------------

  const statusCardY =
    thankYouY + 35;

  const statusCardHeight = 105;

  roundedCard(
    cardX,
    statusCardY,
    cardWidth,
    statusCardHeight,
    7
  );

  setFont(13);

  doc
    .fillColor(PURPLE)
    .text(
      "Delivery Status Details",
      cardX,
      statusCardY + 16,
      {
        width: cardWidth,
        align: "center",
      }
    );

  setFont(8.5);

  doc
    .fillColor("#555555")
    .text(
      "পার্সেল ট্র্যাকিং লিংকটি অর্ডার কনফার্মের মাধ্যমে আপডেট হবে",
      cardX + 15,
      statusCardY + 45,
      {
        width: cardWidth - 30,
        align: "center",
      }
    );

  // --------------------------------------------------
  // STATUS
  // --------------------------------------------------

  const statusText =
    STATUS_LABELS_BN[order.status] ??
    order.status;

  const statusY =
    statusCardY + 72;

  setFont(9);

  doc
    .fillColor("#008844")
    .text(
      `Seller » ${statusText}`,
      cardX + 40,
      statusY
    );

  // --------------------------------------------------
  // FOOTER
  // --------------------------------------------------

  setFont(8);

  doc
    .fillColor("#999999")
    .text(
      `ShopScape • Invoice ${order.orderNumber}`,
      cardX,
      pageHeight - 35,
      {
        width: cardWidth,
        align: "center",
      }
    );

  doc.end();
}