import { EventEmitter } from "events";
import { prisma } from "../config/prisma";
import { sendOrderStatusEmail } from "../utils/mailer";
import type { Order, OrderStatus } from "@prisma/client";

// Internal event bus used to decouple "an order's status changed" from
// "notify the customer". Today this sends an email + writes a
// NotificationLog row. Later, a real outbound webhook (e.g. to SMS
// provider or a customer-facing webhook subscription) can listen on the
// same event without touching the code that changes order status.
export const orderEvents = new EventEmitter();

export const ORDER_STATUS_CHANGED = "order.status.changed";

export type OrderStatusChangedPayload = {
  order: Order;
  status: OrderStatus;
};

orderEvents.on(ORDER_STATUS_CHANGED, async ({ order, status }: OrderStatusChangedPayload) => {
  const recipientEmail = order.guestEmail ?? (await getUserEmail(order.userId));
  if (!recipientEmail) return;

  let deliveryStatus: "SENT" | "FAILED" = "SENT";
  try {
    await sendOrderStatusEmail(recipientEmail, order.orderNumber, status);
  } catch (err) {
    deliveryStatus = "FAILED";
    console.error("[orderEvents] failed to send status email", err);
  }

  await prisma.notificationLog.create({
    data: {
      orderId: order.id,
      event: `STATUS_${status}`,
      channel: "EMAIL",
      status: deliveryStatus,
      payload: { orderNumber: order.orderNumber, status },
    },
  });
});

async function getUserEmail(userId: string | null): Promise<string | null> {
  if (!userId) return null;
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
  return user?.email ?? null;
}
