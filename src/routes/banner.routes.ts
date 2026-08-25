import { Router } from "express";
import { listBanners } from "../controllers/banner.controller";
import { asyncHandler } from "../utils/asyncHandler";

const router = Router();

router.get("/", asyncHandler(listBanners));

export default router;
