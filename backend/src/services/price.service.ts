import { ObjectId } from "mongodb";

import { getDatabase } from "../db/mongo.js";
import type { InventoryDocument } from "../models/inventory.js";
import type { ProductVariantPackage } from "../models/product-variant.js";
import type { PriceDocument, PriceHistoryDocument, PriceSource } from "../models/price.js";
import type { ProductDocument } from "../models/product.js";
import type { StoreDocument } from "../models/store.js";
import { getProductById } from "./product.service.js";
import { getVariantById } from "./product-variant.service.js";
import { findNearbyStores } from "./store.service.js";

export const PRICE_MAX_LIMIT = 100;
export const PRICE_STALE_AFTER_MS = 7 * 24 * 60 * 60 * 1000;
export const COMPARISON_MAX_AGE_DAYS = 365;

export interface PriceInput {
  storeId: string;
  variantId: string;
  amount: number;
  currency: string;
  source: PriceSource;
  observedAt: Date;
  priceUnit?: ProductVariantPackage;
}

export interface PublicPrice {
  id: string;
  storeId: string;
  variantId: string;
  amount: number;
  currency: string;
  priceUnit: ProductVariantPackage;
  source: PriceSource;
  observedAt: Date;
  updatedAt: Date;
  isStale: boolean;
}

export interface PublicPriceHistory {
  storeId: string;
  variantId: string;
  amount: number;
  currency: string;
  source: PriceSource;
  observedAt: Date;
  recordedAt: Date;
}

export interface PriceComparisonOptions {
  radiusKm?: number;
  latitude?: number;
  longitude?: number;
  maxAgeDays: number;
  page: number;
  limit: number;
}

export interface PriceComparisonResult {
  variantId: string;
  variant: NonNullable<Awaited<ReturnType<typeof getVariantById>>>;
  product: NonNullable<Awaited<ReturnType<typeof getProductById>>> | null;
  comparisonCurrency: string | null;
  prices: Array<{
    store: { id: string; name: string; address: StoreDocument["address"] };
    amount: number;
    currency: string;
    priceUnit: ProductVariantPackage;
    source: PriceSource;
    observedAt: Date;
    ageDays: number;
    freshness: "fresh";
    inventory: {
      availability: "available" | "unavailable" | "unknown";
      recordPresent: boolean;
      stockQuantity: number | null;
      stockUnit: string | null;
      isStale: boolean | null;
    };
    distanceKm?: number;
    savingsVersusHighestPrice: number;
  }>;
  count: number;
  evaluatedAt: Date;
  maxAgeDays: number;
  excluded: {
    stale: number;
    invalid: number;
    missingStores: number;
    outsideRadius: number;
    currencies: string[];
  };
  message?: string;
}

export function isPriceSource(value: unknown): value is PriceSource {
  return value === "manual" || value === "store_reported" || value === "imported";
}

export function isValidVariantId(value: string): boolean {
  return value.length > 0 && value.length <= 500 && !/[\/\\\u0000-\u001f]/.test(value);
}

export function serializePrice(record: PriceDocument): PublicPrice {
  return {
    id: record._id.toHexString(),
    storeId: record.storeId,
    variantId: record.variantId,
    amount: record.amount,
    currency: record.currency,
    priceUnit: record.priceUnit,
    source: record.source,
    observedAt: record.observedAt,
    updatedAt: record.updatedAt,
    isStale: Date.now() - record.observedAt.getTime() > PRICE_STALE_AFTER_MS
  };
}

function serializeHistory(record: PriceHistoryDocument): PublicPriceHistory {
  return {
    storeId: record.storeId,
    variantId: record.variantId,
    amount: record.amount,
    currency: record.currency,
    source: record.source,
    observedAt: record.observedAt,
    recordedAt: record.recordedAt
  };
}

