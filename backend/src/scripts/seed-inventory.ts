import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { closeMongoClient } from "../db/mongo.js";
import { isAvailability, isInventorySource, normalizeStockUnit, upsertInventory, type InventoryInput } from "../services/inventory.service.js";

interface InventorySeedRecord {
  storeId?: unknown;
  variantId?: unknown;
  availability?: unknown;
  stockQuantity?: unknown;
  stockUnit?: unknown;
  lastVerifiedAt?: unknown;
  source?: unknown;
}

interface SeedSummary {
  inserted: number;
  updated: number;
  skipped: number;
  failed: number;
}

function parseRecord(value: InventorySeedRecord): InventoryInput | null {
  if (typeof value.storeId !== "string" || !value.storeId.trim()
    || typeof value.variantId !== "string" || !value.variantId.trim()
    || !isAvailability(value.availability)
    || !isInventorySource(value.source)) return null;

  const stockQuantity = value.stockQuantity === null || value.stockQuantity === undefined ? null : value.stockQuantity;
  if (stockQuantity !== null && (typeof stockQuantity !== "number" || !Number.isFinite(stockQuantity) || stockQuantity < 0)) return null;
  const stockUnit = stockQuantity === null ? null : normalizeStockUnit(value.stockUnit);
  if (stockQuantity !== null && !stockUnit) return null;

  let lastVerifiedAt: Date | null = null;
  if (value.lastVerifiedAt !== undefined && value.lastVerifiedAt !== null) {
    if (typeof value.lastVerifiedAt !== "string") return null;
    const parsedDate = new Date(value.lastVerifiedAt);
    if (Number.isNaN(parsedDate.getTime())) return null;
    lastVerifiedAt = parsedDate;
  }

  return {
    storeId: value.storeId.trim(),
    variantId: value.variantId.trim(),
    availability: value.availability,
    stockQuantity,
    stockUnit,
    lastVerifiedAt,
    source: value.source
  };
}

async function main(): Promise<void> {
  const inputPath = process.argv[2];
  const dryRun = process.argv.includes("--dry-run");
  if (!inputPath) throw new Error("Usage: npm run seed:inventory -- <json-file> [--dry-run]");

  const parsed = JSON.parse(await readFile(resolve(process.cwd(), inputPath), "utf8")) as unknown;
  if (!Array.isArray(parsed)) throw new Error("Inventory seed file must contain a JSON array.");

  const summary: SeedSummary = { inserted: 0, updated: 0, skipped: 0, failed: 0 };
  for (const value of parsed) {
    const record = value && typeof value === "object" ? parseRecord(value as InventorySeedRecord) : null;
    if (!record) {
      summary.failed += 1;
      continue;
    }
    if (dryRun) {
      summary.skipped += 1;
      continue;
    }
    try {
      const result = await upsertInventory(record);
      summary[result] += 1;
    } catch (error) {
      summary.failed += 1;
      console.error(`Failed to import inventory for ${record.storeId}/${record.variantId}:`, error instanceof Error ? error.message : error);
    }
  }

  console.log(JSON.stringify({ dryRun, summary }, null, 2));
  process.exitCode = summary.failed > 0 ? 1 : 0;
}

try {
  await main();
} catch (error) {
  console.error("Inventory import failed.", error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  await closeMongoClient();
}
