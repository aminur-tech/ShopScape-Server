import { Router } from "express";
import { listCategories } from "../controllers/category.controller";
import { asyncHandler } from "../utils/asyncHandler";

const router = Router();

router.get("/", asyncHandler(listCategories));

export default router;
