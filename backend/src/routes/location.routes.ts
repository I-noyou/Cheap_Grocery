import { Router } from "express";

import { getLocation, putLocation } from "../controllers/location.controller.js";
import { requireAuth } from "../middleware/auth.js";

export const locationRouter = Router();

locationRouter.get("/location", requireAuth, getLocation);
locationRouter.put("/location", requireAuth, putLocation);
