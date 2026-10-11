import type { Request, Response } from "express";

import { getProductById } from "../services/product.service.js";
import { getVariantById, listProductVariants, normalizePackage, normalizeVariantText, searchProductVariants } from "../services/product-variant.service.js";

const MAX_LIMIT = 100;

function readLimit(value: unknown): number {
  const parsed = typeof value === "string" ? Number(value) : Number.NaN;
  return Number.isInteger(parsed) && parsed >= 1 && parsed <= MAX_LIMIT ? parsed : 20;
}

function readSingleQuery(value: unknown): string | undefined {
  const candidate = Array.isArray(value) ? value[0] : value;
  return typeof candidate === "string" && candidate.trim() ? candidate.trim() : undefined;
}

export async function getProductVariants(request: Request, response: Response): Promise<void> {
  const productId = readSingleQuery(request.params.productId);
  if (!productId || productId.length > 100) {
    response.status(400).json({ error: "A valid productId is required." });
    return;
  }

  try {
    if (!(await getProductById(productId))) {
      response.status(404).json({ error: "Product not found." });
      return;
    }
    const variants = await listProductVariants(productId, readLimit(request.query.limit));
    response.status(200).json({ variants, count: variants.length });
  } catch {
    response.status(503).json({ error: "Product variant service is unavailable." });
  }
}

export async function getVariantDetails(request: Request, response: Response): Promise<void> {
  const variantId = readSingleQuery(request.params.variantId);
  if (!variantId || variantId.length > 500) {
    response.status(400).json({ error: "A valid variantId is required." });
    return;
  }

  try {
    const variant = await getVariantById(variantId);
    if (!variant) {
      response.status(404).json({ error: "Variant not found." });
      return;
    }
    response.status(200).json({ variant });
  } catch {
    response.status(503).json({ error: "Product variant service is unavailable." });
  }
}

export async function searchVariants(request: Request, response: Response): Promise<void> {
  const productId = readSingleQuery(request.query.productId);
  const brand = readSingleQuery(request.query.brand);
  const variety = readSingleQuery(request.query.variety);
  const quantityText = readSingleQuery(request.query.quantity);
  const unit = readSingleQuery(request.query.unit);

  if (productId && productId.length > 100) {
    response.status(400).json({ error: "productId is invalid." });
    return;
  }
  if (brand && (brand.length > 100 || !normalizeVariantText(brand))) {
    response.status(400).json({ error: "brand is invalid." });
    return;
  }
  if (variety && (variety.length > 100 || !normalizeVariantText(variety))) {
    response.status(400).json({ error: "variety is invalid." });
    return;
  }

  let quantity: number | undefined;
  if (quantityText) {
    quantity = Number(quantityText);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      response.status(400).json({ error: "quantity must be a positive finite number." });
      return;
    }
  }
  if (unit && !normalizePackage(`1 ${unit}`)) {
    response.status(400).json({ error: "unit is invalid." });
    return;
  }
  const packageFilter = quantity !== undefined && unit ? normalizePackage(`${quantity} ${unit}`) : null;
  if (quantity !== undefined && unit && !packageFilter) {
    response.status(400).json({ error: "quantity and unit must form a valid package size." });
    return;
  }

  try {
    if (productId && !(await getProductById(productId))) {
      response.status(404).json({ error: "Product not found." });
      return;
    }
    const variants = await searchProductVariants({
      productId,
      brand,
      variety,
      quantity: packageFilter?.quantity ?? quantity,
      unit: packageFilter?.unit ?? (unit ? normalizePackage(`1 ${unit}`)?.unit : undefined),
      limit: readLimit(request.query.limit)
    });
    response.status(200).json({ variants, count: variants.length });
  } catch {
    response.status(503).json({ error: "Product variant service is unavailable." });
  }
}
