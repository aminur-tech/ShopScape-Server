import PDFDocument from "pdfkit";
import type { Response } from "express";
import type { Order, OrderItem } from "@prisma/client";
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
  console.error(
    `[invoice] Bangla font not found at ${FONT_PATH}`
  );
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
  if (!url) {
    return null;
  }

  try {
    const controller = new AbortController();

    const timeout = setTimeout(() => {
      controller.abort();
    }, 10000);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: "image/*",
      },
    });

    clearTimeout(timeout);

    if (!response.ok) {
      console.error(
        `[invoice] Image request failed: ${response.status} ${url}`
      );

      return null;
    }

    const contentType =
      response.headers.get("content-type") || "";

    if (!contentType.startsWith("image/")) {
      console.error(
        `[invoice] Invalid image content type: ${contentType}`
      );

      return null;
    }

    const arrayBuffer = await response.arrayBuffer();

    return Buffer.from(arrayBuffer);
  } catch (error) {
    console.error(
      "[invoice] Image fetch error:",
      error
    );

    return null;
  }
}

/* =========================================================
   MAIN PDF
========================================================= */

export async function streamInvoicePdf(
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

  /* =======================================================
     RESPONSE
  ======================================================= */

  res.setHeader(
    "Content-Type",
    "application/pdf"
  );

  res.setHeader(
    "Content-Disposition",
    `attachment; filename="invoice-${order.orderNumber}.pdf"`
  );

  doc.pipe(res);

  /* =======================================================
     COLORS
  ======================================================= */

  const BG = "#F5F6FF";
  const WHITE = "#FFFFFF";
  const TEXT = "#171717";
  const MUTED = "#777777";

  const PURPLE = "#7B3FA0";
  const PINK = "#FF2E88";
  const ORANGE = "#FF5A00";

  const BORDER = "#E2E4EC";
  const LIGHT = "#FAFAFC";
  const IMAGE_BG = "#F3F4F6";

  /* =======================================================
     PAGE
  ======================================================= */

  const pageWidth = doc.page.width;
  const pageHeight = doc.page.height;

  const margin = 35;

  const contentWidth =
    pageWidth - margin * 2;

  /* =======================================================
     BACKGROUND
  ======================================================= */

  doc
    .rect(
      0,
      0,
      pageWidth,
      pageHeight
    )
    .fill(BG);

  /* =======================================================
     HELPERS
  ======================================================= */

  function setFont(size = 10) {
    if (hasBanglaFont) {
      doc.font(FONT_PATH);
    } else {
      doc.font("Helvetica");
    }

    doc.fontSize(size);
  }

  function money(
    value:
      | number
      | string
      | null
      | undefined
  ) {
    return `৳${Number(
      value ?? 0
    ).toLocaleString("en-BD")}`;
  }

  function formatDate(date: Date) {
    return new Intl.DateTimeFormat(
      "en-BD",
      {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }
    ).format(new Date(date));
  }

  function roundedCard(
    x: number,
    y: number,
    width: number,
    height: number,
    radius = 8
  ) {
    doc
      .roundedRect(
        x,
        y,
        width,
        height,
        radius
      )
      .fillAndStroke(
        WHITE,
        BORDER
      );
  }

  function drawLine(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    color = BORDER
  ) {
    doc
      .moveTo(x1, y1)
      .lineTo(x2, y2)
      .strokeColor(color)
      .lineWidth(1)
      .stroke();
  }

  function drawPlaceholder(
    x: number,
    y: number,
    width: number,
    height: number
  ) {
    doc
      .roundedRect(
        x,
        y,
        width,
        height,
        6
      )
      .fill(IMAGE_BG);

    setFont(7);

    doc
      .fillColor(MUTED)
      .text(
        "No Image",
        x,
        y + height / 2 - 4,
        {
          width,
          align: "center",
        }
      );
  }

  /* =======================================================
     MAIN CARD
  ======================================================= */

  const cardX = margin;
  const cardY = 30;
  const cardWidth = contentWidth;

  const mainCardHeight = 700;

  roundedCard(
    cardX,
    cardY,
    cardWidth,
    mainCardHeight
  );

  /* =======================================================
     TITLE
  ======================================================= */

  setFont(17);

  doc
    .fillColor(PURPLE)
    .text(
      "INVOICE",
      cardX,
      cardY + 22,
      {
        width: cardWidth,
        align: "center",
      }
    );

  /* =======================================================
     LOGO
  ======================================================= */

  const logoSize = 45;

  const logoX =
    cardX +
    cardWidth / 2 -
    logoSize / 2;

  const logoY =
    cardY + 58;

  doc
    .roundedRect(
      logoX,
      logoY,
      logoSize,
      logoSize,
      11
    )
    .fill(ORANGE);

  setFont(27);

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

  /* =======================================================
     SHOP NAME
  ======================================================= */

  setFont(16);

  doc
    .fillColor(TEXT)
    .text(
      "ShopScape",
      cardX,
      logoY + 54,
      {
        width: cardWidth,
        align: "center",
      }
    );

  setFont(9);

  doc
    .fillColor(MUTED)
    .text(
      "Mohammadpur, Dhaka, Bangladesh",
      cardX,
      logoY + 77,
      {
        width: cardWidth,
        align: "center",
      }
    );

  /* =======================================================
     DIVIDER
  ======================================================= */

  const dividerY =
    logoY + 110;

  drawLine(
    cardX + 20,
    dividerY,
    cardX + cardWidth - 20,
    dividerY
  );

  /* =======================================================
     ORDER INFO
  ======================================================= */

  let infoY =
    dividerY + 22;

  const labelX =
    cardX + 25;

  const valueX =
    cardX + 105;

  setFont(9);

  doc
    .fillColor(TEXT)
    .text(
      "Order ID",
      labelX,
      infoY
    );

  doc.text(
    `: ${order.orderNumber}`,
    valueX,
    infoY
  );

  infoY += 19;

  doc.text(
    "Date",
    labelX,
    infoY
  );

  doc.text(
    `: ${formatDate(order.createdAt)}`,
    valueX,
    infoY
  );

  infoY += 19;

  doc.text(
    "Mobile",
    labelX,
    infoY
  );

  doc.text(
    `: ${order.phone}`,
    valueX,
    infoY
  );

  infoY += 19;

  doc.text(
    "Name",
    labelX,
    infoY
  );

  doc.text(
    `: ${order.fullName}`,
    valueX,
    infoY
  );

  infoY += 19;

  /* =======================================================
     ADDRESS
  ======================================================= */

  const address = [
    order.division,
    order.district,
    order.area,
    order.addressLine,
  ]
    .filter(Boolean)
    .join(" > ");

  doc.text(
    "Address",
    labelX,
    infoY
  );

  doc.text(
    `: ${address || "N/A"}`,
    valueX,
    infoY,
    {
      width: cardWidth - 145,
      height: 35,
    }
  );

  infoY += 30;

  /* =======================================================
     PAYMENT
  ======================================================= */

  doc.text(
    "Payment",
    labelX,
    infoY
  );

  const paymentLabel =
    order.paymentMethod === "BKASH"
      ? "bKash"
      : order.paymentMethod === "NAGAD"
      ? "Nagad"
      : "Cash on Delivery";

  doc.text(
    `: ${paymentLabel}`,
    valueX,
    infoY
  );

  infoY += 19;

  /* =======================================================
     TOTAL
  ======================================================= */

  doc
    .fillColor(PINK)
    .text(
      "Total",
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

  /* =======================================================
     ITEMS TABLE
  ======================================================= */

  const tableX =
    cardX + 20;

  const tableY =
    infoY + 27;

  const tableWidth =
    cardWidth - 40;

  const imageWidth = 75;

  const productWidth = 315;

  const priceWidth =
    tableWidth -
    imageWidth -
    productWidth;

  const headerHeight = 29;

  /* =======================================================
     TABLE HEADER
  ======================================================= */

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

  setFont(8.5);

  doc
    .fillColor(TEXT)
    .text(
      "Image",
      tableX + 8,
      tableY + 9
    );

  doc.text(
    "Product",
    tableX +
      imageWidth +
      8,
    tableY + 9
  );

  doc.text(
    "Total",
    tableX +
      imageWidth +
      productWidth +
      8,
    tableY + 9
  );

  /* =======================================================
     FETCH PRODUCT IMAGES
  ======================================================= */

  const itemImages =
    await Promise.all(
      order.items.map(
        async (item) => {
          console.log(
            `[invoice] Product: ${item.name}`
          );

          console.log(
            `[invoice] Image URL: ${
              item.selectedImageUrl ?? "null"
            }`
          );

          if (!item.selectedImageUrl) {
            return null;
          }

          return fetchImageBuffer(
            item.selectedImageUrl
          );
        }
      )
    );

  /* =======================================================
     TABLE ROWS
  ======================================================= */

  let currentY =
    tableY +
    headerHeight;

  for (
    const [
      index,
      item,
    ] of order.items.entries()
  ) {
    const rowHeight = 82;

    /* =====================================================
       ROW
    ===================================================== */

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

    /* =====================================================
       SEPARATORS
    ===================================================== */

    drawLine(
      tableX + imageWidth,
      currentY,
      tableX + imageWidth,
      currentY + rowHeight
    );

    drawLine(
      tableX +
        imageWidth +
        productWidth,
      currentY,
      tableX +
        imageWidth +
        productWidth,
      currentY + rowHeight
    );

    /* =====================================================
       PRODUCT IMAGE
    ===================================================== */

    const imageX =
      tableX + 9;

    const imageY =
      currentY + 8;

    const imageSize = 64;

    const imageBuffer =
      itemImages[index];

    if (imageBuffer) {
      try {
        doc.image(
          imageBuffer,
          imageX,
          imageY,
          {
            fit: [
              imageSize,
              imageSize,
            ],
            align: "center",
            valign: "center",
          }
        );
      } catch (error) {
        console.error(
          "[invoice] PDF image render failed:",
          error
        );

        drawPlaceholder(
          imageX,
          imageY,
          imageSize,
          imageSize
        );
      }
    } else {
      drawPlaceholder(
        imageX,
        imageY,
        imageSize,
        imageSize
      );
    }

    /* =====================================================
       PRODUCT DETAILS
    ===================================================== */

    const productX =
      tableX +
      imageWidth +
      8;

    /* Product Name */

    setFont(9);

    doc
      .fillColor(TEXT)
      .text(
        item.name,
        productX,
        currentY + 8,
        {
          width:
            productWidth - 18,
          height: 22,
          ellipsis: true,
        }
      );

    /* =====================================================
       SIZE / COLOR / QUANTITY
    ===================================================== */

    let detailY =
      currentY + 31;

    if (item.selectedSize) {
      setFont(8);

      doc
        .fillColor(MUTED)
        .text(
          `Size: ${item.selectedSize}`,
          productX,
          detailY
        );

      detailY += 14;
    }

    if (item.selectedColor) {
      setFont(8);

      doc
        .fillColor(MUTED)
        .text(
          `Color: ${item.selectedColor}`,
          productX,
          detailY
        );

      detailY += 14;
    }

    setFont(8);

    doc
      .fillColor(MUTED)
      .text(
        `Quantity: ${item.quantity}`,
        productX,
        detailY
      );

    /* =====================================================
       PRICE
    ===================================================== */

    const priceX =
      tableX +
      imageWidth +
      productWidth +
      8;

    setFont(9.5);

    doc
      .fillColor(PINK)
      .text(
        money(
          Number(item.price) *
            Number(item.quantity)
        ),
        priceX,
        currentY + 30,
        {
          width:
            priceWidth - 12,
        }
      );

    currentY += rowHeight;
  }

  /* =======================================================
     THANK YOU
  ======================================================= */

  const thankYouY =
    currentY + 17;

  setFont(9);

  doc
    .fillColor(TEXT)
    .text(
      `প্রিয় ${
        order.fullName || "Customer"
      }, আপনার অর্ডারের জন্য ধন্যবাদ।`,
      cardX + 20,
      thankYouY,
      {
        width:
          cardWidth - 40,
        align: "center",
      }
    );

  /* =======================================================
     FOOTER
  ======================================================= */

  setFont(7.5);

  doc
    .fillColor("#999999")
    .text(
      `ShopScape • Invoice ${order.orderNumber}`,
      cardX,
      pageHeight - 28,
      {
        width: cardWidth,
        align: "center",
      }
    );

  /* =======================================================
     END
  ======================================================= */

  doc.end();
}