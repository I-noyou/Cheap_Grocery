import { ObjectId } from "mongodb";

import { getDatabase } from "../db/mongo.js";
import type { Availability, InventoryDocument, InventorySource } from "../models/inventory.js";
import type { PublicStore } from "./store.service.js";
import { getActiveStoreById, serializePublicStore } from "./store.service.js";
import { getVariantById } from "./product-variant.service.js";

export const INVENTORY_MAX_LIMIT = 100;
export const INVENTORY_STALE_AFTER_MS = 24 * 60 * 60 * 1000;
const STOCK_UNITS = new Set(["count", "item", "items", "piece", "pieces", "pack", "packs", "g", "kg", "ml", "l"]);

export interface InventoryInput {
  storeId: string;
  variantId: string;
  availability: Availability;
  stockQuantity: number | null;
  stockUnit: string | null;
  lastVerifiedAt: Date | null;
  source: InventorySource;
}

export interface PublicInventory {
  storeId: string;
  variantId: string;
  availability: Availability;
  stockQuantity: number | null;
  stockUnit: string | null;
  lastVerifiedAt: Date | null;
  isStale: boolean;
  source: InventorySource;
}

export function isObjectId(value: string): boolean {
  return ObjectId.isValid(value);
}

export function isAvailability(value: unknown): value is Availability {
  return value === "available" || value === "unavailable" || value === "unknown";
}

export function isInventorySource(value: unknown): value is InventorySource {
  return value === "manual" || value === "store_reported" || value === "imported";
}

export function normalizeStockUnit(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  return STOCK_UNITS.has(normalized) ? normalized : null;
}

export function serializeInventory(record: InventoryDocument): PublicInventory {
  return {
    storeId: record.storeId,
    variantId: record.variantId,
    availability: record.availability,
    stockQuantity: record.stockQuantity,
    stockUnit: record.stockUnit,
    lastVerifiedAt: record.lastVerifiedAt,
    isStale: record.lastVerifiedAt === null || Date.now() - record.lastVerifiedAt.getTime() > INVENTORY_STALE_AFTER_MS,
    source: record.source
  };
}

export async function getActiveStoreReference(storeId: string): Promise<PublicStore | null> {
  if (!isObjectId(storeId)) return null;
  return getActiveStoreById(storeId);
}

export async function validateInventoryReferences(storeId: string, variantId: string): Promise<{ store: PublicStore; variant: NonNullable<Awaited<ReturnType<typeof getVariantById>>> } | null> {
  const [store, variant] = await Promise.all([getActiveStoreReference(storeId), getVariantById(variantId)]);
  return store && variant ? { store, variant } : null;
}

export async function listInventoryForStore(storeId: string, skip: number, limit: number): Promise<PublicInventory[]> {
  const records = await (await getDatabase()).collection<InventoryDocument>("inventory")
    .find({ storeId }, { projection: { _id: 0 } })
    .sort({ variantId: 1 })
    .skip(skip)
    .limit(limit)
    .toArray();
  return records.map(serializeInventory);
}

export async function listAvailabilityForVariant(variantId: string, limit: number): Promise<Array<PublicInventory & { store: { id: string; name: string; address: PublicStore["address"] } }>> {
  const database = await getDatabase();
  const records = await database.collection<InventoryDocument>("inventory")
    .find({ variantId }, { projection: { _id: 0 } })
    .sort({ storeId: 1 })
    .limit(limit)
    .toArray();
  const storeIds = records.filter((record) => isObjectId(record.storeId)).map((record) => new ObjectId(record.storeId));
  const stores = await database.collection("stores")
    .find({ _id: { $in: storeIds }, isActive: true }, { projection: { name: 1, address: 1, location: 1 } })
    .toArray();
  const storesById = new Map(stores.map((store) => [store._id.toHexString(), store as Parameters<typeof serializePublicStore>[0]]));

  return records.flatMap((record) => {
    const store = storesById.get(record.storeId);
    if (!store) return [];
    const publicStore = serializePublicStore(store);
    return [{ ...serializeInventory(record), store: { id: publicStore.id, name: publicStore.name, address: publicStore.address } }];
  });
}

export async function upsertInventory(input: InventoryInput): Promise<"inserted" | "updated" | "skipped"> {
  const references = await validateInventoryReferences(input.storeId, input.variantId);
  if (!references) throw new Error("Inventory references are invalid.");

  const collection = (await getDatabase()).collection<InventoryDocument>("inventory");
  const existing = await collection.findOne({ storeId: input.storeId, variantId: input.variantId }, { projection: { availability: 1, stockQuantity: 1, stockUnit: 1, lastVerifiedAt: 1, source: 1 } });
  if (existing
    && existing.availability === input.availability
    && existing.stockQuantity === input.stockQuantity
    && existing.stockUnit === input.stockUnit
    && existing.lastVerifiedAt?.getTime() === input.lastVerifiedAt?.getTime()
    && existing.source === input.source) {
    return "skipped";
  }

  const now = new Date();
  const result = await collection.updateOne(
    { storeId: input.storeId, variantId: input.variantId },
    {
      $setOnInsert: { _id: new ObjectId(), createdAt: now },
      $set: {
        availability: input.availability,
        stockQuantity: input.stockQuantity,
        stockUnit: input.stockUnit,
        lastVerifiedAt: input.lastVerifiedAt,
        source: input.source,
        updatedAt: now
      }
    },
    { upsert: true }
  );
  return result.upsertedCount > 0 ? "inserted" : "updated";
}
