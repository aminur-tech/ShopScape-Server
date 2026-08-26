import { Router } from "express";
import rateLimit from "express-rate-limit";

import { upload } from "../middleware/upload";
import {
  authenticate,
  requireAdmin,
} from "../middleware/auth";

import { asyncHandler } from "../utils/asyncHandler";

import {
  handleUpload,
} from "../controllers/upload.controller";

const router = Router();

/*
 * =========================================================
 * ADMIN IMAGE UPLOAD
 * =========================================================
 */

router.post(
  "/admin",

  authenticate,
  requireAdmin,

  (req, _res, next) => {
    req.uploadFolder = "products";
    next();
  },

  upload.array("files", 20),

  asyncHandler(handleUpload)
);

/*
 * =========================================================
 * PAYMENT PROOF UPLOAD
 * =========================================================
 */

const proofLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 10,
});

router.post(
  "/payment-proof",

  proofLimiter,

  (req, _res, next) => {
    req.uploadFolder =
      "payment-proofs";

    next();
  },

  upload.array("files", 5),

  asyncHandler(handleUpload)
);

export default router;