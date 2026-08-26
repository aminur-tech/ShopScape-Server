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



const sendCodeLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json({
      error: "আপনি অনেকবার কোড পাঠানোর চেষ্টা করেছেন। কিছুক্ষণ পর আবার চেষ্টা করুন।",
    });
  },
});

const verifyCodeLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json({
      error: "আপনি অনেকবার ভুল কোড দিয়েছেন। কিছুক্ষণ পর আবার চেষ্টা করুন।",
    });
  },
});

router.get("/payment-config", asyncHandler(getPaymentConfig));
router.post("/send-code", sendCodeLimiter, validate({ body: sendCodeSchema }), asyncHandler(sendCheckoutCode));
router.post(
  "/verify-code",
  verifyCodeLimiter,
  validate({ body: verifyCodeSchema }),
  asyncHandler(verifyCheckoutCode)
);
router.post("/", optionalAuthenticate, validate({ body: placeOrderSchema }), asyncHandler(placeOrder));

export default router;