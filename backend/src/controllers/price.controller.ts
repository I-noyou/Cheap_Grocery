import type { Request, Response } from "express";

import { env } from "../config/env.js";
import {
  PRICE_MAX_LIMIT,
  COMPARISON_MAX_AGE_DAYS,
  comparePricesForVariant,
  isPriceSource,
  isValidVariantId,
  listPriceHistory,
  listPricesForStore,
  listPricesForVariant,
  upsertPrice,
  validatePriceReferences
} from "../services/price.service.js";
import { getVariantById } from "../services/product-variant.service.js";
import { getActiveStoreById } from "../services/store.service.js";

const ISO_CURRENCIES = new Set(Intl.supportedValuesOf("currency"));

function readSingle(value: unknown): string | undefined {
  const candidate = Array.isArray(value) ? value[0] : value;
  return typeof candidate === "string" && candidate.trim() ? candidate.trim() : undefined;
}

function readPositiveInteger(value: unknown, fallback: number): number | null {
  if (value === undefined) return fallback;
  const parsed = typeof value === "string" && value.trim() ? Number(value) : Number.NaN;
  return Number.isInteger(parsed) && parsed >= 1 && parsed <= PRICE_MAX_LIMIT ? parsed : null;
}

function parsePriceBody(body: unknown, storeId: string, variantId: string): Parameters<typeof upsertPrice>[0] | null {
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;
  const input = body as Record<string, unknown>;
  const amount = input.amount;
  if (typeof amount !== "number" || !Number.isFinite(amount) || amount <= 0 || amount > 1_000_000_000) return null;

  const currency = input.currency === undefined ? "INR" : input.currency;
  if (typeof currency !== "string" || !ISO_CURRENCIES.has(currency)) return null;
  const source = input.source === undefined ? "manual" : input.source;
  if (!isPriceSource(source)) return null;

  const observedAt = input.observedAt === undefined ? new Date() : new Date(typeof input.observedAt === "string" || input.observedAt instanceof Date ? input.observedAt : "");
  if (Number.isNaN(observedAt.getTime())) return null;

  return { storeId, variantId, amount, currency, source, observedAt };
}

function validStoreId(value: string | undefined): value is string {
  return Boolean(value && /^[a-f\d]{24}$/i.test(value));
}

export async function getStorePrices(request: Request, response: Response): Promise<void> {
  const storeId = readSingle(request.params.storeId);
  const limit = readPositiveInteger(request.query.limit, 20);
  const page = readPositiveInteger(request.query.page, 1);
  if (!validStoreId(storeId) || limit === null || page === null) {
    response.status(400).json({ error: "A valid storeId, page, and limit are required." });
    return;
  }
  try {
    if (!(await getActiveStoreById(storeId))) {
      response.status(404).json({ error: "Store not found." });
      return;
    }
    const prices = await listPricesForStore(storeId, (page - 1) * limit, limit);
    response.status(200).json({ storeId, prices, count: prices.length, page, limit });
  } catch {
    response.status(503).json({ error: "Price service is unavailable." });
  }
}

export async function getVariantPrices(request: Request, response: Response): Promise<void> {
  const variantId = readSingle(request.params.variantId);
  const limit = readPositiveInteger(request.query.limit, 20);
  if (!variantId || !isValidVariantId(variantId) || limit === null) {
    response.status(400).json({ error: "A valid variantId and limit are required." });
    return;
  }

  try {
    if (!(await getVariantById(variantId))) {
      response.status(404).json({ error: "Variant not found." });
      return;
    }
    const prices = await listPricesForVariant(variantId, limit);
    response.status(200).json({ variantId, prices, count: prices.length, limit });
  } catch {
    response.status(503).json({ error: "Price service is unavailable." });
  }
}

