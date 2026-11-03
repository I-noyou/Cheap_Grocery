import assert from "node:assert/strict";
import test from "node:test";

import { calculatePriceCoverage, toAvailabilityCounts, toStatusCounts } from "../src/services/dashboard.service.js";

test("dashboard status and availability calculations handle empty collections", () => {
  assert.deepEqual(toStatusCounts([]), { total: 0, active: 0, inactive: 0 });
  assert.deepEqual(toAvailabilityCounts([], 0), { total: 0, available: 0, unavailable: 0, unknown: 0, stale: 0 });
  assert.deepEqual(calculatePriceCoverage(0, 0, 0), { expected: 0, priced: 0, missing: 0 });
});

test("dashboard calculations keep activity, availability, and missing prices accurate", () => {
  assert.deepEqual(toStatusCounts([{ _id: true, count: 3 }, { _id: false, count: 2 }]), { total: 5, active: 3, inactive: 2 });
  assert.deepEqual(toAvailabilityCounts([{ _id: "available", count: 8 }, { _id: "unknown", count: 2 }, { _id: "unavailable", count: 1 }], 4), { total: 11, available: 8, unavailable: 1, unknown: 2, stale: 4 });
  assert.deepEqual(calculatePriceCoverage(3, 4, 7), { expected: 12, priced: 7, missing: 5 });
  assert.deepEqual(calculatePriceCoverage(1, 1, 2), { expected: 1, priced: 1, missing: 0 });
});
