import assert from "node:assert/strict";
import test from "node:test";

import { isPriceSource, isValidVariantId } from "../src/services/price.service.js";

test("accepts only supported price sources", () => {
  assert.equal(isPriceSource("manual"), true);
  assert.equal(isPriceSource("store_reported"), true);
  assert.equal(isPriceSource("imported"), true);
  assert.equal(isPriceSource("retailer_feed"), false);
  assert.equal(isPriceSource(""), false);
});

test("rejects malformed variant identifiers", () => {
  assert.equal(isValidVariantId("variant-prod-rice~none~none~100~g"), true);
  assert.equal(isValidVariantId(""), false);
  assert.equal(isValidVariantId("variant/a"), false);
  assert.equal(isValidVariantId("x".repeat(501)), false);
});
