import { Router } from "express";
import {
  myOrders,
  getMyOrder,
  trackOrder,
  trackOrderSchema,
  downloadMyInvoice,
  downloadPublicInvoice,
} from "../controllers/order.controller";
import { authenticate } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { asyncHandler } from "../utils/asyncHandler";

const router = Router();

router.get("/track", validate({ query: trackOrderSchema }), asyncHandler(trackOrder));
router.get("/track/invoice", validate({ query: trackOrderSchema }), asyncHandler(downloadPublicInvoice));
router.get("/", authenticate, asyncHandler(myOrders));
router.get("/:id", authenticate, asyncHandler(getMyOrder));
router.get("/:id/invoice", authenticate, asyncHandler(downloadMyInvoice));

export default router;
