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

// Put a Bengali Unicode font inside:
// backend/fonts/NotoSansBengali-Regular.ttf
const FONT_PATH = path.join(
  process.cwd(),
  "fonts",
  "NotoSansBengali-Regular.ttf"
);

const hasBanglaFont = fs.existsSync(FONT_PATH);

export function streamInvoicePdf(
  res: Response,
  order: Order & { items: OrderItem[] }
) {
  const doc = new PDFDocument({
    size: "A4",
    margin: 45,
    bufferPages: true,
    info: {
      Title: `Invoice ${order.orderNumber}`,
      Author: "ShopScape",
      Subject: "Order Invoice",
      Creator: "ShopScape",
    },
  });

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="invoice-${order.orderNumber}.pdf"`
  );

  doc.pipe(res);

  /*
   * ---------------------------------------------------------
   * Helpers
   * ---------------------------------------------------------
   */

  const pageWidth = doc.page.width;
  const pageHeight = doc.page.height;
  const left = 45;
  const right = pageWidth - 45;
  const contentWidth = right - left;

  const money = (value: number | string) => {
    return `Tk ${Number(value).toLocaleString("en-BD")}`;
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-BD", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(date);
  };

  const setFont = (size = 10) => {
    if (hasBanglaFont) {
      doc.font(FONT_PATH);
    } else {
      doc.font("Helvetica");
    }

    doc.fontSize(size);
  };

  const roundedBox = (
    x: number,
    y: number,
    width: number,
    height: number,
    fill = "#F8F8F8",
    stroke = "#E5E5E5"
  ) => {
    doc
      .roundedRect(x, y, width, height, 8)
      .fillAndStroke(fill, stroke);
  };

  /*
   * ---------------------------------------------------------
   * Header
   * ---------------------------------------------------------
   */

  // Brand area
  doc
    .roundedRect(left, 40, contentWidth, 70, 10)
    .fill("#111111");

  setFont(22);
  doc
    .fillColor("#FFFFFF")
    .text("ShopScape", left + 20, 56);

  setFont(9);
  doc
    .fillColor("#CCCCCC")
    .text("Fashion • Style • Quality", left + 21, 86);

  // Invoice label
  setFont(20);
  doc
    .fillColor("#111111")
    .text("INVOICE", 400, 55, {
      width: 120,
      align: "right",
    });

  setFont(9);
  doc
    .fillColor("#666666")
    .text(`#${order.orderNumber}`, 400, 82, {
      width: 120,
      align: "right",
    });

  doc.y = 135;

  /*
   * ---------------------------------------------------------
   * Invoice Information
   * ---------------------------------------------------------
   */

  const infoWidth = (contentWidth - 15) / 2;

  roundedBox(left, doc.y, infoWidth, 92);
  roundedBox(left + infoWidth + 15, doc.y, infoWidth, 92);

  const infoY = doc.y + 15;

  // Invoice details
  setFont(9);
  doc.fillColor("#777777").text("INVOICE DETAILS", left + 15, infoY);

  setFont(10);
  doc.fillColor("#111111");

  doc.text(
    `Invoice No: ${order.orderNumber}`,
    left + 15,
    infoY + 22
  );

  doc.text(
    `Date: ${formatDate(order.createdAt)}`,
    left + 15,
    infoY + 40
  );

  doc.text(
    `Payment: ${order.paymentMethod}`,
    left + 15,
    infoY + 58
  );

  // Order status
  const statusX = left + infoWidth + 15;

  setFont(9);
  doc.fillColor("#777777").text("ORDER STATUS", statusX + 15, infoY);

  setFont(10);
  doc.fillColor("#111111");

  const statusLabel =
    STATUS_LABELS_BN[order.status] ?? order.status;

  doc.text(
    statusLabel,
    statusX + 15,
    infoY + 22
  );

  doc.text(
    `Status: ${order.status}`,
    statusX + 15,
    infoY + 40
  );

  if (order.transactionId) {
    doc.text(
      `Transaction: ${order.transactionId}`,
      statusX + 15,
      infoY + 58,
      {
        width: infoWidth - 30,
      }
    );
  }

  doc.y += 115;

  /*
   * ---------------------------------------------------------
   * Customer / Shipping Information
   * ---------------------------------------------------------
   */

  const customerBoxHeight = 115;

  roundedBox(
    left,
    doc.y,
    contentWidth,
    customerBoxHeight,
    "#FAFAFA"
  );

  setFont(9);
  doc
    .fillColor("#777777")
    .text("BILL TO / SHIP TO", left + 15, doc.y + 15);

  setFont(12);
  doc
    .fillColor("#111111")
    .text(order.fullName, left + 15, doc.y + 35);

  setFont(10);

  doc
    .fillColor("#444444")
    .text(`Phone: ${order.phone}`, left + 15, doc.y + 58);

  const address = `${order.addressLine}, ${order.area}, ${order.district}, ${order.division}`;

  doc.text(address, left + 15, doc.y + 78, {
    width: contentWidth - 30,
  });

  doc.y += customerBoxHeight + 25;

  /*
   * ---------------------------------------------------------
   * Items Table
   * ---------------------------------------------------------
   */

  setFont(12);
  doc
    .fillColor("#111111")
    .text("ORDER ITEMS", left, doc.y);

  doc.moveDown(0.7);

  let tableY = doc.y;

  const colItem = left;
  const colQty = 350;
  const colPrice = 410;
  const colTotal = 485;

  const headerHeight = 28;

  doc
    .roundedRect(left, tableY, contentWidth, headerHeight, 5)
    .fill("#111111");

  setFont(9);
  doc.fillColor("#FFFFFF");

  doc.text("ITEM", colItem + 10, tableY + 9);
  doc.text("QTY", colQty, tableY + 9);
  doc.text("PRICE", colPrice, tableY + 9);
  doc.text("TOTAL", colTotal, tableY + 9);

  tableY += headerHeight;

  /*
   * Table rows
   */

  order.items.forEach((item, index) => {
    const rowHeight = 42;

    if (index % 2 === 0) {
      doc
        .rect(left, tableY, contentWidth, rowHeight)
        .fill("#FAFAFA");
    }

    doc
      .moveTo(left, tableY + rowHeight)
      .lineTo(right, tableY + rowHeight)
      .strokeColor("#E5E5E5")
      .stroke();

    setFont(9);
    doc.fillColor("#222222");

    doc.text(item.name, colItem + 10, tableY + 13, {
      width: 285,
      height: 30,
      ellipsis: true,
    });

    doc.text(String(item.quantity), colQty, tableY + 13);

    doc.text(
      money(Number(item.price)),
      colPrice,
      tableY + 13
    );

    doc.text(
      money(Number(item.price) * item.quantity),
      colTotal,
      tableY + 13
    );

    tableY += rowHeight;
  });

  doc.y = tableY + 20;

  /*
   * ---------------------------------------------------------
   * Summary
   * ---------------------------------------------------------
   */

  const summaryWidth = 250;
  const summaryX = right - summaryWidth;

  roundedBox(
    summaryX,
    doc.y,
    summaryWidth,
    125,
    "#FAFAFA"
  );

  const summaryY = doc.y + 15;

  setFont(10);
  doc.fillColor("#555555");

  doc.text("Subtotal", summaryX + 15, summaryY);
  doc.text(
    money(Number(order.subtotal)),
    summaryX + 130,
    summaryY,
    { width: 100, align: "right" }
  );

  doc.text("Delivery Fee", summaryX + 15, summaryY + 25);
  doc.text(
    money(Number(order.deliveryFee)),
    summaryX + 130,
    summaryY + 25,
    { width: 100, align: "right" }
  );

  doc
    .moveTo(summaryX + 15, summaryY + 50)
    .lineTo(summaryX + summaryWidth - 15, summaryY + 50)
    .strokeColor("#DDDDDD")
    .stroke();

  setFont(13);
  doc.fillColor("#111111");

  doc.text("TOTAL", summaryX + 15, summaryY + 65);

  doc.text(
    money(Number(order.total)),
    summaryX + 110,
    summaryY + 65,
    {
      width: 120,
      align: "right",
    }
  );

  /*
   * ---------------------------------------------------------
   * Footer
   * ---------------------------------------------------------
   */

  const footerY = pageHeight - 75;

  doc
    .moveTo(left, footerY)
    .lineTo(right, footerY)
    .strokeColor("#E5E5E5")
    .stroke();

  setFont(9);
  doc
    .fillColor("#777777")
    .text(
      "Thank you for shopping with ShopScape.",
      left,
      footerY + 15,
      {
        width: contentWidth,
        align: "center",
      }
    );

  setFont(8);

  doc
    .fillColor("#999999")
    .text(
      "This is a computer-generated invoice and does not require a signature.",
      left,
      footerY + 33,
      {
        width: contentWidth,
        align: "center",
      }
    );

  /*
   * ---------------------------------------------------------
   * Page Numbers
   * ---------------------------------------------------------
   */

  const range = doc.bufferedPageRange();

  for (let i = 0; i < range.count; i++) {
    doc.switchToPage(i);

    setFont(8);

    doc
      .fillColor("#AAAAAA")
      .text(
        `Page ${i + 1} of ${range.count}`,
        left,
        pageHeight - 35,
        {
          width: contentWidth,
          align: "center",
        }
      );
  }

  doc.end();
}