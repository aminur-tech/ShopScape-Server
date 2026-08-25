import { Router } from "express";
import {
  listProducts,
  listProductsQuerySchema,
  getProductBySlug,
} from "../controllers/product.controller";
import { validate } from "../middleware/validate";
import { asyncHandler } from "../utils/asyncHandler";

const router = Router();

router.get("/", validate({ query: listProductsQuerySchema }), asyncHandler(listProducts));
router.get("/:slug", asyncHandler(getProductBySlug));

export default router;
