import type { Request, Response } from "express";

import { getProductById, listActiveProducts, searchProducts } from "../services/product.service.js";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

function readInteger(value: unknown, fallback: number, max: number): number | null {
  if (value === undefined) return fallback;
  const parsed = typeof value === "string" && value.trim() ? Number(value) : Number.NaN;
  return Number.isInteger(parsed) && parsed >= 1 && parsed <= max ? parsed : null;
}

export async function getProducts(_request: Request, response: Response): Promise<void> {
  const page = readInteger(_request.query.page, 1, 1000) ?? 1;
  const limit = readInteger(_request.query.limit, DEFAULT_LIMIT, MAX_LIMIT) ?? DEFAULT_LIMIT;

  try {
    const result = await listActiveProducts(page, limit);
    response.status(200).json({
      products: result.products,
      count: result.products.length,
      total: result.total,
      page: result.page,
      limit: result.limit
    });
  } catch {
    response.status(503).json({ error: "Product service is unavailable." });
  }
}

export async function getProductByRoute(request: Request, response: Response): Promise<void> {
  const productId = typeof request.params.productId === "string" ? request.params.productId.trim() : "";
  if (!productId) {
    response.status(400).json({ error: "A valid productId is required." });
    return;
  }

  try {
    const product = await getProductById(productId);
    if (!product) {
      response.status(404).json({ error: "Product not found." });
      return;
    }

    response.status(200).json({ product });
  } catch {
    response.status(503).json({ error: "Product service is unavailable." });
  }
}

export async function searchProductsByQuery(request: Request, response: Response): Promise<void> {
  const rawQuery = request.query.q;
  const firstValue = Array.isArray(rawQuery) ? rawQuery[0] : rawQuery;
  const query = typeof firstValue === "string" ? firstValue.trim() : "";

  if (!query || query.length < 2 || query.length > 100) {
    response.status(400).json({ error: "q must be a string between 2 and 100 characters." });
    return;
  }

  const limit = readInteger(request.query.limit, 10, MAX_LIMIT) ?? 10;

  try {
    const products = await searchProducts(query, limit);
    response.status(200).json({ products, count: products.length, query });
  } catch {
    response.status(503).json({ error: "Product service is unavailable." });
  }
}
