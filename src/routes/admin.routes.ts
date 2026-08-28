
import { Router } from "express";

import {
  authenticate,
  requireAdmin,
} from "../middleware/auth";

import { validate } from "../middleware/validate";

import { asyncHandler } from "../utils/asyncHandler";

/* -------------------------------------------------------------------------- */
/* Product Controller                                                         */
/* -------------------------------------------------------------------------- */

import {
  adminGetProduct,
  adminListProducts,
  adminCreateProduct,
  adminUpdateProduct,
  adminDeleteProduct,
  productInputSchema,
} from "../controllers/admin/product.controller";

/* -------------------------------------------------------------------------- */
/* Category Controller                                                        */
/* -------------------------------------------------------------------------- */

import {
  adminListCategories,
  adminCreateCategory,
  adminUpdateCategory,
  adminDeleteCategory,
  categoryInputSchema,
} from "../controllers/admin/category.controller";

/* -------------------------------------------------------------------------- */
/* Order Controller                                                           */
/* -------------------------------------------------------------------------- */

import {
  adminListOrders,
  adminGetOrder,
  adminUpdateOrderStatus,
  updateStatusSchema,
  adminDownloadInvoice,

  // Courier Tracking
  adminUpdateCourierTracking,
  courierTrackingSchema,

  // Customer Message
  adminSendOrderMessage,
  adminMessageSchema,

  // Delivery Payment
  adminUpdateDeliveryPayment,
  deliveryPaymentSchema,
} from "../controllers/admin/order.controller";

/* -------------------------------------------------------------------------- */
/* Customer Controller                                                        */
/* -------------------------------------------------------------------------- */

import {
  adminListCustomers,
} from "../controllers/admin/customer.controller";

/* -------------------------------------------------------------------------- */
/* Dashboard Controller                                                       */
/* -------------------------------------------------------------------------- */

import {
  adminDashboard,
} from "../controllers/admin/dashboard.controller";

/* -------------------------------------------------------------------------- */
/* Banner Controller                                                          */
/* -------------------------------------------------------------------------- */

import {
  adminListBanners,
  adminCreateBanner,
  adminUpdateBanner,
  adminDeleteBanner,
  bannerInputSchema,
} from "../controllers/admin/banner.controller";

/* -------------------------------------------------------------------------- */
/* Router                                                                     */
/* -------------------------------------------------------------------------- */

const router = Router();

/*
|--------------------------------------------------------------------------
| Admin Authentication
|--------------------------------------------------------------------------
|
| Every route below requires:
|
| 1. Valid authentication
| 2. ADMIN role
|
*/

router.use(
  authenticate,
  requireAdmin
);

/* ========================================================================== */
/* Dashboard                                                                  */
/* ========================================================================== */

router.get(
  "/dashboard",
  asyncHandler(adminDashboard)
);

/* ========================================================================== */
/* Products                                                                   */
/* ========================================================================== */

/*
|--------------------------------------------------------------------------
| List Products
|--------------------------------------------------------------------------
|
| GET /api/admin/products
|
*/

router.get(
  "/products",
  asyncHandler(adminListProducts)
);

/*
|--------------------------------------------------------------------------
| Get Single Product
|--------------------------------------------------------------------------
|
| GET /api/admin/products/:id
|
*/

router.get(
  "/products/:id",
  asyncHandler(adminGetProduct)
);

/*
|--------------------------------------------------------------------------
| Create Product
|--------------------------------------------------------------------------
|
| POST /api/admin/products
|
*/

router.post(
  "/products",
  validate({
    body: productInputSchema,
  }),
  asyncHandler(adminCreateProduct)
);

/*
|--------------------------------------------------------------------------
| Update Product
|--------------------------------------------------------------------------
|
| PUT /api/admin/products/:id
|
*/

router.put(
  "/products/:id",
  asyncHandler(adminUpdateProduct)
);

/*
|--------------------------------------------------------------------------
| Delete Product
|--------------------------------------------------------------------------
|
| DELETE /api/admin/products/:id
|
*/

router.delete(
  "/products/:id",
  asyncHandler(adminDeleteProduct)
);

/* ========================================================================== */
/* Categories                                                                 */
/* ========================================================================== */

/*
|--------------------------------------------------------------------------
| Category Hierarchy
|--------------------------------------------------------------------------
|
| Parent Category:
|
| {
|   "name": "মেয়েদের পোশাক",
|   "parentId": null
| }
|
| Subcategory:
|
| {
|   "name": "শাড়ি",
|   "parentId": "parent-category-id"
| }
|
| Example:
|
| মেয়েদের পোশাক
| ├── শাড়ি
| ├── থ্রি-পিস
| ├── কামিজ
| └── বোরকা
|
*/

/*
|--------------------------------------------------------------------------
| List Categories
|--------------------------------------------------------------------------
|
| GET /api/admin/categories
|
| Returns parent categories with children.
|
*/

router.get(
  "/categories",
  asyncHandler(adminListCategories)
);

/*
|--------------------------------------------------------------------------
| Create Category / Subcategory
|--------------------------------------------------------------------------
|
| POST /api/admin/categories
|
| Parent Category:
|
| {
|   "name": "মেয়েদের পোশাক",
|   "parentId": null
| }
|
| Subcategory:
|
| {
|   "name": "শাড়ি",
|   "parentId": "CATEGORY_ID"
| }
|
*/

router.post(
  "/categories",
  validate({
    body: categoryInputSchema,
  }),
  asyncHandler(adminCreateCategory)
);

