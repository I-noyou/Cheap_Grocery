import type { RequestHandler } from "express";

import { getUserForSession } from "../services/auth.service.js";

export const SESSION_COOKIE_NAME = "cheap_grocery_session";

export const requireAuth: RequestHandler = async (request, response, next) => {
  const token = request.cookies[SESSION_COOKIE_NAME];
  if (typeof token !== "string" || !token) {
    response.status(401).json({ error: "Authentication required." });
    return;
  }

  try {
    const user = await getUserForSession(token);
    if (!user) {
      response.status(401).json({ error: "Authentication required." });
      return;
    }

    request.authenticatedUser = user;
    next();
  } catch {
    response.status(503).json({ error: "Authentication service is unavailable." });
  }
};

function authorizeAdmin(request: Parameters<RequestHandler>[0], response: Parameters<RequestHandler>[1], next: Parameters<RequestHandler>[2]): void {
  if (!request.authenticatedUser) {
    response.status(401).json({ error: "Authentication required." });
    return;
  }

  if (request.authenticatedUser.role !== "admin") {
    response.status(403).json({ error: "Administrator access required." });
    return;
  }

  next();
}

export const requireAdmin: RequestHandler = (request, response, next) => {
  if (request.authenticatedUser) {
    authorizeAdmin(request, response, next);
    return;
  }

  void requireAuth(request, response, () => authorizeAdmin(request, response, next));
};
