import { Router } from "express";
import rateLimit from "express-rate-limit";
import {
  sendCheckoutCode,
  sendCodeSchema,
  verifyCheckoutCode,
  verifyCodeSchema,
  placeOrder,
  placeOrderSchema,
  getPaymentConfig,
} from "../controllers/checkout.controller";
import { validate } from "../middleware/validate";
import { optionalAuthenticate } from "../middleware/auth";
import { asyncHandler } from "../utils/asyncHandler";

const router = Router();

const otpLimiter = rateLimit({ windowMs: 10 * 60 * 1000, max: 5 });

router.get("/payment-config", asyncHandler(getPaymentConfig));
router.post("/send-code", otpLimiter, validate({ body: sendCodeSchema }), asyncHandler(sendCheckoutCode));
router.post(
  "/verify-code",
  otpLimiter,
  validate({ body: verifyCodeSchema }),
  asyncHandler(verifyCheckoutCode)
);
router.post("/", optionalAuthenticate, validate({ body: placeOrderSchema }), asyncHandler(placeOrder));

export default router;
