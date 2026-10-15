import { Router } from "express";

import { getProductByRoute, getProducts, searchProductsByQuery } from "../controllers/product.controller.js";
import { getProductVariants, getVariantDetails, searchVariants } from "../controllers/product-variant.controller.js";
import { getVariantAvailability } from "../controllers/inventory.controller.js";
import { getVariantPriceComparison, getVariantPrices } from "../controllers/price.controller.js";

export const productRouter = Router();

productRouter.get("/products", getProducts);
productRouter.get("/products/search", searchProductsByQuery);
productRouter.get("/variants/search", searchVariants);
productRouter.get("/variants/:variantId", getVariantDetails);
productRouter.get("/variants/:variantId/availability", getVariantAvailability);
productRouter.get("/variants/:variantId/prices", getVariantPrices);
productRouter.get("/variants/:variantId/price-comparison", getVariantPriceComparison);
productRouter.get("/products/:productId/variants", getProductVariants);
productRouter.get("/products/:productId", getProductByRoute);
