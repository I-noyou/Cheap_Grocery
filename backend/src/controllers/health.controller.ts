import type { Request, Response } from "express";

import { checkDatabaseConnection } from "../db/pool.js";

export async function getHealth(_request: Request, response: Response): Promise<void> {
  const database = await checkDatabaseConnection();
  const status = database === "unavailable" ? "degraded" : "ok";

  response.status(status === "ok" ? 200 : 503).json({
    status,
    service: "cheap-grocery-api",
    database
  });
}
