// import { createHash } from "crypto";
// import type { Request } from "express";

// import { env } from "../config/env";
// import type { Order, OrderItem } from "../generated/prisma/client";

// /* =========================================================
//    কেন এই ফাইলটা দরকার

//    Meta-এর ব্রাউজার pixel (fbq('track','Purchase', ...))
//    অনেক ক্ষেত্রে মিস হয়ে যায়: ad blocker, Safari ITP, ধীর
//    নেটওয়ার্কে পেজ বন্ধ করে দেওয়া ইত্যাদি। Conversions API
//    (CAPI) দিয়ে ঠিক একই Purchase ইভেন্ট সার্ভার থেকে সরাসরি
//    Meta-কে পাঠানো হয়, তাই ব্রাউজার কিছু miss করলেও ইভেন্টটা
//    হারায় না।

//    একই অর্ডারের জন্য browser pixel আর এই সার্ভার কল — দুটোই
//    Meta-তে পৌঁছালে Meta সেগুলোকে ডুপ্লিকেট গণনা করবে না, যদি
//    দুই জায়গাতেই একই `event_id` ব্যবহার করা হয়। তাই ফ্রন্টএন্ডের
//    Purchase pixel কলে অবশ্যই একই id পাঠাতে হবে:

//      fbq('track', 'Purchase', {...}, { eventID: order.id });

//    (order.id — checkout response-এ `order.order.id` হিসেবে
//    ফ্রন্টএন্ড এমনিতেই পায়।)
// ========================================================= */

// type OrderWithItems = Order & {
//   items: OrderItem[];
// };

// type SendPurchaseEventParams = {
//   order: OrderWithItems;
//   request: Request;

//   // Meta-র নিজস্ব first-party cookies — ফ্রন্টএন্ড চাইলে
//   // document.cookie থেকে পড়ে checkout body-তে পাঠাতে পারে।
//   // এগুলো থাকলে match quality অনেক ভালো হয়, না থাকলেও চলবে।
//   fbp?: string;
//   fbc?: string;
// };

// /* =========================================================
//    HASH HELPER

//    Meta-কে raw email/phone পাঠানো যাবে না — SHA-256 hash করে
//    পাঠাতে হয় (lowercase + trim করার পর)।
// ========================================================= */

// function hash(value: string): string {
//   return createHash("sha256")
//     .update(value.trim().toLowerCase())
//     .digest("hex");
// }

// /* =========================================================
//    BANGLADESHI ফোন নাম্বার নরমালাইজ

//    Meta ph ফিল্ডের জন্য country code সহ digits-only আশা করে
//    (E.164, কিন্তু leading + ছাড়া)। আমাদের schema 01XXXXXXXXX
//    ফরম্যাট এনফোর্স করে, তাই সামনে 88 যোগ করলেই হয়।
// ========================================================= */

// function normalizePhoneForMeta(
//   phone: string,
// ): string {
//   const digitsOnly = phone.replace(/\D/g, "");

//   if (digitsOnly.startsWith("880")) {
//     return digitsOnly;
//   }

//   if (digitsOnly.startsWith("0")) {
//     return `88${digitsOnly.slice(1)}`;
//   }

//   return `88${digitsOnly}`;
// }

// /* =========================================================
//    CLIENT IP

//    Reverse proxy (Vercel/Render/Nginx) এর পেছনে থাকলে
//    req.ip প্রায়ই proxy-র নিজের IP দেয়, তাই x-forwarded-for
//    আগে চেক করা হচ্ছে।
// ========================================================= */

// function getClientIp(
//   request: Request,
// ): string | undefined {
//   const forwarded =
//     request.headers["x-forwarded-for"];

//   if (typeof forwarded === "string") {
//     return forwarded
//       .split(",")[0]
//       ?.trim();
//   }

//   if (Array.isArray(forwarded)) {
//     return forwarded[0];
//   }

//   return request.ip;
// }

// /* =========================================================
//    SEND PURCHASE EVENT

