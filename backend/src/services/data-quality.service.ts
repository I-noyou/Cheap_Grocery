import { getDatabase } from "../db/mongo.js";

export type QualitySeverity = "warning" | "error";
export interface QualityFinding { type: string; severity: QualitySeverity; message: string; storeId?: string; variantId?: string; entityId?: string; updatedAt?: Date | null; }
const STALE_MS = 24 * 60 * 60 * 1000;

export async function getDataQualityFindings(skip: number, limit: number): Promise<{ findings: QualityFinding[]; total: number }> {
  const database = await getDatabase(); const staleBefore = new Date(Date.now() - STALE_MS);
  const pipeline = [
    { $facet: {
      inventoryReferences: [{ $lookup: { from: "stores", let: { id: "$storeId" }, pipeline: [{ $match: { $expr: { $eq: [{ $toString: "$_id" }, "$$id"] } } }, { $project: { isActive: 1 } }], as: "store" } }, { $lookup: { from: "productVariants", localField: "variantId", foreignField: "variantId", as: "variant" } }, { $match: { $or: [{ "store.0": { $exists: false } }, { "variant.0": { $exists: false } }, { "store.0.isActive": false }, { "variant.0.isActive": false }] } }, { $project: { storeId: 1, variantId: 1, updatedAt: 1, store: 1, variant: 1 } }],
      invalidInventory: [{ $match: { $or: [{ stockQuantity: { $lt: 0 } }, { $and: [{ stockQuantity: null }, { stockUnit: { $ne: null } }] }, { $and: [{ stockQuantity: { $ne: null } }, { stockUnit: null }] }, { availability: { $nin: ["available", "unavailable", "unknown"] } }] } }, { $project: { storeId: 1, variantId: 1, updatedAt: 1 } }],
      invalidPrices: [{ $match: { $or: [{ amount: { $lte: 0 } }, { currency: { $not: /^[A-Z]{3}$/ } }] } }, { $project: { storeId: 1, variantId: 1, updatedAt: 1 } }],
      staleInventory: [{ $match: { $or: [{ lastVerifiedAt: null }, { lastVerifiedAt: { $lt: staleBefore } }] } }, { $project: { storeId: 1, variantId: 1, updatedAt: 1 } }],
      duplicateInventory: [{ $group: { _id: { storeId: "$storeId", variantId: "$variantId" }, count: { $sum: 1 } } }, { $match: { count: { $gt: 1 } } }],
      duplicatePrices: [{ $group: { _id: { storeId: "$storeId", variantId: "$variantId" }, count: { $sum: 1 } } }, { $match: { count: { $gt: 1 } } }]
    } }
  ] as const;
  const [inventoryResult, priceResult] = await Promise.all([database.collection("inventory").aggregate(pipeline as never).toArray(), database.collection("prices").aggregate([{ $facet: { invalidPrices: pipeline[0].$facet.invalidPrices, duplicatePrices: pipeline[0].$facet.duplicatePrices } }]).toArray()]);
  const inventory = inventoryResult[0] as Record<string, Array<Record<string, unknown>>>; const prices = priceResult[0] as Record<string, Array<Record<string, unknown>>>;
  const findings: QualityFinding[] = [];
  for (const record of inventory.inventoryReferences ?? []) findings.push({ type: "inventory_reference", severity: "error", message: "Inventory references a missing or inactive store or variant.", storeId: String(record.storeId), variantId: String(record.variantId), updatedAt: record.updatedAt as Date });
  for (const record of inventory.invalidInventory ?? []) findings.push({ type: "inventory_value", severity: "error", message: "Inventory has an invalid quantity, unit, or availability value.", storeId: String(record.storeId), variantId: String(record.variantId), updatedAt: record.updatedAt as Date });
  for (const record of prices.invalidPrices ?? []) findings.push({ type: "price_value", severity: "error", message: "Current price has an invalid amount or currency.", storeId: String(record.storeId), variantId: String(record.variantId), updatedAt: record.updatedAt as Date });
  for (const record of inventory.duplicateInventory ?? []) findings.push({ type: "duplicate_inventory", severity: "error", message: "Duplicate inventory records bypassed the unique identity index.", storeId: String((record._id as Record<string, unknown>).storeId), variantId: String((record._id as Record<string, unknown>).variantId) });
  for (const record of prices.duplicatePrices ?? []) findings.push({ type: "duplicate_price", severity: "error", message: "Duplicate current-price records bypassed the unique identity index.", storeId: String((record._id as Record<string, unknown>).storeId), variantId: String((record._id as Record<string, unknown>).variantId) });
  for (const record of inventory.staleInventory ?? []) findings.push({ type: "stale_inventory", severity: "warning", message: "Inventory has never been verified or its verification is older than 24 hours.", storeId: String(record.storeId), variantId: String(record.variantId), updatedAt: record.updatedAt as Date });
  return { findings: findings.slice(skip, skip + limit), total: findings.length };
}
