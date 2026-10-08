import type { Request, Response } from "express";

import { env } from "../config/env.js";
import { getUserLocation } from "../services/location.service.js";
import { createStore, findNearbyStores, listActiveStores, type StoreInput } from "../services/store.service.js";

const DEFAULT_RADIUS_KM = 5;
const MIN_RADIUS_KM = 0.5;
const MAX_RADIUS_KM = 50;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;
const ADDRESS_FIELDS = ["line1", "line2", "city", "state", "postalCode", "country"] as const;

function isCoordinate(value: unknown, min: number, max: number): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= min && value <= max;
}

function readStoreInput(body: unknown): StoreInput | null {
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;
  const input = body as Record<string, unknown>;
  if (typeof input.name !== "string" || !input.name.trim() || input.name.trim().length > 200
    || !isCoordinate(input.latitude, -90, 90) || !isCoordinate(input.longitude, -180, 180)) return null;

  const address: Record<string, string> = {};
  if (input.address !== undefined) {
    if (!input.address || typeof input.address !== "object" || Array.isArray(input.address)) return null;
    for (const field of ADDRESS_FIELDS) {
      const value = (input.address as Record<string, unknown>)[field];
      if (value !== undefined) {
        if (typeof value !== "string" || value.length > 200) return null;
        address[field] = value.trim();
      }
    }
  }

  const optionalText = (value: unknown): string | undefined | null => {
    if (value === undefined) return undefined;
    return typeof value === "string" && value.length <= 300 ? value.trim() : null;
  };
  const phone = optionalText(input.phone);
  const website = optionalText(input.website);
  if (phone === null || website === null) return null;

  return {
    name: input.name.trim(),
    address,
    latitude: input.latitude,
    longitude: input.longitude,
    ...(phone === undefined ? {} : { phone }),
    ...(website === undefined ? {} : { website })
  };
}

function readBoundedNumber(value: unknown, fallback: number, min: number, max: number): number | null {
  if (value === undefined) return fallback;
  const parsed = typeof value === "string" && value.trim() ? Number(value) : NaN;
  return Number.isFinite(parsed) && parsed >= min && parsed <= max ? parsed : null;
}

function readBoundedInteger(value: unknown, fallback: number, max: number): number | null {
  if (value === undefined) return fallback;
  const parsed = typeof value === "string" && value.trim() ? Number(value) : NaN;
  return Number.isInteger(parsed) && parsed >= 1 && parsed <= max ? parsed : null;
}

export async function postStore(request: Request, response: Response): Promise<void> {
  if (env.nodeEnv !== "development" || !env.storeWriteToken
    || request.get("x-development-store-token") !== env.storeWriteToken) {
    response.status(404).json({ error: "Not found." });
    return;
  }

  const input = readStoreInput(request.body);
  if (!input) {
    response.status(400).json({ error: "Provide a valid name, address, latitude, longitude, phone, and website." });
    return;
  }

  try {
    response.status(201).json({ store: await createStore(input) });
  } catch {
    response.status(503).json({ error: "Store service is unavailable." });
  }
}

export async function getStores(_request: Request, response: Response): Promise<void> {
  try {
    const stores = await listActiveStores();
    response.status(200).json({ stores, count: stores.length });
  } catch {
    response.status(503).json({ error: "Store service is unavailable." });
  }
}

export async function getNearbyStores(request: Request, response: Response): Promise<void> {
  const radiusKm = readBoundedNumber(request.query.radiusKm, DEFAULT_RADIUS_KM, MIN_RADIUS_KM, MAX_RADIUS_KM);
  const limit = readBoundedInteger(request.query.limit, DEFAULT_LIMIT, MAX_LIMIT);
  if (radiusKm === null) {
    response.status(400).json({ error: `radiusKm must be a number between ${MIN_RADIUS_KM} and ${MAX_RADIUS_KM}.` });
    return;
  }
  if (limit === null) {
    response.status(400).json({ error: `limit must be an integer between 1 and ${MAX_LIMIT}.` });
    return;
  }

  try {
    const location = await getUserLocation(request.authenticatedUser!.id);
    if (!location) {
      response.status(400).json({
        error: "LOCATION_REQUIRED",
        message: "Please allow location access before searching for nearby stores."
      });
      return;
    }

    const stores = await findNearbyStores(location.latitude, location.longitude, radiusKm, limit);
    response.status(200).json({ stores, count: stores.length });
  } catch {
    response.status(503).json({ error: "Store service is unavailable." });
  }
}
