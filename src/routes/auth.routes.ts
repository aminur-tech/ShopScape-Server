import { Router } from "express";
import { register, registerSchema, login, loginSchema, me } from "../controllers/auth.controller";
import { validate } from "../middleware/validate";
import { authenticate } from "../middleware/auth";
import { asyncHandler } from "../utils/asyncHandler";

const router = Router();

router.post("/register", validate({ body: registerSchema }), asyncHandler(register));
router.post("/login", validate({ body: loginSchema }), asyncHandler(login));
router.get("/me", authenticate, asyncHandler(me));

export default router;
