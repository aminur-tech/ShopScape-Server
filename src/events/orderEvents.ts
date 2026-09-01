import { EventEmitter } from "events";

import { prisma } from "../config/prisma";

import type {
  Order,
  OrderStatus,
} from "../generated/prisma/client";

/* -------------------------------------------------------------------------- */
/* Event Emitter                                                              */
/* -------------------------------------------------------------------------- */

export const orderEvents =
  new EventEmitter();

/* -------------------------------------------------------------------------- */
/* Event Name                                                                 */
/* -------------------------------------------------------------------------- */

export const ORDER_STATUS_CHANGED =
  "order.status.changed";

/* -------------------------------------------------------------------------- */
/* Event Payload                                                              */
/* -------------------------------------------------------------------------- */

export type OrderStatusChangedPayload = {
  order: Order;
  status: OrderStatus;
};

/* -------------------------------------------------------------------------- */
/* Order Status Changed Listener                                              */
/* -------------------------------------------------------------------------- */

orderEvents.on(
  ORDER_STATUS_CHANGED,
  (payload: OrderStatusChangedPayload) => {
    void handleOrderStatusChanged(payload);
  },
);

/* -------------------------------------------------------------------------- */
/* Handler                                                                    */
/* -------------------------------------------------------------------------- */

async function handleOrderStatusChanged({
  order,
  status,
}: OrderStatusChangedPayload): Promise<void> {
  try {
    /*
    |--------------------------------------------------------------------------
    | Create Notification Log
    |--------------------------------------------------------------------------
    |
    | Email পাঠানো হচ্ছে না।
    | শুধু order status change event log করা হচ্ছে।
    |
    */

    await prisma.notificationLog.create({
      data: {
        orderId: order.id,

        event: `STATUS_${status}`,

        channel: "EMAIL",

        status: "SENT",

        payload: {
          orderNumber:
            order.orderNumber,

          status,
        },
      },
    });

    console.log(
      `[orderEvents] Order status changed: ${order.orderNumber} → ${status}`,
    );
  } catch (error) {
    console.error(
      "[orderEvents] Failed to create notification log:",
      error,
    );
  }
}