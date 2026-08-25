import { Router } from "express";
import { authenticate, requireAdmin } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { asyncHandler } from "../utils/asyncHandler";

import {
  adminGetProduct,
  adminListProducts,
  adminCreateProduct,
  adminUpdateProduct,
  adminDeleteProduct,
  productInputSchema,
} from "../controllers/admin/product.controller";

import {
  adminListCategories,
  adminCreateCategory,
  adminUpdateCategory,
  adminDeleteCategory,
  categoryInputSchema,
} from "../controllers/admin/category.controller";

import {
  adminListOrders,
  adminGetOrder,
  adminUpdateOrderStatus,
  updateStatusSchema,
  adminDownloadInvoice,
} from "../controllers/admin/order.controller";

import { adminListCustomers } from "../controllers/admin/customer.controller";
import { adminDashboard } from "../controllers/admin/dashboard.controller";

import {
  adminListBanners,
  adminCreateBanner,
  adminUpdateBanner,
  adminDeleteBanner,
  bannerInputSchema,
} from "../controllers/admin/banner.controller";

const router = Router();

router.use(authenticate, requireAdmin);

router.get("/dashboard", asyncHandler(adminDashboard));

router.get("/products", asyncHandler(adminListProducts));
router.get("/products/:id", asyncHandler(adminGetProduct));
router.post("/products", validate({ body: productInputSchema }), asyncHandler(adminCreateProduct));
router.put("/products/:id", asyncHandler(adminUpdateProduct));
router.delete("/products/:id", asyncHandler(adminDeleteProduct));

router.get("/categories", asyncHandler(adminListCategories));
router.post("/categories", validate({ body: categoryInputSchema }), asyncHandler(adminCreateCategory));
router.put("/categories/:id", asyncHandler(adminUpdateCategory));
router.delete("/categories/:id", asyncHandler(adminDeleteCategory));

router.get("/orders", asyncHandler(adminListOrders));
router.get("/orders/:id", asyncHandler(adminGetOrder));
router.get("/orders/:id/invoice", asyncHandler(adminDownloadInvoice));
router.patch(
  "/orders/:id/status",
  validate({ body: updateStatusSchema }),
  asyncHandler(adminUpdateOrderStatus)
);

router.get("/customers", asyncHandler(adminListCustomers));

router.get("/banners", asyncHandler(adminListBanners));
router.post("/banners", validate({ body: bannerInputSchema }), asyncHandler(adminCreateBanner));
router.put("/banners/:id", asyncHandler(adminUpdateBanner));
router.delete("/banners/:id", asyncHandler(adminDeleteBanner));

export default router;
