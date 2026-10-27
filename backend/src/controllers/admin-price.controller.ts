import type { Request, Response } from "express";

import { getVariantById } from "../services/product-variant.service.js";
import { getActiveStoreById } from "../services/store.service.js";
import { PRICE_MAX_LIMIT, isPriceSource, isValidVariantId, listPriceHistory, listPricesForAdmin, upsertPrice } from "../services/price.service.js";

const WRITABLE_FIELDS = new Set(["amount", "currency", "source", "observedAt"]);
const ISO_CURRENCIES = new Set(Intl.supportedValuesOf("currency"));

function record(value: unknown): value is Record<string, unknown> { return typeof value === "object" && value !== null && !Array.isArray(value); }
function single(value: unknown): string | undefined { const candidate = Array.isArray(value) ? value[0] : value; return typeof candidate === "string" && candidate.trim() ? candidate.trim() : undefined; }
function validStoreId(value: string | undefined): value is string { return Boolean(value && /^[a-f\d]{24}$/i.test(value)); }
function page(value: unknown, fallback: number): number | null { const parsed = value === undefined ? fallback : typeof value === "string" ? Number(value) : Number.NaN; return Number.isInteger(parsed) && parsed >= 1 && parsed <= PRICE_MAX_LIMIT ? parsed : null; }

export function parseAdminPriceInput(body: unknown, storeId: string, variantId: string): Parameters<typeof upsertPrice>[0] | null {
  if (!record(body) || !Object.keys(body).every((key) => WRITABLE_FIELDS.has(key) && !key.startsWith("$")) || body.amount === undefined) return null;
  const amount = body.amount;
  const currency = body.currency === undefined ? "INR" : body.currency;
  const source = body.source === undefined ? "manual" : body.source;
  const observedAt = body.observedAt === undefined ? new Date() : new Date(typeof body.observedAt === "string" || body.observedAt instanceof Date ? body.observedAt : "");
  if (typeof amount !== "number" || !Number.isFinite(amount) || amount <= 0 || amount > 1_000_000_000 || typeof currency !== "string" || !ISO_CURRENCIES.has(currency) || !isPriceSource(source) || Number.isNaN(observedAt.getTime())) return null;
  return { storeId, variantId, amount, currency, source, observedAt };
}

export async function getAdminPrices(request: Request, response: Response): Promise<void> {
  const storeId = single(request.query.storeId);
  const variantId = single(request.query.variantId);
  const limit = page(request.query.limit, 20);
  const currentPage = page(request.query.page, 1);
  if ((storeId !== undefined && !validStoreId(storeId)) || (variantId !== undefined && !isValidVariantId(variantId)) || limit === null || currentPage === null) {
    response.status(400).json({ error: "Provide valid storeId, variantId, page, and limit filters." });
    return;
  }
  try {
    const prices = await listPricesForAdmin({ ...(storeId ? { storeId } : {}), ...(variantId ? { variantId } : {}) }, (currentPage - 1) * limit, limit);
    response.status(200).json({ prices, count: prices.length, page: currentPage, limit });
  } catch { response.status(503).json({ error: "Price service is unavailable." }); }
}

export async function putAdminPrice(request: Request, response: Response): Promise<void> {
  const storeId = single(request.params.storeId);
  const variantId = single(request.params.variantId);
  if (!validStoreId(storeId) || !variantId || !isValidVariantId(variantId)) { response.status(400).json({ error: "Valid storeId and variantId are required." }); return; }
  const input = parseAdminPriceInput(request.body, storeId, variantId);
  if (!input) { response.status(400).json({ error: "Provide only a finite positive amount, ISO currency, source, and observedAt date." }); return; }
  try {
    const result = await upsertPrice(input);
    response.status(200).json(result);
  } catch (error) {
    if (error instanceof Error && error.message === "Price references are invalid.") { response.status(404).json({ error: "Store or variant not found." }); return; }
    response.status(503).json({ error: "Price service is unavailable." });
  }
}

export async function getAdminPriceHistory(request: Request, response: Response): Promise<void> {
  const storeId = single(request.params.storeId);
  const variantId = single(request.params.variantId);
  const limit = page(request.query.limit, 50);
  const currentPage = page(request.query.page, 1);
  if (!validStoreId(storeId) || !variantId || !isValidVariantId(variantId) || limit === null || currentPage === null) { response.status(400).json({ error: "Valid storeId, variantId, page, and limit are required." }); return; }
  try {
    const [store, variant] = await Promise.all([getActiveStoreById(storeId), getVariantById(variantId)]);
    if (!store || !variant) { response.status(404).json({ error: "Store or variant not found." }); return; }
    const history = await listPriceHistory(storeId, variantId, (currentPage - 1) * limit, limit);
    response.status(200).json({ storeId, variantId, history, count: history.length, page: currentPage, limit });
  } catch { response.status(503).json({ error: "Price service is unavailable." }); }
}
