import type { Request, Response } from "express";

import { getDashboardSummary } from "../services/dashboard.service.js";

export async function respondWithDashboard(
  response: Response,
  loadSummary: () => Promise<Record<string, unknown>> = getDashboardSummary
): Promise<void> {
  try {
    response.status(200).json(await loadSummary());
  } catch {
    response.status(503).json({ error: "Dashboard service is unavailable." });
  }
}

export async function getAdminDashboard(_request: Request, response: Response): Promise<void> {
  await respondWithDashboard(response);
}