/*
|--------------------------------------------------------------------------
| Update Category / Subcategory
|--------------------------------------------------------------------------
|
| PUT /api/admin/categories/:id
|
| parentId can be changed to move a
| subcategory under another parent.
|
*/

router.put(
  "/categories/:id",
  validate({
    body: categoryInputSchema.partial(),
  }),
  asyncHandler(adminUpdateCategory)
);

/*
|--------------------------------------------------------------------------
| Delete Category / Subcategory
|--------------------------------------------------------------------------
|
| DELETE /api/admin/categories/:id
|
| Controller should prevent deletion when:
|
| - Products exist in the category
| - Child categories exist
|
*/

router.delete(
  "/categories/:id",
  asyncHandler(adminDeleteCategory)
);

/* ========================================================================== */
/* Orders                                                                     */
/* ========================================================================== */

/*
|--------------------------------------------------------------------------
| List Orders
|--------------------------------------------------------------------------
|
| GET /api/admin/orders
|
*/

router.get(
  "/orders",
  asyncHandler(adminListOrders)
);

/*
|--------------------------------------------------------------------------
| Get Single Order
|--------------------------------------------------------------------------
|
| GET /api/admin/orders/:id
|
*/

router.get(
  "/orders/:id",
  asyncHandler(adminGetOrder)
);

/*
|--------------------------------------------------------------------------
| Download Invoice
|--------------------------------------------------------------------------
|
| GET /api/admin/orders/:id/invoice
|
*/

router.get(
  "/orders/:id/invoice",
  asyncHandler(adminDownloadInvoice)
);

/* -------------------------------------------------------------------------- */
/* Order Status                                                               */
/* -------------------------------------------------------------------------- */

/*
|--------------------------------------------------------------------------
| Update Order Status
|--------------------------------------------------------------------------
|
| PATCH /api/admin/orders/:id/status
|
*/

router.patch(
  "/orders/:id/status",
  validate({
    body: updateStatusSchema,
  }),
  asyncHandler(adminUpdateOrderStatus)
);

/* -------------------------------------------------------------------------- */
/* Courier Tracking                                                           */
/* -------------------------------------------------------------------------- */

/*
|--------------------------------------------------------------------------
| Update Courier Tracking
|--------------------------------------------------------------------------
|
| PATCH /api/admin/orders/:id/tracking
|
| Body:
|
| {
|   "courierName": "Steadfast",
|   "courierTrackingUrl": "https://courier.com/track/123"
| }
|
*/

router.patch(
  "/orders/:id/tracking",
  validate({
    body: courierTrackingSchema,
  }),
  asyncHandler(adminUpdateCourierTracking)
);

/* -------------------------------------------------------------------------- */
/* Customer Message                                                           */
/* -------------------------------------------------------------------------- */

/*
|--------------------------------------------------------------------------
| Send Customer Message
|--------------------------------------------------------------------------
|
| PATCH /api/admin/orders/:id/message
|
| Body:
|
| {
|   "subject": "Order Confirmation",
|   "message": "Your order has been confirmed."
| }
|
*/

router.patch(
  "/orders/:id/message",
  validate({
    body: adminMessageSchema,
  }),
  asyncHandler(adminSendOrderMessage)
);

/* -------------------------------------------------------------------------- */
/* Delivery Payment                                                           */
/* -------------------------------------------------------------------------- */

/*
|--------------------------------------------------------------------------
| Update Delivery Payment
|--------------------------------------------------------------------------
|
| PATCH /api/admin/orders/:id/delivery-payment
|
| Body:
|
| {
|   "required": true,
|   "paymentMethod": "BKASH",
|   "paymentStatus": "PAID",
|   "transactionId": "ABC123",
|   "paymentProofUrl": "https://..."
| }
|
*/

router.patch(
  "/orders/:id/delivery-payment",
  validate({
    body: deliveryPaymentSchema,
  }),
  asyncHandler(adminUpdateDeliveryPayment)
);

/* ========================================================================== */
/* Customers                                                                  */
/* ========================================================================== */

/*
|--------------------------------------------------------------------------
| List Customers
|--------------------------------------------------------------------------
|
| GET /api/admin/customers
|
*/

router.get(
  "/customers",
  asyncHandler(adminListCustomers)
);

/* ========================================================================== */
/* Banners                                                                    */
/* ========================================================================== */

/*
|--------------------------------------------------------------------------
| List Banners
|--------------------------------------------------------------------------
|
| GET /api/admin/banners
|
*/

router.get(
  "/banners",
  asyncHandler(adminListBanners)
);

/*
|--------------------------------------------------------------------------
| Create Banner
|--------------------------------------------------------------------------
|
| POST /api/admin/banners
|
*/

router.post(
  "/banners",
  validate({
    body: bannerInputSchema,
  }),
  asyncHandler(adminCreateBanner)
);

/*
|--------------------------------------------------------------------------
| Update Banner
|--------------------------------------------------------------------------
|
| PUT /api/admin/banners/:id
|
*/

router.put(
  "/banners/:id",
  asyncHandler(adminUpdateBanner)
);

/*
|--------------------------------------------------------------------------
| Delete Banner
|--------------------------------------------------------------------------
|
| DELETE /api/admin/banners/:id
|
*/

router.delete(
  "/banners/:id",
  asyncHandler(adminDeleteBanner)
);

/* ========================================================================== */
/* Export                                                                     */
/* ========================================================================== */

export default router;

