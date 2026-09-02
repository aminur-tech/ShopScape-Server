import { Router } from "express";

import {
  autocomplete,
  aiImageSearch,
  aiTextSearch,
  combinedSearch,
} from "../controllers/search.controller";
import { upload } from "../middleware/upload";
import { asyncHandler } from "../utils/asyncHandler";


const router = Router();

router.get("/autocomplete", asyncHandler(autocomplete));

/*
|--------------------------------------------------------------------------
| AI TEXT SEARCH
|--------------------------------------------------------------------------
|
| POST /api/search/ai
|
| Body:
| {
|   "query": "১৫০০ টাকার মধ্যে কালো থ্রি পিস"
| }
|
*/

router.post(
  "/ai",
  asyncHandler(aiTextSearch),
);

/*
|--------------------------------------------------------------------------
| AI IMAGE SEARCH
|--------------------------------------------------------------------------
|
| POST /api/search/ai-image
|
| multipart/form-data
|
| field:
| image
|
*/

router.post(
  "/ai-image",
  upload.single("image"),
  asyncHandler(aiImageSearch),
);

router.post("/", upload.single("image"), asyncHandler(combinedSearch));

export default router;