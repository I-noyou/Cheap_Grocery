import { Router } from "express";

import { getNearbyStores, getStores, postStore } from "../controllers/store.controller.js";
import { getStoreInventory } from "../controllers/inventory.controller.js";
import { getStorePrices, getVariantPriceHistory, putPrice } from "../controllers/price.controller.js";
import { requireAuth } from "../middleware/auth.js";

export const storeRouter = Router();

storeRouter.post("/stores", postStore);
storeRouter.get("/stores", getStores);
storeRouter.get("/stores/nearby", requireAuth, getNearbyStores);
storeRouter.get("/stores/:storeId/inventory", getStoreInventory);
storeRouter.get("/stores/:storeId/prices", getStorePrices);
storeRouter.put("/stores/:storeId/prices/:variantId", putPrice);
storeRouter.get("/stores/:storeId/variants/:variantId/price-history", getVariantPriceHistory);
