import assert from "node:assert/strict";
import test from "node:test";

import type { Request, Response } from "express";
import { ObjectId } from "mongodb";

import { requireAdmin } from "../src/middleware/auth.js";
import { getPersistedUserRole, toSafeUser } from "../src/models/user.js";

function responseRecorder(): { response: Response; statusCode: () => number | undefined; body: () => unknown } {
  let code: number | undefined;
  let responseBody: unknown;
  const response = {
    status(statusCode: number) {
      code = statusCode;
      return this;
    },
    json(body: unknown) {
      responseBody = body;
      return this;
    }
  } as Response;
  return { response, statusCode: () => code, body: () => responseBody };
}

test("missing persisted roles default to normal users", () => {
  assert.equal(getPersistedUserRole(undefined), "user");
  assert.equal(getPersistedUserRole("admin"), "admin");
  assert.equal(getPersistedUserRole("operator"), null);
});

test("invalid persisted roles cannot be serialized as authenticated users", () => {
  assert.throws(() => toSafeUser({
    _id: new ObjectId("507f1f77bcf86cd799439011"),
    name: "Invalid User",
    email: "invalid@example.com",
    passwordHash: "must-not-be-exposed",
    role: "operator" as never,
    createdAt: new Date(0),
    updatedAt: new Date(0)
  }), /invalid role/);
});

test("safe users expose the persisted role without exposing credentials", () => {
  const user = toSafeUser({
    _id: new ObjectId("507f1f77bcf86cd799439011"),
    name: "Test User",
    email: "test@example.com",
    passwordHash: "must-not-be-exposed",
    createdAt: new Date(0),
    updatedAt: new Date(0)
  });

  assert.equal(user.role, "user");
  assert.equal("passwordHash" in user, false);
});

test("admin middleware returns 401 without an authenticated session", () => {
  const recorded = responseRecorder();
  let called = false;

  requireAdmin({ cookies: {} } as Request, recorded.response, () => {
    called = true;
  });

  assert.equal(recorded.statusCode(), 401);
  assert.equal(called, false);
});

test("admin middleware returns 403 for a normal user", () => {
  const recorded = responseRecorder();
  let called = false;

  requireAdmin({ authenticatedUser: { id: "user-id", name: "User", email: "user@example.com", role: "user", createdAt: new Date(0) } } as Request, recorded.response, () => {
    called = true;
  });

  assert.equal(recorded.statusCode(), 403);
  assert.equal(called, false);
});

test("admin middleware allows an administrator", () => {
  const recorded = responseRecorder();
  let called = false;

  requireAdmin({ authenticatedUser: { id: "admin-id", name: "Admin", email: "admin@example.com", role: "admin", createdAt: new Date(0) } } as Request, recorded.response, () => {
    called = true;
  });

  assert.equal(called, true);
  assert.equal(recorded.statusCode(), undefined);
});
