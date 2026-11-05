import assert from "node:assert/strict";
import test from "node:test";
import type { Request, Response } from "express";
import { createAdminAuditDocument, recordAdminAuditWith } from "../src/services/admin-audit.service.js";
import { respondWithAdminAudit } from "../src/controllers/admin-audit.controller.js";
import { respondWithDataQuality } from "../src/controllers/data-quality.controller.js";

function recorder(): { response: Response; code: () => number | undefined; body: () => unknown } { let status: number | undefined; let payload: unknown; return { response: { status(value: number) { status = value; return this; }, json(value: unknown) { payload = value; return this; } } as Response, code: () => status, body: () => payload }; }

test("audit records use the server-supplied authenticated administrator identity and allowlisted summaries", () => {
  const record = createAdminAuditDocument({ administratorId: "admin-session-id", action: "update", entityType: "product", entityId: "prod-rice", productId: "prod-rice", changes: { before: { name: "Rice", password: { secret: true } }, after: { name: "Brown rice", token: { secret: true } } } });
  assert.equal(record.administratorId, "admin-session-id");
  assert.deepEqual(record.changes, { before: { name: "Rice" }, after: { name: "Brown rice" } });
});

test("audit storage failures reject so mutation controllers can return a safe failure", async () => {
  await assert.rejects(recordAdminAuditWith({ administratorId: "admin", action: "create", entityType: "store", entityId: "store" }, { collection: () => ({ insertOne: async () => { throw new Error("database unavailable"); } }) } as never));
});

test("audit endpoint validates filters and does not query rejected requests", async () => {
  const recorded = recorder(); let called = false;
  await respondWithAdminAudit({ query: { page: "0" } } as unknown as Request, recorded.response, async () => { called = true; return { records: [], total: 0 }; });
  assert.equal(recorded.code(), 400); assert.equal(called, false);
});

test("audit endpoint paginates validated filters", async () => {
  const recorded = recorder(); let received: unknown;
  await respondWithAdminAudit({ query: { page: "2", limit: "10", action: "create", entityType: "store", entityId: "abc" } } as unknown as Request, recorded.response, async (filters, skip, limit) => { received = { filters, skip, limit }; return { records: [], total: 0 }; });
  assert.equal(recorded.code(), 200); assert.deepEqual(received, { filters: { action: "create", entityType: "store", entityId: "abc" }, skip: 10, limit: 10 });
});

test("data-quality endpoint handles empty and unavailable checks safely", async () => {
  const empty = recorder(); await respondWithDataQuality({ query: {} } as unknown as Request, empty.response, async () => ({ findings: [], total: 0 })); assert.equal(empty.code(), 200); assert.deepEqual(empty.body(), { findings: [], total: 0, page: 1, limit: 25 });
  const failed = recorder(); await respondWithDataQuality({ query: {} } as unknown as Request, failed.response, async () => { throw new Error("connection details"); }); assert.deepEqual(failed.body(), { error: "Data-quality service is unavailable." });
});
