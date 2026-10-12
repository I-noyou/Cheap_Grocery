import type { Request, Response } from "express";

import {
  INVENTORY_MAX_LIMIT,
  getActiveStoreReference,
  isObjectId,
  isAvailability,
  listAvailabilityForVariant,
  listInventoryForStore
} from "../services/inventory.service.js";
import { getVariantById } from "../services/product-variant.service.js";

function readSingle(value: unknown): string | undefined {
  const candidate = Array.isArray(value) ? value[0] : value;
  return typeof candidate === "string" && candidate.trim() ? candidate.trim() : undefined;
}

function readPositiveInteger(value: unknown, fallback: number, max: number): number | null {
  if (value === undefined) return fallback;
  const parsed = typeof value === "string" && value.trim() ? Number(value) : Number.NaN;
  return Number.isInteger(parsed) && parsed >= 1 && parsed <= max ? parsed : null;
}

export async function getStoreInventory(request: Request, response: Response): Promise<void> {
  const storeId = readSingle(request.params.storeId);
  if (!storeId || storeId.length > 100 || !isObjectId(storeId)) {
    response.status(400).json({ error: "A valid storeId is required." });
    return;
  }

  const limit = readPositiveInteger(request.query.limit, 20, INVENTORY_MAX_LIMIT);
  const page = readPositiveInteger(request.query.page, 1, 10000);
  if (limit === null || page === null) {
    response.status(400).json({ error: "page and limit must be positive bounded integers." });
    return;
  }

  try {
    if (!(await getActiveStoreReference(storeId))) {
      response.status(404).json({ error: "Store not found." });
      return;
    }
    const inventory = await listInventoryForStore(storeId, (page - 1) * limit, limit);
    response.status(200).json({ storeId, inventory, count: inventory.length, page, limit });
  } catch {
    response.status(503).json({ error: "Inventory service is unavailable." });
  }
}

export async function getVariantAvailability(request: Request, response: Response): Promise<void> {
  const variantId = readSingle(request.params.variantId);
  if (!variantId || variantId.length > 500) {
    response.status(400).json({ error: "A valid variantId is required." });
    return;
  }
  const limit = readPositiveInteger(request.query.limit, 20, INVENTORY_MAX_LIMIT);
  if (limit === null) {
    response.status(400).json({ error: "limit must be a positive bounded integer." });
    return;
  }

  try {
    const variant = await getVariantById(variantId);
    if (!variant) {
      response.status(404).json({ error: "Variant not found." });
      return;
    }
    const inventory = await listAvailabilityForVariant(variant.variantId, limit);
    response.status(200).json({ variantId: variant.variantId, inventory, count: inventory.length, limit });
  } catch {
    response.status(503).json({ error: "Inventory service is unavailable." });
  }
}

export function validateAvailabilityValue(value: unknown): boolean {
  return isAvailability(value);
}
