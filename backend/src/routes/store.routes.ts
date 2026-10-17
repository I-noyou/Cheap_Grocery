import { Router } from "express";

import {
  createAdminStore,
  getAdminStores,
  getNearbyStores,
  getStores,
  patchAdminStore,
  patchAdminStoreStatus,
  postStore
} from "../controllers/store.controller.js";
import { getStoreInventory } from "../controllers/inventory.controller.js";
import { getStorePrices, getVariantPriceHistory, putPrice } from "../controllers/price.controller.js";
import { requireAdmin, requireAuth } from "../middleware/auth.js";

export const storeRouter = Router();

storeRouter.get("/admin/stores", requireAuth, requireAdmin, getAdminStores);
storeRouter.post("/admin/stores", requireAuth, requireAdmin, createAdminStore);
storeRouter.patch("/admin/stores/:storeId", requireAuth, requireAdmin, patchAdminStore);
storeRouter.patch("/admin/stores/:storeId/status", requireAuth, requireAdmin, patchAdminStoreStatus);
storeRouter.post("/stores", postStore);
storeRouter.get("/stores", getStores);
storeRouter.get("/stores/nearby", requireAuth, getNearbyStores);
storeRouter.get("/stores/:storeId/inventory", getStoreInventory);
storeRouter.get("/stores/:storeId/prices", getStorePrices);
storeRouter.put("/stores/:storeId/prices/:variantId", putPrice);
storeRouter.get("/stores/:storeId/variants/:variantId/price-history", getVariantPriceHistory);
