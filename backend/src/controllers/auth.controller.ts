import type { CookieOptions, Request, Response } from "express";
import type { MongoServerError } from "mongodb";

import { env } from "../config/env.js";
import { SESSION_COOKIE_NAME } from "../middleware/auth.js";
import { toSafeUser } from "../models/user.js";
import { createSession, createUser, deleteSession, findUserByEmail, verifyPassword } from "../services/auth.service.js";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const cookieOptions: CookieOptions = {
  httpOnly: true,
  secure: env.nodeEnv === "production",
  sameSite: "lax",
  path: "/"
};

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function readBody(request: Request): Record<string, unknown> | null {
  return request.body && typeof request.body === "object" && !Array.isArray(request.body)
    ? request.body as Record<string, unknown>
    : null;
}

function validName(name: unknown): name is string {
  return typeof name === "string" && name.trim().length >= 2 && name.trim().length <= 100;
}

function validEmail(email: unknown): email is string {
  return typeof email === "string" && email.length <= 254 && emailPattern.test(email.trim());
}

function validPassword(password: unknown): password is string {
  return typeof password === "string" && password.length >= 8 && password.length <= 128;
}

function setSessionCookie(response: Response, token: string, expiresAt: Date): void {
  response.cookie(SESSION_COOKIE_NAME, token, { ...cookieOptions, expires: expiresAt });
}

function isDuplicateKeyError(error: unknown): boolean {
  return typeof error === "object" && error !== null && (error as MongoServerError).code === 11000;
}

export async function register(request: Request, response: Response): Promise<void> {
  const body = readBody(request);
  if (!body || !validName(body.name) || !validEmail(body.email) || !validPassword(body.password)) {
    response.status(400).json({ error: "Provide a valid name, email, and password of 8 to 128 characters." });
    return;
  }

  try {
    const user = await createUser(body.name.trim(), normalizeEmail(body.email), body.password);
    const session = await createSession(user._id);
    setSessionCookie(response, session.token, session.expiresAt);
    response.status(201).json({ user: toSafeUser(user) });
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      response.status(409).json({ error: "An account with that email already exists." });
      return;
    }
    response.status(503).json({ error: "Authentication service is unavailable." });
  }
}

export async function login(request: Request, response: Response): Promise<void> {
  const body = readBody(request);
  if (!body || !validEmail(body.email) || !validPassword(body.password)) {
    response.status(400).json({ error: "Provide a valid email and password." });
    return;
  }

  try {
    const user = await findUserByEmail(normalizeEmail(body.email));
    if (!user || !(await verifyPassword(user, body.password))) {
      response.status(401).json({ error: "Invalid email or password." });
      return;
    }

    const session = await createSession(user._id);
    setSessionCookie(response, session.token, session.expiresAt);
    response.status(200).json({ user: toSafeUser(user) });
  } catch {
    response.status(503).json({ error: "Authentication service is unavailable." });
  }
}

export async function logout(request: Request, response: Response): Promise<void> {
  const token = request.cookies[SESSION_COOKIE_NAME];
  if (typeof token === "string" && token) {
    try {
      await deleteSession(token);
    } catch {
      response.status(503).json({ error: "Authentication service is unavailable." });
      return;
    }
  }

  response.clearCookie(SESSION_COOKIE_NAME, cookieOptions);
  response.status(200).json({ message: "Logged out successfully." });
}

export function me(request: Request, response: Response): void {
  response.status(200).json({ user: request.authenticatedUser });
}
