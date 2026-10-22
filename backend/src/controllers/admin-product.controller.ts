import type { MongoServerError } from "mongodb";
import type { Request, Response } from "express";

import {
  createAdminProduct,
  getProductForAdmin,
  listProductsForAdmin,
  updateAdminProduct,
  updateAdminProductStatus,
  type ProductAdminInput,
  type ProductAdminUpdate
} from "../services/product.service.js";

const MAX_PAGE_SIZE = 50;
const PRODUCT_ID_PATTERN = /^prod-[a-z0-9][a-z0-9-]{1,99}$/;
const SLUG_PATTERN = /^[a-z0-9][a-z0-9-]{0,99}$/;
const IMAGE_PATTERN = /^(https?:\/\/|\/)[^\s]{1,497}$/i;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function text(value: unknown, min: number, max: number): string | null {
  return typeof value === "string" && value.trim().length >= min && value.trim().length <= max ? value.trim() : null;
}

function validProductId(value: unknown): value is string {
  return typeof value === "string" && PRODUCT_ID_PATTERN.test(value);
}

function validSlug(value: unknown): value is string {
  return typeof value === "string" && SLUG_PATTERN.test(value);
}

function readAliases(value: unknown): string[] | null {
  if (!Array.isArray(value) || value.length > 25) return null;
  const aliases = value.map((alias) => text(alias, 1, 100));
  return aliases.every((alias): alias is string => alias !== null) ? [...new Set(aliases)] : null;
}

function readImageUrl(value: unknown): string | undefined | null {
  if (value === undefined) return undefined;
  if (typeof value !== "string" || !value.trim()) return undefined;
  return IMAGE_PATTERN.test(value.trim()) ? value.trim() : null;
}

function readCreateInput(body: unknown): ProductAdminInput | null {
  if (!isRecord(body)) return null;
  const productId = validProductId(body.productId) ? body.productId : null;
  const name = text(body.name, 1, 200);
  const slug = validSlug(body.slug) ? body.slug : null;
  const category = text(body.category, 1, 100);
  const aliases = readAliases(body.aliases);
  const description = body.description === undefined ? undefined : text(body.description, 0, 1000);
  const imageUrl = readImageUrl(body.imageUrl);
  if (!productId || !name || !slug || !category || !aliases || description === null || imageUrl === null) return null;
  return { productId, name, slug, category, aliases, ...(description === undefined ? {} : { description }), ...(imageUrl === undefined ? {} : { imageUrl }) };
}

function readUpdate(body: unknown): ProductAdminUpdate | null {
  if (!isRecord(body)) return null;
  const update: ProductAdminUpdate = {};
  if (body.name !== undefined) {
    const value = text(body.name, 1, 200);
    if (!value) return null;
    update.name = value;
  }
  if (body.slug !== undefined) {
    if (!validSlug(body.slug)) return null;
    update.slug = body.slug;
  }
  if (body.category !== undefined) {
    const value = text(body.category, 1, 100);
    if (!value) return null;
    update.category = value;
  }
  if (body.description !== undefined) {
    const value = text(body.description, 0, 1000);
    if (value === null) return null;
    update.description = value;
  }
  if (body.aliases !== undefined) {
    const value = readAliases(body.aliases);
    if (!value) return null;
    update.aliases = value;
  }
  if (body.imageUrl !== undefined) {
    const value = readImageUrl(body.imageUrl);
    if (value === null) return null;
    if (value !== undefined) update.imageUrl = value;
  }
  return Object.keys(update).length ? update : null;
}

function isDuplicateKey(error: unknown): boolean {
  return typeof error === "object" && error !== null && (error as MongoServerError).code === 11000;
}

function readPage(value: unknown, fallback: number, max: number): number | null {
  if (value === undefined) return fallback;
  const parsed = typeof value === "string" ? Number(value) : Number.NaN;
  return Number.isInteger(parsed) && parsed >= 1 && parsed <= max ? parsed : null;
}

export async function getAdminProducts(request: Request, response: Response): Promise<void> {
  const page = readPage(request.query.page, 1, Number.MAX_SAFE_INTEGER);
  const limit = readPage(request.query.limit, 20, MAX_PAGE_SIZE);
  const search = typeof request.query.search === "string" ? request.query.search.trim() : "";
  const status = request.query.status === undefined ? "all" : request.query.status;
  if (page === null || limit === null || search.length > 100 || !["all", "active", "inactive"].includes(String(status))) {
    response.status(400).json({ error: "Provide valid page, limit, search, and status values." });
    return;
  }
  try {
    const result = await listProductsForAdmin((page - 1) * limit, limit, search, status as "all" | "active" | "inactive");
    response.status(200).json({ ...result, page, limit });
  } catch {
    response.status(503).json({ error: "Product service is unavailable." });
  }
}

export async function createAdminProductRoute(request: Request, response: Response): Promise<void> {
  const input = readCreateInput(request.body);
  if (!input) {
    response.status(400).json({ error: "Provide a valid explicit productId, name, slug, category, aliases, description, and imageUrl." });
    return;
  }
  try {
    response.status(201).json({ product: await createAdminProduct(input) });
  } catch (error) {
    response.status(isDuplicateKey(error) ? 409 : 503).json({ error: isDuplicateKey(error) ? "Product ID or slug already exists." : "Product service is unavailable." });
  }
}

export async function patchAdminProduct(request: Request, response: Response): Promise<void> {
  if (!validProductId(request.params.productId)) {
    response.status(400).json({ error: "A valid canonical productId is required." });
    return;
  }
  const update = readUpdate(request.body);
  if (!update) {
    response.status(400).json({ error: "Provide at least one valid editable product field." });
    return;
  }
  try {
    const product = await updateAdminProduct(request.params.productId, update);
    if (!product) {
      response.status(404).json({ error: "Product not found." });
      return;
    }
    response.status(200).json({ product });
  } catch (error) {
    response.status(isDuplicateKey(error) ? 409 : 503).json({ error: isDuplicateKey(error) ? "Product slug already exists." : "Product service is unavailable." });
  }
}

export async function patchAdminProductStatus(request: Request, response: Response): Promise<void> {
  if (!validProductId(request.params.productId) || !isRecord(request.body) || typeof request.body.isActive !== "boolean") {
    response.status(400).json({ error: "A valid productId and boolean isActive are required." });
    return;
  }
  try {
    const product = await updateAdminProductStatus(request.params.productId, request.body.isActive);
    if (!product) {
      response.status(404).json({ error: "Product not found." });
      return;
    }
    response.status(200).json({ product });
  } catch {
    response.status(503).json({ error: "Product service is unavailable." });
  }
}

export { validProductId };
