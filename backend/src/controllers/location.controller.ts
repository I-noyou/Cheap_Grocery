import type { Request, Response } from "express";

import type { UserLocation } from "../models/user.js";
import { getUserLocation, saveUserLocation } from "../services/location.service.js";

function readBody(request: Request): Record<string, unknown> | null {
  return request.body && typeof request.body === "object" && !Array.isArray(request.body)
    ? request.body as Record<string, unknown>
    : null;
}

function validLatitude(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= -90 && value <= 90;
}

function validLongitude(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= -180 && value <= 180;
}

function validAccuracy(value: unknown): value is number | undefined {
  return value === undefined || (typeof value === "number" && Number.isFinite(value) && value >= 0);
}

function serializeLocation(location: UserLocation): UserLocation {
  return location;
}

export async function putLocation(request: Request, response: Response): Promise<void> {
  const body = readBody(request);
  if (!body || !validLatitude(body.latitude) || !validLongitude(body.longitude) || !validAccuracy(body.accuracy)) {
    response.status(400).json({ error: "Provide valid latitude, longitude, and optional non-negative accuracy." });
    return;
  }

  const location: UserLocation = {
    latitude: body.latitude,
    longitude: body.longitude,
    ...(body.accuracy === undefined ? {} : { accuracy: body.accuracy }),
    updatedAt: new Date()
  };

  try {
    const savedLocation = await saveUserLocation(request.authenticatedUser!.id, location);
    if (!savedLocation) {
      response.status(401).json({ error: "Authentication required." });
      return;
    }

    response.status(200).json({ location: serializeLocation(savedLocation) });
  } catch {
    response.status(503).json({ error: "Location service is unavailable." });
  }
}

export async function getLocation(request: Request, response: Response): Promise<void> {
  try {
    const location = await getUserLocation(request.authenticatedUser!.id);
    if (!location) {
      response.status(404).json({ error: "No saved location was found." });
      return;
    }

    response.status(200).json({ location: serializeLocation(location) });
  } catch {
    response.status(503).json({ error: "Location service is unavailable." });
  }
}
