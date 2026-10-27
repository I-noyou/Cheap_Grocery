import type { Request, Response } from "express";

import { AVAILABILITY_VALUES, type Availability, type InventorySource } from "../models/inventory.js";
import {
  INVENTORY_MAX_LIMIT,
  getInventory,
  isAvailability,
  isInventorySource,
  isObjectId,
  listInventoryForAdmin,
  normalizeStockUnit,
  upsertInventory
} from "../services/inventory.service.js";

const WRITABLE_FIELDS = new Set(["availability", "stockQuantity", "stockUnit", "lastVerifiedAt", "source"]);

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function single(value: unknown): string | undefined {
  const candidate = Array.isArray(value) ? value[0] : value;
  return typeof candidate === "string" && candidate.trim() ? candidate.trim() : undefined;
}

function page(value: unknown, fallback: number): number | null {
  if (value === undefined) return fallback;
  const parsed = typeof value === "string" ? Number(value) : Number.NaN;
  return Number.isInteger(parsed) && parsed >= 1 && parsed <= INVENTORY_MAX_LIMIT ? parsed : null;
}

function noUnknownFields(body: Record<string, unknown>): boolean {
  return Object.keys(body).every((key) => WRITABLE_FIELDS.has(key) && !key.startsWith("$"));
}

export function parseInventoryInput(body: unknown, partial: boolean, existing?: Awaited<ReturnType<typeof getInventory>>): Parameters<typeof upsertInventory>[0] | null {
  if (!record(body) || !noUnknownFields(body) || (!partial && body.availability === undefined) || (partial && Object.keys(body).length === 0)) return null;
  const availability = body.availability === undefined ? existing?.availability : body.availability;
  const stockQuantity = body.stockQuantity === undefined ? existing?.stockQuantity : body.stockQuantity;
  const stockUnit = body.stockUnit === undefined ? existing?.stockUnit : body.stockUnit;
  const lastVerifiedAt = body.lastVerifiedAt === undefined ? existing?.lastVerifiedAt : body.lastVerifiedAt;
  const source = body.source === undefined ? existing?.source : body.source;
  if (!isAvailability(availability) || !isInventorySource(source)) return null;
  if (stockQuantity !== null && (typeof stockQuantity !== "number" || !Number.isFinite(stockQuantity) || stockQuantity < 0 || stockQuantity > 1_000_000_000)) return null;
  if (stockUnit !== null && (typeof stockUnit !== "string" || normalizeStockUnit(stockUnit) === null)) return null;
  if ((stockQuantity === null) !== (stockUnit === null)) return null;
  const verified = lastVerifiedAt === null ? null : new Date(typeof lastVerifiedAt === "string" || lastVerifiedAt instanceof Date ? lastVerifiedAt : "");
  if (verified !== null && Number.isNaN(verified.getTime())) return null;
  return { storeId: "", variantId: "", availability, stockQuantity, stockUnit: stockUnit === null ? null : normalizeStockUnit(stockUnit), lastVerifiedAt: verified, source };
}

export async function getAdminInventory(request: Request, response: Response): Promise<void> {
  const storeId = single(request.query.storeId);
  const variantId = single(request.query.variantId);
  const availability = single(request.query.availability);
  const limit = page(request.query.limit, 20);
  const currentPage = page(request.query.page, 1);
  if ((storeId !== undefined && !isObjectId(storeId)) || (variantId !== undefined && (variantId.length > 500 || /[\\/\u0000-\u001f]/.test(variantId)))
    || (availability !== undefined && !isAvailability(availability)) || limit === null || currentPage === null) {
    response.status(400).json({ error: "Provide valid storeId, variantId, availability, page, and limit filters." });
    return;
  }
  try {
    const inventory = await listInventoryForAdmin({ ...(storeId ? { storeId } : {}), ...(variantId ? { variantId } : {}), ...(availability ? { availability } : {}) }, (currentPage - 1) * limit, limit);
    response.status(200).json({ inventory, count: inventory.length, page: currentPage, limit, availabilityValues: AVAILABILITY_VALUES });
  } catch {
    response.status(503).json({ error: "Inventory service is unavailable." });
  }
}

async function writeAdminInventory(request: Request, response: Response, partial: boolean): Promise<void> {
  const storeId = single(request.params.storeId);
  const variantId = single(request.params.variantId);
  if (!storeId || !isObjectId(storeId) || !variantId || variantId.length > 500 || /[\\/\u0000-\u001f]/.test(variantId)) {
    response.status(400).json({ error: "Valid storeId and variantId are required." });
    return;
  }
  try {
    const existing = partial ? await getInventory(storeId, variantId) : undefined;
    if (partial && !existing) {
      response.status(404).json({ error: "Inventory record not found; use PUT to create it." });
      return;
    }
    const input = parseInventoryInput(request.body, partial, existing);
    if (!input) {
      response.status(400).json({ error: "Provide only valid availability, stockQuantity, stockUnit, lastVerifiedAt, and source values." });
      return;
    }
    input.storeId = storeId;
    input.variantId = variantId;
    const outcome = await upsertInventory(input);
    const inventory = await getInventory(storeId, variantId);
    response.status(200).json({ inventory, outcome });
  } catch (error) {
    if (error instanceof Error && error.message === "Inventory references are invalid.") {
      response.status(404).json({ error: "Store or variant not found." });
      return;
    }
    response.status(503).json({ error: "Inventory service is unavailable." });
  }
}

export async function putAdminInventory(request: Request, response: Response): Promise<void> {
  await writeAdminInventory(request, response, false);
}

export async function patchAdminInventory(request: Request, response: Response): Promise<void> {
  await writeAdminInventory(request, response, true);
}
