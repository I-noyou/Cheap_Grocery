import { Router } from "express";

import { getProductByRoute, getProducts, searchProductsByQuery } from "../controllers/product.controller.js";
import { getProductVariants, getVariantDetails, searchVariants } from "../controllers/product-variant.controller.js";

export const productRouter = Router();

productRouter.get("/products", getProducts);
productRouter.get("/products/search", searchProductsByQuery);
productRouter.get("/variants/search", searchVariants);
productRouter.get("/variants/:variantId", getVariantDetails);
productRouter.get("/products/:productId/variants", getProductVariants);
productRouter.get("/products/:productId", getProductByRoute);
