import { getDatabase } from "../db/mongo.js";

const LIST_LIMIT = 6;
const INVENTORY_STALE_AFTER_MS = 24 * 60 * 60 * 1000;

export interface StatusCounts { total: number; active: number; inactive: number; }
export interface AvailabilityCounts { total: number; available: number; unavailable: number; unknown: number; stale: number; }

export function toStatusCounts(groups: Array<{ _id: boolean; count: number }>): StatusCounts {
  const active = groups.find((group) => group._id === true)?.count ?? 0;
  const inactive = groups.find((group) => group._id === false)?.count ?? 0;
  return { total: active + inactive, active, inactive };
}

export function toAvailabilityCounts(groups: Array<{ _id: string; count: number }>, stale: number): AvailabilityCounts {
  const available = groups.find((group) => group._id === "available")?.count ?? 0;
  const unavailable = groups.find((group) => group._id === "unavailable")?.count ?? 0;
  const unknown = groups.find((group) => group._id === "unknown")?.count ?? 0;
  return { total: available + unavailable + unknown, available, unavailable, unknown, stale };
}

export function calculatePriceCoverage(activeStores: number, activeVariants: number, pricedActivePairs: number): { expected: number; priced: number; missing: number } {
  const expected = activeStores * activeVariants;
  const priced = Math.min(Math.max(0, pricedActivePairs), expected);
  return { expected, priced, missing: expected - priced };
}

export async function getDashboardSummary(): Promise<Record<string, unknown>> {
  const database = await getDatabase();
  const staleBefore = new Date(Date.now() - INVENTORY_STALE_AFTER_MS);
  const [storeGroups, productGroups, variantGroups, inventoryGroups, staleInventory, pricedActivePairs, recentPrices, attentionInventory, inactiveStores, inactiveProducts, inactiveVariants] = await Promise.all([
    database.collection("stores").aggregate<{ _id: boolean; count: number }>([{ $group: { _id: "$isActive", count: { $sum: 1 } } }]).toArray(),
    database.collection("products").aggregate<{ _id: boolean; count: number }>([{ $group: { _id: "$isActive", count: { $sum: 1 } } }]).toArray(),
    database.collection("productVariants").aggregate<{ _id: boolean; count: number }>([{ $group: { _id: "$isActive", count: { $sum: 1 } } }]).toArray(),
    database.collection("inventory").aggregate<{ _id: string; count: number }>([{ $group: { _id: "$availability", count: { $sum: 1 } } }]).toArray(),
    database.collection("inventory").countDocuments({ $or: [{ lastVerifiedAt: null }, { lastVerifiedAt: { $lt: staleBefore } }] }),
    database.collection("prices").aggregate<{ count: number }>([
      { $lookup: { from: "stores", let: { storeId: "$storeId" }, pipeline: [{ $match: { $expr: { $and: [{ $eq: [{ $toString: "$_id" }, "$$storeId"] }, { $eq: ["$isActive", true] }] } } }], as: "store" } },
      { $lookup: { from: "productVariants", let: { variantId: "$variantId" }, pipeline: [{ $match: { $expr: { $and: [{ $eq: ["$variantId", "$$variantId"] }, { $eq: ["$isActive", true] }] } } }], as: "variant" } },
      { $match: { "store.0": { $exists: true }, "variant.0": { $exists: true } } },
      { $count: "count" }
    ]).toArray(),
    database.collection("prices").aggregate<Record<string, unknown>>([
      { $sort: { updatedAt: -1, _id: -1 } }, { $limit: LIST_LIMIT },
      { $lookup: { from: "stores", let: { storeId: "$storeId" }, pipeline: [{ $match: { $expr: { $eq: [{ $toString: "$_id" }, "$$storeId"] } } }, { $project: { _id: 0, name: 1 } }], as: "store" } },
      { $lookup: { from: "productVariants", let: { variantId: "$variantId" }, pipeline: [{ $match: { $expr: { $eq: ["$variantId", "$$variantId"] } } }, { $project: { _id: 0, variantId: 1, package: 1 } }], as: "variant" } },
      { $project: { _id: 0, amount: 1, currency: 1, updatedAt: 1, observedAt: 1, storeId: 1, variantId: 1, store: { $arrayElemAt: ["$store", 0] }, variant: { $arrayElemAt: ["$variant", 0] } } }
    ]).toArray(),
    database.collection("inventory").aggregate<Record<string, unknown>>([
      { $match: { $or: [{ availability: { $in: ["unavailable", "unknown"] } }, { lastVerifiedAt: null }, { lastVerifiedAt: { $lt: staleBefore } }] } },
      { $sort: { updatedAt: -1, _id: -1 } }, { $limit: LIST_LIMIT },
      { $project: { _id: 0, storeId: 1, variantId: 1, availability: 1, lastVerifiedAt: 1, stockQuantity: 1, stockUnit: 1 } }
    ]).toArray(),
    database.collection("stores").find({ isActive: false }, { projection: { _id: 1, name: 1, updatedAt: 1 } }).sort({ updatedAt: -1, _id: -1 }).limit(LIST_LIMIT).toArray(),
    database.collection("products").find({ isActive: false }, { projection: { _id: 0, productId: 1, name: 1, updatedAt: 1 } }).sort({ updatedAt: -1, productId: 1 }).limit(LIST_LIMIT).toArray(),
    database.collection("productVariants").find({ isActive: false }, { projection: { _id: 0, variantId: 1, productId: 1, updatedAt: 1 } }).sort({ updatedAt: -1, variantId: 1 }).limit(LIST_LIMIT).toArray()
  ]);

  const stores = toStatusCounts(storeGroups);
  const products = toStatusCounts(productGroups);
  const variants = toStatusCounts(variantGroups);
  return {
    stores, products, variants,
    inventory: toAvailabilityCounts(inventoryGroups, staleInventory),
    prices: calculatePriceCoverage(stores.active, variants.active, pricedActivePairs[0]?.count ?? 0),
    recentPrices, attentionInventory,
    inactive: {
      stores: inactiveStores.map((store) => ({ id: store._id.toHexString(), name: store.name, updatedAt: store.updatedAt })),
      products: inactiveProducts,
      variants: inactiveVariants
    }
  };
}