export async function getVariantPriceComparison(request: Request, response: Response): Promise<void> {
  const variantId = readSingle(request.params.variantId);
  if (!variantId || !isValidVariantId(variantId)) {
    response.status(400).json({ error: "A valid variantId is required." });
    return;
  }

  const radiusValue = readSingle(request.query.radiusKm);
  const latitudeValue = readSingle(request.query.latitude);
  const longitudeValue = readSingle(request.query.longitude);
  const maxAgeValue = readSingle(request.query.maxAgeDays);
  const page = readPositiveInteger(request.query.page, 1);
  const limit = readPositiveInteger(request.query.limit, 20);
  const radiusKm = radiusValue === undefined ? undefined : Number(radiusValue);
  const latitude = latitudeValue === undefined ? undefined : Number(latitudeValue);
  const longitude = longitudeValue === undefined ? undefined : Number(longitudeValue);
  const maxAgeDays = maxAgeValue === undefined ? 7 : Number(maxAgeValue);

  if (page === null || limit === null) {
    response.status(400).json({ error: "page and limit must be positive bounded integers." });
    return;
  }
  if (maxAgeValue !== undefined && (!Number.isInteger(maxAgeDays) || maxAgeDays < 1 || maxAgeDays > COMPARISON_MAX_AGE_DAYS)) {
    response.status(400).json({ error: `maxAgeDays must be an integer between 1 and ${COMPARISON_MAX_AGE_DAYS}.` });
    return;
  }
  const hasLatitude = latitudeValue !== undefined;
  const hasLongitude = longitudeValue !== undefined;
  if (hasLatitude !== hasLongitude) {
    response.status(400).json({ error: "latitude and longitude must be supplied together." });
    return;
  }
  if (hasLatitude && (!Number.isFinite(latitude) || latitude! < -90 || latitude! > 90
    || !Number.isFinite(longitude) || longitude! < -180 || longitude! > 180)) {
    response.status(400).json({ error: "latitude or longitude is outside its valid range." });
    return;
  }
  if (radiusValue !== undefined && (!hasLatitude || !Number.isFinite(radiusKm) || radiusKm! < 0.5 || radiusKm! > 50)) {
    response.status(400).json({ error: "radiusKm requires coordinates and must be between 0.5 and 50." });
    return;
  }

  try {
    const comparison = await comparePricesForVariant(variantId, {
      ...(radiusKm === undefined ? {} : { radiusKm }),
      ...(latitude !== undefined && radiusKm === undefined ? { radiusKm: 5 } : {}),
      ...(latitude === undefined ? {} : { latitude }),
      ...(longitude === undefined ? {} : { longitude }),
      maxAgeDays,
      page,
      limit
    });
    if (!comparison) {
      response.status(404).json({ error: "Variant not found." });
      return;
    }
    response.status(200).json(comparison);
  } catch {
    response.status(503).json({ error: "Price comparison service is unavailable." });
  }
}

export async function putPrice(request: Request, response: Response): Promise<void> {
  if (env.nodeEnv !== "development" || !env.priceWriteToken
    || request.get("x-development-price-token") !== env.priceWriteToken) {
    response.status(404).json({ error: "Not found." });
    return;
  }
  const storeId = readSingle(request.params.storeId);
  const variantId = readSingle(request.params.variantId);
  if (!validStoreId(storeId) || !variantId || !isValidVariantId(variantId)) {
    response.status(400).json({ error: "Valid storeId and variantId are required." });
    return;
  }
  const input = parsePriceBody(request.body, storeId, variantId);
  if (!input) {
    response.status(400).json({ error: "Provide a valid positive amount, ISO currency, source, and observedAt date." });
    return;
  }
  try {
    const result = await upsertPrice(input);
    response.status(200).json({ price: result.price, changed: result.changed });
  } catch (error) {
    if (error instanceof Error && error.message === "Price references are invalid.") {
      response.status(404).json({ error: "Store or variant not found." });
      return;
    }
    if (error instanceof Error && error.message === "priceUnit must match the exact product variant.") {
      response.status(400).json({ error: error.message });
      return;
    }
    response.status(503).json({ error: "Price service is unavailable." });
  }
}

export async function getVariantPriceHistory(request: Request, response: Response): Promise<void> {
  const storeId = readSingle(request.params.storeId);
  const variantId = readSingle(request.params.variantId);
  const limit = readPositiveInteger(request.query.limit, 50);
  const page = readPositiveInteger(request.query.page, 1);
  if (!validStoreId(storeId) || !variantId || !isValidVariantId(variantId) || limit === null || page === null) {
    response.status(400).json({ error: "Valid storeId, variantId, page, and limit are required." });
    return;
  }
  try {
    const [store, variant] = await Promise.all([
      getActiveStoreById(storeId),
      getVariantById(variantId)
    ]);
    if (!store || !variant) {
      response.status(404).json({ error: "Store or variant not found." });
      return;
    }
    const history = await listPriceHistory(storeId, variantId, (page - 1) * limit, limit);
    response.status(200).json({ storeId, variantId, history, count: history.length, page, limit });
  } catch {
    response.status(503).json({ error: "Price service is unavailable." });
  }
}