//    Fire-and-forget — এটা কখনো throw করবে না, কারণ checkout
//    response আটকে রাখা বা fail করানো ঠিক না শুধু tracking
//    ইভেন্ট পাঠাতে ব্যর্থ হলে।
// ========================================================= */

// export async function sendPurchaseEvent({
//   order,
//   request,
//   fbp,
//   fbc,
// }: SendPurchaseEventParams): Promise<void> {
//   if (
//     !env.META_PIXEL_ID ||
//     !env.META_CAPI_ACCESS_TOKEN
//   ) {
//     // কনফিগার করা হয়নি — চুপচাপ skip, warning একবারই যথেষ্ট
//     console.warn(
//       "[metaConversionsApi] META_PIXEL_ID/META_CAPI_ACCESS_TOKEN সেট নেই — Purchase event পাঠানো হয়নি",
//     );

//     return;
//   }

//   try {
//     const userAgent =
//       request.headers["user-agent"];

//     const clientIp =
//       getClientIp(request);

//     const userData: Record<string, unknown> = {
//       ph: [
//         hash(
//           normalizePhoneForMeta(
//             order.phone,
//           ),
//         ),
//       ],

//       ...(order.guestEmail
//         ? { em: [hash(order.guestEmail)] }
//         : {}),

//       ...(clientIp
//         ? { client_ip_address: clientIp }
//         : {}),

//       ...(userAgent
//         ? { client_user_agent: userAgent }
//         : {}),

//       ...(fbp ? { fbp } : {}),
//       ...(fbc ? { fbc } : {}),
//     };

//     const payload = {
//       data: [
//         {
//           event_name: "Purchase",
//           event_time: Math.floor(
//             order.createdAt.getTime() / 1000,
//           ),

//           // ব্রাউজার pixel-এর সাথে dedupe করার জন্য —
//           // ফ্রন্টএন্ডে একই id দিয়ে eventID পাঠাতে হবে
//           event_id: order.id,

//           action_source: "website",

//           event_source_url: `${env.FRONTEND_URL}/order-confirmation/${order.orderNumber}`,

//           user_data: userData,

//           custom_data: {
//             currency: env.META_CURRENCY,
//             value: order.total,

//             contents: order.items.map(
//               (item) => ({
//                 id: item.productId,
//                 quantity: item.quantity,
//                 item_price: item.price,
//               }),
//             ),

//             content_type: "product",
//             num_items: order.items.length,
//             order_id: order.orderNumber,
//           },
//         },
//       ],

//       ...(env.META_TEST_EVENT_CODE
//         ? {
//             test_event_code:
//               env.META_TEST_EVENT_CODE,
//           }
//         : {}),
//     };

//     const url = `https://graph.facebook.com/${env.META_CAPI_API_VERSION}/${env.META_PIXEL_ID}/events?access_token=${env.META_CAPI_ACCESS_TOKEN}`;

//     const response = await fetch(url, {
//       method: "POST",
//       headers: {
//         "Content-Type": "application/json",
//       },
//       body: JSON.stringify(payload),
//     });

//     const responseBody = await response
//       .json()
//       .catch(() => null);

//     if (!response.ok) {
//       console.error(
//         "[metaConversionsApi] Purchase event পাঠাতে ব্যর্থ:",
//         {
//           status: response.status,
//           orderNumber: order.orderNumber,
//           responseBody,
//         },
//       );

//       return;
//     }

//     console.log(
//       `[metaConversionsApi] Purchase event পাঠানো হয়েছে: ${order.orderNumber}`,
//       responseBody,
//     );
//   } catch (error) {
//     // নেটওয়ার্ক এরর ইত্যাদি — checkout ইতিমধ্যে সফল হয়ে গেছে,
//     // এখানে fail হলেও গ্রাহককে প্রভাবিত করা উচিত না।
//     console.error(
//       "[metaConversionsApi] Purchase event পাঠাতে exception:",
//       error,
//     );
//   }
// }