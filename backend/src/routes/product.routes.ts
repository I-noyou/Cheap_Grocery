import { Router } from "express";

import { getProductByRoute, getProducts, searchProductsByQuery } from "../controllers/product.controller.js";

export const productRouter = Router();

productRouter.get("/products", getProducts);
productRouter.get("/products/search", searchProductsByQuery);
productRouter.get("/products/:productId", getProductByRoute);
