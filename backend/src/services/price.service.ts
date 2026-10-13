import { ObjectId } from "mongodb";

import { getDatabase } from "../db/mongo.js";
import type { ProductVariantPackage } from "../models/product-variant.js";
import type { PriceDocument, PriceHistoryDocument, PriceSource } from "../models/price.js";
import { getVariantById } from "./product-variant.service.js";
import { getActiveStoreById } from "./store.service.js";

export const PRICE_MAX_LIMIT = 100;
export const PRICE_STALE_AFTER_MS = 7 * 24 * 60 * 60 * 1000;

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
    getActiveStoreById(storeId),
    getVariantById(variantId)
  ]);
  return store && variant ? { variant } : null;
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

export async function upsertPrice(input: PriceInput): Promise<{ price: PublicPrice; changed: boolean }> {
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
  const result = await collection.updateOne(
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
