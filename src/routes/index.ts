import { Router } from "express";
import authRoutes from "./auth.routes";
import categoryRoutes from "./category.routes";
import productRoutes from "./product.routes";
import checkoutRoutes from "./checkout.routes";
import orderRoutes from "./order.routes";
import adminRoutes from "./admin.routes";
import bannerRoutes from "./banner.routes";
import uploadRoutes from "./upload.routes";
import searchRoutes from "./search.routes";

const router = Router();

router.use("/auth", authRoutes);
router.use("/categories", categoryRoutes);
router.use("/products", productRoutes);
router.use("/checkout", checkoutRoutes);
router.use("/orders", orderRoutes);
router.use("/admin", adminRoutes);
router.use("/banners", bannerRoutes);
router.use("/uploads", uploadRoutes);
router.use("/search", searchRoutes);

export default router;
