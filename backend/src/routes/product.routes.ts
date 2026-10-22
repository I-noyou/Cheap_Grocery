import { Router } from "express";

import { getProductByRoute, getProducts, searchProductsByQuery } from "../controllers/product.controller.js";
import { getProductVariants, getVariantDetails, searchVariants } from "../controllers/product-variant.controller.js";
import { getVariantAvailability } from "../controllers/inventory.controller.js";
import { getVariantPriceComparison, getVariantPrices } from "../controllers/price.controller.js";
import { createAdminProductRoute, getAdminProducts, patchAdminProduct, patchAdminProductStatus } from "../controllers/admin-product.controller.js";
import { createAdminVariant, getAdminProductVariants, patchAdminVariant, patchAdminVariantStatus } from "../controllers/admin-variant.controller.js";
import { requireAdmin, requireAuth } from "../middleware/auth.js";

export const productRouter = Router();

productRouter.get("/admin/products", requireAuth, requireAdmin, getAdminProducts);
productRouter.post("/admin/products", requireAuth, requireAdmin, createAdminProductRoute);
productRouter.patch("/admin/products/:productId", requireAuth, requireAdmin, patchAdminProduct);
productRouter.patch("/admin/products/:productId/status", requireAuth, requireAdmin, patchAdminProductStatus);
productRouter.get("/admin/products/:productId/variants", requireAuth, requireAdmin, getAdminProductVariants);
productRouter.post("/admin/products/:productId/variants", requireAuth, requireAdmin, createAdminVariant);
productRouter.patch("/admin/variants/:variantId", requireAuth, requireAdmin, patchAdminVariant);
productRouter.patch("/admin/variants/:variantId/status", requireAuth, requireAdmin, patchAdminVariantStatus);

productRouter.get("/products", getProducts);
productRouter.get("/products/search", searchProductsByQuery);
productRouter.get("/variants/search", searchVariants);
productRouter.get("/variants/:variantId", getVariantDetails);
productRouter.get("/variants/:variantId/availability", getVariantAvailability);
productRouter.get("/variants/:variantId/prices", getVariantPrices);
productRouter.get("/variants/:variantId/price-comparison", getVariantPriceComparison);
productRouter.get("/products/:productId/variants", getProductVariants);
productRouter.get("/products/:productId", getProductByRoute);
