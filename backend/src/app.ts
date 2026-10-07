import cors from "cors";
import express from "express";

import { env } from "./config/env.js";
import { errorHandler } from "./middleware/error-handler.js";
import { healthRouter } from "./routes/health.routes.js";

export const app = express();

app.disable("x-powered-by");
app.use(cors({ origin: env.corsOrigins }));
app.use(express.json());

app.use("/api/v1", healthRouter);

app.use(errorHandler);
