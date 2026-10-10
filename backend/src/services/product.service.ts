import { ObjectId } from "mongodb";
import { createHash } from "node:crypto";

import { getDatabase } from "../db/mongo.js";
import type { ProductDocument, ProductListItem, ProductSeedInput } from "../models/product.js";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-+/g, "-") || "product";
}

export function deriveProductId(legacyKey: string, productName: string): string {
  const baseValue = (legacyKey || productName || "product").trim();
  const normalized = slugify(baseValue);
  if (normalized && normalized !== "product") {
    return `prod-${normalized}`;
  }

  return `prod-${createHash("sha256").update(baseValue || "product").digest("hex").slice(0, 12)}`;
}

export function normalizeCatalogName(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 && value.trim().length <= 200 ? value.trim() : null;
}

export function normalizeProductSeed(entry: Record<string, unknown>, legacyKey?: string): ProductSeedInput | null {
  const productName = normalizeCatalogName(entry.productName);
  if (!productName) {
    return null;
  }

  const catalogKey = legacyKey ?? (typeof entry.catalogKey === "string" ? entry.catalogKey : "");
  const productId = deriveProductId(catalogKey, productName);
  const name = productName;
  const slug = slugify(name);
  const legalAliases = new Set<string>();

  if (catalogKey) {
    legalAliases.add(catalogKey);
    legalAliases.add(slugify(catalogKey));
  }
  legalAliases.add(name);
  legalAliases.add(slug);
  const rawVarieties = Array.isArray(entry.varieties) ? entry.varieties : [];
  for (const variety of rawVarieties) {
    if (!variety || typeof variety !== "object") continue;
    const varietyName = normalizeCatalogName((variety as Record<string, unknown>).name);
    if (varietyName) {
      legalAliases.add(varietyName);
      legalAliases.add(slugify(varietyName));
    }
    const id = normalizeCatalogName((variety as Record<string, unknown>).id);
    if (id) {
      legalAliases.add(id);
      legalAliases.add(slugify(id));
    }
  }

  return {
    productId,
    name,
    slug,
    category: catalogKey || "uncategorized",
    description: `Legacy product entry for ${name}.`,
    aliases: Array.from(legalAliases).filter((alias) => alias && alias.toLowerCase() !== slug.toLowerCase()).slice(0, 25),
    imageUrl: typeof entry.imageSrc === "string" && entry.imageSrc.trim() ? entry.imageSrc.trim() : undefined,
    isActive: true,
    legacyCatalogKey: catalogKey || undefined,
    legacyCatalog: entry
  };
}

function serializeProduct(product: ProductDocument): ProductListItem {
  return {
    id: product.productId,
    productId: product.productId,
    name: product.name,
    slug: product.slug,
    category: product.category,
    aliases: product.aliases,
    imageUrl: product.imageUrl,
    isActive: product.isActive,
    legacyCatalogKey: product.legacyCatalogKey
  };
}

export async function listActiveProducts(page = 1, limit = DEFAULT_LIMIT): Promise<{ products: ProductListItem[]; total: number; page: number; limit: number }> {
  const safePage = Number.isInteger(page) && page > 0 ? page : 1;
  const safeLimit = Number.isInteger(limit) && limit > 0 && limit <= MAX_LIMIT ? limit : DEFAULT_LIMIT;
  const database = await getDatabase();
  const collection = database.collection<ProductDocument>("products");
  const total = await collection.countDocuments({ isActive: true });
  const products = await collection.find({ isActive: true }, { projection: { _id: 0 } })
    .sort({ name: 1 })
    .skip((safePage - 1) * safeLimit)
    .limit(safeLimit)
    .toArray();

  return { products: products.map(serializeProduct), total, page: safePage, limit: safeLimit };
}

export async function getProductById(productId: string): Promise<ProductListItem | null> {
  const database = await getDatabase();
  const product = await database.collection<ProductDocument>("products").findOne({ productId, isActive: true });
  return product ? serializeProduct(product) : null;
}

export async function searchProducts(query: string, limit = 10): Promise<ProductListItem[]> {
  const safeQuery = query.trim();
  if (!safeQuery || safeQuery.length > 100) {
    return [];
  }

  const safeLimit = Number.isInteger(limit) && limit > 0 && limit <= MAX_LIMIT ? limit : 10;
  const database = await getDatabase();
  const searchPattern = new RegExp(safeQuery.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
  const products = await database.collection<ProductDocument>("products")
    .find({
      isActive: true,
      $or: [
        { name: { $regex: searchPattern } },
        { slug: { $regex: searchPattern } },
        { aliases: { $in: [safeQuery] } },
        { aliases: { $elemMatch: { $regex: searchPattern } } }
      ]
    }, { projection: { _id: 0 } })
    .sort({ name: 1 })
    .limit(safeLimit)
    .toArray();

  return products.map(serializeProduct);
}

export async function upsertProductSeed(seed: ProductSeedInput): Promise<{ created: boolean; updated: boolean }> {
  const database = await getDatabase();
  const now = new Date();
  const product: ProductDocument = {
    _id: new ObjectId(),
    productId: seed.productId,
    name: seed.name,
    slug: seed.slug,
    category: seed.category,
    description: seed.description,
    aliases: [...new Set(seed.aliases)].slice(0, 25),
    imageUrl: seed.imageUrl,
    isActive: seed.isActive,
    legacyCatalogKey: seed.legacyCatalogKey,
    legacyCatalog: seed.legacyCatalog ?? null,
    createdAt: now,
    updatedAt: now
  };

  const existing = await database.collection<ProductDocument>("products").findOne({ productId: seed.productId }, { projection: { _id: 1, productId: 1, name: 1, slug: 1, category: 1, description: 1, aliases: 1, imageUrl: 1, isActive: 1, legacyCatalogKey: 1, legacyCatalog: 1, updatedAt: 1 } });

  if (!existing) {
    await database.collection<ProductDocument>("products").insertOne(product);
    return { created: true, updated: false };
  }

  const updatePayload: Partial<ProductDocument> = {
    name: seed.name,
    slug: seed.slug,
    category: seed.category,
    description: seed.description,
    aliases: [...new Set(seed.aliases)].slice(0, 25),
    imageUrl: seed.imageUrl,
    isActive: seed.isActive,
    legacyCatalogKey: seed.legacyCatalogKey,
    legacyCatalog: seed.legacyCatalog ?? null,
    updatedAt: now
  };

  const hasChanges = JSON.stringify(existing) !== JSON.stringify({ ...existing, ...updatePayload });
  if (hasChanges) {
    await database.collection<ProductDocument>("products").updateOne({ _id: existing._id }, { $set: updatePayload });
    return { created: false, updated: true };
  }

  return { created: false, updated: false };
}
