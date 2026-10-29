import assert from "node:assert/strict";
import test from "node:test";

import { parseInventoryInput } from "../src/controllers/admin-inventory.controller.js";
import { parseAdminPriceInput } from "../src/controllers/admin-price.controller.js";

const storeId = "507f1f77bcf86cd799439011";
const variantId = "variant-prod-rice~none~none~100~g";

test("admin inventory parser rejects unknown fields, operators, and invalid quantities", () => {
  assert.equal(parseInventoryInput({ availability: "available", stockQuantity: -1, stockUnit: "count", source: "manual", lastVerifiedAt: null }, false), null);
  assert.equal(parseInventoryInput({ availability: "pending", stockQuantity: null, stockUnit: null, source: "manual", lastVerifiedAt: null }, false), null);
  assert.equal(parseInventoryInput({ availability: "available", stockQuantity: 2, stockUnit: "count", source: "manual", lastVerifiedAt: null, $set: {} }, false), null);
  assert.equal(parseInventoryInput({ availability: "available", stockQuantity: 2, stockUnit: null, source: "manual", lastVerifiedAt: null }, false), null);
});

test("admin inventory parser accepts explicit allowed fields only", () => {
  const input = parseInventoryInput({ availability: "available", stockQuantity: 2, stockUnit: "PACKS", source: "manual", lastVerifiedAt: "2026-01-01T00:00:00.000Z" }, false);
  assert.ok(input);
  assert.equal(input.stockUnit, "packs");
  assert.equal(input.stockQuantity, 2);
});

test("admin inventory parser accepts an explicit no-stock record", () => {
  const input = parseInventoryInput({ availability: "unknown", stockQuantity: null, stockUnit: null, source: "manual", lastVerifiedAt: null }, false);
  assert.ok(input);
  assert.equal(input.stockQuantity, null);
  assert.equal(input.stockUnit, null);
});

test("admin price parser rejects non-finite, non-positive, and unknown fields", () => {
  assert.equal(parseAdminPriceInput({ amount: 0 }, storeId, variantId), null);
  assert.equal(parseAdminPriceInput({ amount: Number.NaN }, storeId, variantId), null);
  assert.equal(parseAdminPriceInput({ amount: 12, $set: { amount: 1 } }, storeId, variantId), null);
  assert.equal(parseAdminPriceInput({ amount: 12, currency: "NOT_A_CURRENCY" }, storeId, variantId), null);
});

test("admin price parser uses established positive-number currency representation", () => {
  const input = parseAdminPriceInput({ amount: 12.5, currency: "INR", source: "manual", observedAt: "2026-01-01T00:00:00.000Z" }, storeId, variantId);
  assert.ok(input);
  assert.equal(input.amount, 12.5);
  assert.equal(input.currency, "INR");
});

test("live MongoDB coverage required: unique upserts retain one current record and history only changes", { skip: "Requires configured live MongoDB and isolated collections." }, () => {
  // upsertInventory and upsertPrice retry duplicate-key races; upsertPrice returns
  // changed: false and inserts no history record for an identical write.
});