export async function validatePriceReferences(storeId: string, variantId: string): Promise<{
  variant: NonNullable<Awaited<ReturnType<typeof getVariantById>>>;
} | null> {
  const [store, variant] = await Promise.all([
    isValidObjectId(storeId) ? (await getDatabase()).collection<StoreDocument>("stores").findOne({ _id: new ObjectId(storeId), isActive: true }) : null,
    getVariantById(variantId)
  ]);
  return store && variant ? { variant } : null;
}

function isValidObjectId(value: string): boolean {
  return /^[a-f\d]{24}$/i.test(value);
}

function isValidCurrency(value: unknown): value is string {
  return typeof value === "string" && Intl.supportedValuesOf("currency").includes(value);
}

export function selectComparisonCurrency(records: Array<{ currency: string }>): string | null {
  const counts = new Map<string, number>();
  for (const record of records) counts.set(record.currency, (counts.get(record.currency) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0] ?? null;
}

export async function comparePricesForVariant(
  variantId: string,
  options: PriceComparisonOptions
): Promise<PriceComparisonResult | null> {
  const [variant, database] = await Promise.all([getVariantById(variantId), getDatabase()]);
  if (!variant) return null;
  const product = await getProductById(variant.productId);
  const evaluatedAt = new Date();
  const minimumObservedAt = new Date(evaluatedAt.getTime() - options.maxAgeDays * 24 * 60 * 60 * 1000);
  const records = await database.collection<PriceDocument>("prices")
    .find({ variantId }, { projection: { _id: 0, storeId: 1, variantId: 1, amount: 1, currency: 1, priceUnit: 1, source: 1, observedAt: 1 } })
    .toArray();

  const excluded = { stale: 0, invalid: 0, missingStores: 0, outsideRadius: 0, currencies: [] as string[] };
  const eligible = records.filter((record) => {
    const valid = Number.isFinite(record.amount) && record.amount > 0 && isValidCurrency(record.currency)
      && record.observedAt instanceof Date && !Number.isNaN(record.observedAt.getTime())
      && record.priceUnit?.quantity === variant.package.quantity
      && record.priceUnit?.unit === variant.package.unit
      && record.priceUnit?.displayName === variant.package.displayName;
    if (!valid) {
      excluded.invalid++;
      return false;
    }
    if (record.observedAt < minimumObservedAt || record.observedAt > evaluatedAt) {
      excluded.stale++;
      return false;
    }
    return true;
  });

  const nearbyStores = options.latitude !== undefined && options.longitude !== undefined
    ? await findNearbyStores(options.latitude, options.longitude, options.radiusKm ?? 5, 100)
    : null;
  const nearbyIds = nearbyStores ? new Set(nearbyStores.map((store) => store.id)) : null;
  const validStorePrices = eligible.filter((record) => isValidObjectId(record.storeId));
  excluded.outsideRadius = nearbyIds === null
    ? 0
    : validStorePrices.filter((record) => !nearbyIds.has(record.storeId)).length;
  const storeIds = [...new Set(validStorePrices.map((record) => record.storeId))]
    .filter((storeId) => nearbyIds === null || nearbyIds.has(storeId));
  excluded.missingStores += eligible.filter((record) => !isValidObjectId(record.storeId)).length;

  const stores = await database.collection<StoreDocument>("stores")
    .find({ _id: { $in: storeIds.map((storeId) => new ObjectId(storeId)) }, isActive: true }, { projection: { name: 1, address: 1, location: 1 } })
    .toArray();
  const storesById = new Map(stores.map((store) => [store._id.toHexString(), store]));
  const current = validStorePrices.filter((record) => storesById.has(record.storeId));
  excluded.missingStores += validStorePrices
    .filter((record) => (nearbyIds === null || nearbyIds.has(record.storeId)) && !storesById.has(record.storeId))
    .length;
  const comparisonCurrency = selectComparisonCurrency(current);
  const currencies = [...new Set(current.map((record) => record.currency))].sort();
  excluded.currencies = currencies.filter((currency) => currency !== comparisonCurrency);
  const sameCurrency = current.filter((record) => record.currency === comparisonCurrency);
  const highest = sameCurrency.reduce((max, record) => Math.max(max, record.amount), 0);
  const inventory = await database.collection<InventoryDocument>("inventory")
    .find({ variantId, storeId: { $in: sameCurrency.map((record) => record.storeId) } }, { projection: { _id: 0, storeId: 1, availability: 1, stockQuantity: 1, stockUnit: 1, lastVerifiedAt: 1 } })
    .toArray();
  const inventoryByStore = new Map(inventory.map((record) => [record.storeId, record]));
  const nearbyById = new Map((nearbyStores ?? []).map((store) => [store.id, store]));
  const sorted = sameCurrency.sort((a, b) => a.amount - b.amount
    || (storesById.get(a.storeId)?.name ?? "").localeCompare(storesById.get(b.storeId)?.name ?? "")
    || a.storeId.localeCompare(b.storeId));
  const pageRecords = sorted.slice((options.page - 1) * options.limit, options.page * options.limit);

  return {
    variantId,
    variant,
    product,
    comparisonCurrency,
    prices: pageRecords.map((record) => {
      const store = storesById.get(record.storeId)!;
      const inventoryRecord = inventoryByStore.get(record.storeId);
      const distanceKm = nearbyById.get(record.storeId)?.distanceKm;
      return {
        store: { id: record.storeId, name: store.name, address: store.address },
        amount: record.amount,
        currency: record.currency,
        priceUnit: record.priceUnit,
        source: record.source,
        observedAt: record.observedAt,
        ageDays: Math.max(0, Number(((evaluatedAt.getTime() - record.observedAt.getTime()) / 86400000).toFixed(2))),
        freshness: "fresh" as const,
        inventory: inventoryRecord ? {
          availability: inventoryRecord.availability,
          recordPresent: true,
          stockQuantity: inventoryRecord.stockQuantity,
          stockUnit: inventoryRecord.stockUnit,
          isStale: inventoryRecord.lastVerifiedAt === null || evaluatedAt.getTime() - inventoryRecord.lastVerifiedAt.getTime() > 24 * 60 * 60 * 1000
        } : {
          availability: "unknown" as const,
          recordPresent: false,
          stockQuantity: null,
          stockUnit: null,
          isStale: null
        },
        ...(distanceKm === undefined ? {} : { distanceKm }),
        savingsVersusHighestPrice: Number((highest - record.amount).toFixed(2))
      };
    }),
    count: sameCurrency.length,
    evaluatedAt,
    maxAgeDays: options.maxAgeDays,
    excluded,
    ...(sameCurrency.length === 0 ? { message: "No eligible prices are available for this variant." } : {})
  };
}

export async function listPricesForStore(storeId: string, skip: number, limit: number): Promise<PublicPrice[]> {
  const records = await (await getDatabase()).collection<PriceDocument>("prices")
    .find({ storeId }, { projection: { _id: 1, storeId: 1, variantId: 1, amount: 1, currency: 1, priceUnit: 1, source: 1, observedAt: 1, updatedAt: 1 } })
    .sort({ variantId: 1 })
    .skip(skip)
    .limit(limit)
    .toArray();
  return records.map(serializePrice);
}

export async function listPricesForVariant(variantId: string, limit: number): Promise<PublicPrice[]> {
  const records = await (await getDatabase()).collection<PriceDocument>("prices")
    .find({ variantId }, { projection: { _id: 1, storeId: 1, variantId: 1, amount: 1, currency: 1, priceUnit: 1, source: 1, observedAt: 1, updatedAt: 1 } })
    .sort({ storeId: 1 })
    .limit(limit)
    .toArray();
  return records.map(serializePrice);
}

export async function listPricesForAdmin(
  filters: { storeId?: string; variantId?: string },
  skip: number,
  limit: number
): Promise<PublicPrice[]> {
  const query: Partial<Pick<PriceDocument, "storeId" | "variantId">> = {};
  if (filters.storeId) query.storeId = filters.storeId;
  if (filters.variantId) query.variantId = filters.variantId;
  const records = await (await getDatabase()).collection<PriceDocument>("prices")
    .find(query, { projection: { _id: 1, storeId: 1, variantId: 1, amount: 1, currency: 1, priceUnit: 1, source: 1, observedAt: 1, updatedAt: 1 } })
    .sort({ storeId: 1, variantId: 1 })
    .skip(skip)
    .limit(limit)
    .toArray();
  return records.map(serializePrice);
}

export async function listPriceHistory(
  storeId: string,
  variantId: string,
  skip: number,
  limit: number
): Promise<PublicPriceHistory[]> {
  const records = await (await getDatabase()).collection<PriceHistoryDocument>("priceHistory")
    .find({ storeId, variantId }, { projection: { _id: 0, storeId: 1, variantId: 1, amount: 1, currency: 1, source: 1, observedAt: 1, recordedAt: 1 } })
    .sort({ observedAt: 1, recordedAt: 1 })
    .skip(skip)
    .limit(limit)
    .toArray();
  return records.map(serializeHistory);
}

export async function upsertPrice(input: PriceInput, retried = false): Promise<{ price: PublicPrice; changed: boolean }> {
  const references = await validatePriceReferences(input.storeId, input.variantId);
  if (!references) throw new Error("Price references are invalid.");

  const priceUnit = references.variant.package;
  if (input.priceUnit && (
    input.priceUnit.quantity !== priceUnit.quantity
    || input.priceUnit.unit !== priceUnit.unit
    || input.priceUnit.displayName !== priceUnit.displayName
  )) {
    throw new Error("priceUnit must match the exact product variant.");
  }

  const database = await getDatabase();
  const collection = database.collection<PriceDocument>("prices");
  const existing = await collection.findOne(
    { storeId: input.storeId, variantId: input.variantId },
    { projection: { _id: 1, amount: 1, currency: 1, priceUnit: 1, source: 1, observedAt: 1, updatedAt: 1, createdAt: 1 } }
  );
  const unchanged = existing
    && existing.amount === input.amount
    && existing.currency === input.currency
    && existing.source === input.source
    && existing.observedAt.getTime() === input.observedAt.getTime()
    && existing.priceUnit.quantity === priceUnit.quantity
    && existing.priceUnit.unit === priceUnit.unit
    && existing.priceUnit.displayName === priceUnit.displayName;
  if (unchanged) return { price: serializePrice({ ...existing, storeId: input.storeId, variantId: input.variantId, priceUnit } as PriceDocument), changed: false };

  const now = new Date();
  let result;
  try {
    result = await collection.updateOne(
      { storeId: input.storeId, variantId: input.variantId },
      {
        $setOnInsert: { _id: new ObjectId(), createdAt: now },
        $set: {
          amount: input.amount,
          currency: input.currency,
          priceUnit,
          source: input.source,
          observedAt: input.observedAt,
          updatedAt: now
        }
      },
      { upsert: true }
    );
  } catch (error) {
    // Preserve the unique current-price identity when simultaneous first writes race.
    if (!retried && typeof error === "object" && error !== null && (error as { code?: unknown }).code === 11000) {
      return upsertPrice(input, true);
    }
    throw error;
  }

  const current = await collection.findOne({ storeId: input.storeId, variantId: input.variantId });
  if (!current) throw new Error("Price was not available after update.");

  await database.collection<PriceHistoryDocument>("priceHistory").insertOne({
    _id: new ObjectId(),
    storeId: input.storeId,
    variantId: input.variantId,
    amount: input.amount,
    currency: input.currency,
    source: input.source,
    observedAt: input.observedAt,
    recordedAt: now
  });

  return { price: serializePrice(current), changed: result.upsertedCount > 0 || result.modifiedCount > 0 };
}
