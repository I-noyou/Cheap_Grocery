import type { MongoServerError } from "mongodb";
import type { Request, Response } from "express";

import { getProductForAdmin } from "../services/product.service.js";
import {
  createAdminProductVariant,
  getVariantForAdmin,
  listProductVariantsForAdmin,
  normalizePackage,
  normalizeVariantSeed,
  updateAdminVariant,
  updateAdminVariantStatus
} from "../services/product-variant.service.js";
import { validProductId } from "./admin-product.controller.js";

const VARIANT_ID_PATTERN = /^variant-[A-Za-z0-9%._~:-]{1,490}$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function text(value: unknown, min: number, max: number): string | null {
  return typeof value === "string" && value.trim().length >= min && value.trim().length <= max ? value.trim() : null;
}

function validVariantId(value: unknown): value is string {
  return typeof value === "string" && VARIANT_ID_PATTERN.test(value);
}

function isDuplicateKey(error: unknown): boolean {
  return typeof error === "object" && error !== null && (error as MongoServerError).code === 11000;
}

function packageText(value: unknown): string | null {
  if (typeof value === "string") return normalizePackage(value)?.displayName ?? null;
  if (!isRecord(value) || typeof value.displayName !== "string") return null;
  return normalizePackage(value.displayName)?.displayName ?? null;
}

export async function getAdminProductVariants(request: Request, response: Response): Promise<void> {
  if (!validProductId(request.params.productId)) {
    response.status(400).json({ error: "A valid canonical productId is required." });
    return;
  }
  try {
    if (!(await getProductForAdmin(request.params.productId))) {
      response.status(404).json({ error: "Product not found." });
      return;
    }
    const variants = await listProductVariantsForAdmin(request.params.productId);
    response.status(200).json({ variants, count: variants.length });
  } catch {
    response.status(503).json({ error: "Product variant service is unavailable." });
  }
}

export async function createAdminVariant(request: Request, response: Response): Promise<void> {
  if (!validProductId(request.params.productId)) {
    response.status(400).json({ error: "A valid canonical productId is required." });
    return;
  }
  try {
    if (!(await getProductForAdmin(request.params.productId))) {
      response.status(404).json({ error: "Product not found." });
      return;
    }
    const body = request.body;
    const variantId = isRecord(body) && validVariantId(body.variantId) ? body.variantId : null;
    const variety = isRecord(body) ? text(body.variety, 0, 100) : null;
    const brand = isRecord(body) ? text(body.brand, 0, 100) : null;
    const packageValue = isRecord(body) ? packageText(body.package) : null;
    if (!variantId || variety === null || brand === null || !packageValue) {
      response.status(400).json({ error: "Provide an explicit variantId, variety, brand, and valid package size." });
      return;
    }
    const seed = normalizeVariantSeed(request.params.productId, variety, brand, packageValue);
    if (!seed || seed.variantId !== variantId) {
      response.status(400).json({ error: "variantId must match the canonical product, brand, variety, and package identity." });
      return;
    }
    response.status(201).json({ variant: await createAdminProductVariant(seed) });
  } catch (error) {
    response.status(isDuplicateKey(error) ? 409 : 503).json({ error: isDuplicateKey(error) ? "Variant ID or identity already exists." : "Product variant service is unavailable." });
  }
}

export async function patchAdminVariant(request: Request, response: Response): Promise<void> {
  if (!validVariantId(request.params.variantId) || !isRecord(request.body)
    || typeof request.body.displayName !== "string" || !normalizePackage(request.body.displayName)) {
    response.status(400).json({ error: "Only a valid package displayName may be edited; variant identity is immutable." });
    return;
  }
  try {
    const normalized = normalizePackage(request.body.displayName);
    const existing = await getVariantForAdmin(request.params.variantId);
    if (!existing) {
      response.status(404).json({ error: "Variant not found." });
      return;
    }
    if (normalized!.quantity !== existing.package.quantity || normalized!.unit !== existing.package.unit) {
      response.status(409).json({ error: "Changing package quantity or unit requires a new canonical variant." });
      return;
    }
    const variant = await updateAdminVariant(request.params.variantId, { displayName: normalized!.displayName });
    if (!variant) {
      response.status(404).json({ error: "Variant not found." });
      return;
    }
    response.status(200).json({ variant });
  } catch {
    response.status(503).json({ error: "Product variant service is unavailable." });
  }
}

export async function patchAdminVariantStatus(request: Request, response: Response): Promise<void> {
  if (!validVariantId(request.params.variantId) || !isRecord(request.body) || typeof request.body.isActive !== "boolean") {
    response.status(400).json({ error: "A valid variantId and boolean isActive are required." });
    return;
  }
  try {
    const variant = await updateAdminVariantStatus(request.params.variantId, request.body.isActive);
    if (!variant) {
      response.status(404).json({ error: "Variant not found." });
      return;
    }
    response.status(200).json({ variant });
  } catch {
    response.status(503).json({ error: "Product variant service is unavailable." });
  }
}
