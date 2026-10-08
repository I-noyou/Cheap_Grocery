import { Router } from "express";

import { getNearbyStores, getStores, postStore } from "../controllers/store.controller.js";
import { requireAuth } from "../middleware/auth.js";

export const storeRouter = Router();

storeRouter.post("/stores", postStore);
storeRouter.get("/stores", getStores);
storeRouter.get("/stores/nearby", requireAuth, getNearbyStores);
