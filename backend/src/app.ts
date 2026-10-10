import cors from "cors";
import cookieParser from "cookie-parser";
import express from "express";

import { env } from "./config/env.js";
import { errorHandler } from "./middleware/error-handler.js";
import { healthRouter } from "./routes/health.routes.js";
import { authRouter } from "./routes/auth.routes.js";
import { locationRouter } from "./routes/location.routes.js";
import { storeRouter } from "./routes/store.routes.js";
import { productRouter } from "./routes/product.routes.js";

export const app = express();

app.disable("x-powered-by");
app.use(cors({ origin: env.corsOrigins, credentials: true }));
app.use(cookieParser());
app.use(express.json());

app.use("/api/v1", healthRouter);
app.use("/api/v1/auth", authRouter);
app.use("/api/v1", locationRouter);
app.use("/api/v1", storeRouter);
app.use("/api/v1", productRouter);

app.use(errorHandler);
