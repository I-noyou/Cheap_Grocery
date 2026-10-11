import { ObjectId } from "mongodb";

import { getDatabase } from "../db/mongo.js";
import type { PackageUnit, ProductVariantDocument, ProductVariantListItem, ProductVariantSeedInput } from "../models/product-variant.js";
import { getProductById } from "./product.service.js";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;
const UNIT_ALIASES: Record<string, PackageUnit> = {
  g: "g", gram: "g", grams: "g",
  kg: "kg", kilogram: "kg", kilograms: "kg",
  ml: "ml", millilitre: "ml", millilitres: "ml", milliliter: "ml", milliliters: "ml",
  l: "l", litre: "l", litres: "l", liter: "l", liters: "l",
  count: "count", piece: "count", pieces: "count", pack: "count", packs: "count"
};

export function normalizeVariantText(value: string | undefined): string {
  return (value ?? "").trim().replace(/\s+/g, " ").toLocaleLowerCase("en-US");
}

export function normalizePackage(value: string): { quantity: number; unit: PackageUnit; displayName: string } | null {
  const displayName = value.trim().replace(/\s+/g, " ");
  const match = displayName.match(/^(?:(\d+)\s*[x×]\s*)?(\d+(?:\.\d+)?)\s*(kg|kilograms?|g|grams?|l|lit(?:re|er)s?|ml|millilit(?:re|er)s?|packs?|pieces?|piece|count)$/i);
  if (!match) return null;

  const rawQuantity = Number(match[2]) * Number(match[1] ?? 1);
  const rawUnit = match[3].toLocaleLowerCase("en-US");
  const unit = UNIT_ALIASES[rawUnit];
  if (!unit || !Number.isFinite(rawQuantity) || rawQuantity <= 0) return null;
  if (unit === "kg" || unit === "l") {
    return { quantity: Number((rawQuantity * 1000).toFixed(6)), unit: unit === "kg" ? "g" : "ml", displayName };
  }
  return { quantity: Number(rawQuantity.toFixed(6)), unit, displayName };
}

export function createVariantId(input: Pick<ProductVariantSeedInput, "productId" | "normalizedVariety" | "normalizedBrand" | "package">): string {
  const identity = [input.productId, input.normalizedVariety || "none", input.normalizedBrand || "none", input.package.quantity, input.package.unit]
    .map((part) => encodeURIComponent(String(part)))
    .join("~");
  return `variant-${identity}`;
}

export function normalizeVariantSeed(
  productId: string,
  varietyValue: unknown,
  brandValue: unknown,
  packageValue: unknown
): ProductVariantSeedInput | null {
  const variety = typeof varietyValue === "string" ? varietyValue.trim().replace(/\s+/g, " ") : "";
  const brand = typeof brandValue === "string" ? brandValue.trim().replace(/\s+/g, " ") : "";
  const displayName = typeof packageValue === "string" ? packageValue : "";
  const packageValueNormalized = normalizePackage(displayName);
  if (!packageValueNormalized) return null;

  const normalizedVariety = normalizeVariantText(variety);
  const normalizedBrand = normalizeVariantText(brand);
  const seed = {
    productId,
    variety,
    normalizedVariety,
    brand,
    normalizedBrand,
    package: packageValueNormalized,
    isActive: true
  };
  return { ...seed, variantId: createVariantId(seed) };
}

function serializeVariant(variant: ProductVariantDocument): ProductVariantListItem {
  return {
    variantId: variant.variantId,
    productId: variant.productId,
    variety: variant.variety,
    normalizedVariety: variant.normalizedVariety,
    brand: variant.brand,
    normalizedBrand: variant.normalizedBrand,
    package: variant.package,
    isActive: variant.isActive
  };
}

export async function listProductVariants(productId: string, limit = DEFAULT_LIMIT): Promise<ProductVariantListItem[]> {
  const safeLimit = Number.isInteger(limit) && limit > 0 && limit <= MAX_LIMIT ? limit : DEFAULT_LIMIT;
  const variants = await (await getDatabase()).collection<ProductVariantDocument>("productVariants")
    .find({ productId, isActive: true }, { projection: { _id: 0, createdAt: 0, updatedAt: 0 } })
    .sort({ normalizedVariety: 1, normalizedBrand: 1, "package.quantity": 1, "package.unit": 1 })
    .limit(safeLimit)
    .toArray();
  return variants.map(serializeVariant);
}

export async function getVariantById(variantId: string): Promise<ProductVariantListItem | null> {
  const collection = (await getDatabase()).collection<ProductVariantDocument>("productVariants");
  const projection = { projection: { _id: 0, createdAt: 0, updatedAt: 0 } };
  const variant = await collection.findOne({ variantId, isActive: true }, projection)
    || await collection.findOne({ variantId: encodeURIComponent(variantId), isActive: true }, projection);
  return variant ? serializeVariant(variant) : null;
}

export interface VariantSearchFilters {
  productId?: string;
  brand?: string;
  variety?: string;
  quantity?: number;
  unit?: PackageUnit;
  limit?: number;
}

export async function searchProductVariants(filters: VariantSearchFilters): Promise<ProductVariantListItem[]> {
  const query: Record<string, unknown> = { isActive: true };
  if (filters.productId) query.productId = filters.productId;
  if (filters.brand) query.normalizedBrand = normalizeVariantText(filters.brand);
  if (filters.variety) query.normalizedVariety = normalizeVariantText(filters.variety);
  if (filters.quantity !== undefined) query["package.quantity"] = filters.quantity;
  if (filters.unit) query["package.unit"] = filters.unit;
  const variants = await (await getDatabase()).collection<ProductVariantDocument>("productVariants")
    .find(query, { projection: { _id: 0, createdAt: 0, updatedAt: 0 } })
    .sort({ productId: 1, normalizedVariety: 1, normalizedBrand: 1, "package.quantity": 1 })
    .limit(filters.limit ?? DEFAULT_LIMIT)
    .toArray();
  return variants.map(serializeVariant);
}

export async function upsertProductVariant(seed: ProductVariantSeedInput): Promise<"inserted" | "updated" | "skipped"> {
  if (!(await getProductById(seed.productId))) {
    throw new Error(`Canonical product ${seed.productId} does not exist.`);
  }
  const collection = (await getDatabase()).collection<ProductVariantDocument>("productVariants");
  const existing = await collection.findOne({ variantId: seed.variantId }, {
    projection: { productId: 1, variety: 1, normalizedVariety: 1, brand: 1, normalizedBrand: 1, package: 1, isActive: 1 }
  });
  if (existing
    && existing.productId === seed.productId
    && existing.variety === seed.variety
    && existing.normalizedVariety === seed.normalizedVariety
    && existing.brand === seed.brand
    && existing.normalizedBrand === seed.normalizedBrand
    && existing.isActive === seed.isActive
    && existing.package.quantity === seed.package.quantity
    && existing.package.unit === seed.package.unit
    && existing.package.displayName === seed.package.displayName) {
    return "skipped";
  }
  const now = new Date();
  const result = await collection.updateOne(
    { variantId: seed.variantId },
    {
      $setOnInsert: { _id: new ObjectId(), createdAt: now },
      $set: {
        productId: seed.productId,
        variety: seed.variety,
        normalizedVariety: seed.normalizedVariety,
        brand: seed.brand,
        normalizedBrand: seed.normalizedBrand,
        package: seed.package,
        isActive: seed.isActive,
        updatedAt: now
      }
    },
    { upsert: true }
  );
  if (result.upsertedCount > 0) return "inserted";
  return result.modifiedCount > 0 ? "updated" : "skipped";
}
