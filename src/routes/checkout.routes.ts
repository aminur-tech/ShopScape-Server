import { Router } from "express";
import {
  placeOrder,
  placeOrderSchema,
  getPaymentConfig,
} from "../controllers/checkout.controller";

import { validate } from "../middleware/validate";
import { optionalAuthenticate } from "../middleware/auth";
import { asyncHandler } from "../utils/asyncHandler";

const router = Router();

/* -------------------------------------------------------------------------- */
/* Payment Configuration                                                      */
/* -------------------------------------------------------------------------- */

router.get(
  "/payment-config",
  asyncHandler(getPaymentConfig),
);

/* -------------------------------------------------------------------------- */
/* Place Order                                                                */
/* -------------------------------------------------------------------------- */

router.post(
  "/",
  optionalAuthenticate,
  validate({
    body: placeOrderSchema,
  }),
  asyncHandler(placeOrder),
);

export default router;