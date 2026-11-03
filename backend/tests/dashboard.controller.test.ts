import assert from "node:assert/strict";
import test from "node:test";

import type { Response } from "express";

import { respondWithDashboard } from "../src/controllers/dashboard.controller.js";

function responseRecorder(): { response: Response; statusCode: () => number | undefined; body: () => unknown } {
  let code: number | undefined;
  let responseBody: unknown;
  const response = {
    status(statusCode: number) { code = statusCode; return this; },
    json(body: unknown) { responseBody = body; return this; }
  } as Response;
  return { response, statusCode: () => code, body: () => responseBody };
}

test("dashboard controller returns its summary", async () => {
  const recorded = responseRecorder();
  await respondWithDashboard(recorded.response, async () => ({ stores: { total: 0 } }));
  assert.equal(recorded.statusCode(), 200);
  assert.deepEqual(recorded.body(), { stores: { total: 0 } });
});

test("dashboard controller returns a safe unavailable error", async () => {
  const recorded = responseRecorder();
  await respondWithDashboard(recorded.response, async () => { throw new Error("database connection details"); });
  assert.equal(recorded.statusCode(), 503);
  assert.deepEqual(recorded.body(), { error: "Dashboard service is unavailable." });
});
