import { ObjectId } from "mongodb";

import { getDatabase } from "../db/mongo.js";
import type { StoreAddress, StoreDocument } from "../models/store.js";

export interface StoreInput {
  name: string;
  address: StoreAddress;
  latitude: number;
  longitude: number;
  phone?: string;
  website?: string;
}

export interface PublicStore {
  id: string;
  name: string;
  address: StoreAddress;
  location: {
    latitude: number;
    longitude: number;
  };
  distanceKm?: number;
}

export interface AdminStore extends PublicStore {
  phone?: string;
  website?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface StoreUpdate {
  name?: string;
  address?: StoreAddress;
  latitude?: number;
  longitude?: number;
  phone?: string;
  website?: string;
}

function serializeAdminStore(store: StoreDocument): AdminStore {
  const serialized = serializePublicStore(store);
  return {
    ...serialized,
    ...(store.phone === undefined ? {} : { phone: store.phone }),
    ...(store.website === undefined ? {} : { website: store.website }),
    isActive: store.isActive,
    createdAt: store.createdAt,
    updatedAt: store.updatedAt
  };
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function serializePublicStore(store: StoreDocument, distanceKm?: number): PublicStore {
  const [longitude, latitude] = store.location.coordinates;
  return {
    id: store._id.toHexString(),
    name: store.name,
    address: store.address,
    location: { latitude, longitude },
    ...(distanceKm === undefined ? {} : { distanceKm })
  };
}

export async function getActiveStoreById(storeId: string): Promise<PublicStore | null> {
  const database = await getDatabase();
  const store = await database.collection<StoreDocument>("stores").findOne(
    { _id: new ObjectId(storeId), isActive: true },
    { projection: { name: 1, address: 1, location: 1 } }
  );
  return store ? serializePublicStore(store) : null;
}

export async function createStore(input: StoreInput): Promise<PublicStore> {
  const database = await getDatabase();
  const now = new Date();
  const store: StoreDocument = {
    _id: new ObjectId(),
    name: input.name,
    address: input.address,
    location: { type: "Point", coordinates: [input.longitude, input.latitude] },
    ...(input.phone === undefined ? {} : { phone: input.phone }),
    ...(input.website === undefined ? {} : { website: input.website }),
    isActive: true,
    createdAt: now,
    updatedAt: now
  };

  await database.collection<StoreDocument>("stores").insertOne(store);
  return serializePublicStore(store);
}

export async function listStoresForAdmin(
  skip: number,
  limit: number,
  search?: string,
  status: "active" | "inactive" | "all" = "all"
): Promise<{ stores: AdminStore[]; total: number }> {
  const database = await getDatabase();
  const filter: Record<string, unknown> = {};
  if (status !== "all") filter.isActive = status === "active";
  if (search) filter.name = { $regex: escapeRegex(search), $options: "i" };

  const collection = database.collection<StoreDocument>("stores");
  const [stores, total] = await Promise.all([
    collection.find(filter, {
      projection: { name: 1, address: 1, location: 1, phone: 1, website: 1, isActive: 1, createdAt: 1, updatedAt: 1 }
    }).sort({ name: 1, _id: 1 }).skip(skip).limit(limit).toArray(),
    collection.countDocuments(filter)
  ]);

  return { stores: stores.map(serializeAdminStore), total };
}

export async function updateStore(storeId: string, update: StoreUpdate): Promise<AdminStore | null> {
  const database = await getDatabase();
  const $set: Record<string, unknown> = { updatedAt: new Date() };
  if (update.name !== undefined) $set.name = update.name;
  if (update.address !== undefined) $set.address = update.address;
  if (update.latitude !== undefined || update.longitude !== undefined) {
    const existing = await database.collection<StoreDocument>("stores").findOne(
      { _id: new ObjectId(storeId) },
      { projection: { location: 1 } }
    );
    if (!existing) return null;
    const [currentLongitude, currentLatitude] = existing.location.coordinates;
    $set.location = {
      type: "Point",
      coordinates: [
        update.longitude === undefined ? currentLongitude : update.longitude,
        update.latitude === undefined ? currentLatitude : update.latitude
      ]
    };
  }
  if (update.phone !== undefined) $set.phone = update.phone;
  if (update.website !== undefined) $set.website = update.website;

  const result = await database.collection<StoreDocument>("stores").updateOne(
    { _id: new ObjectId(storeId) },
    { $set }
  );
  if (!result.matchedCount) return null;
  const store = await database.collection<StoreDocument>("stores").findOne({ _id: new ObjectId(storeId) });
  return store ? serializeAdminStore(store) : null;
}

export async function updateStoreStatus(storeId: string, isActive: boolean): Promise<AdminStore | null> {
  const database = await getDatabase();
  const result = await database.collection<StoreDocument>("stores").updateOne(
    { _id: new ObjectId(storeId) },
    { $set: { isActive, updatedAt: new Date() } }
  );
  if (!result.matchedCount) return null;
  const store = await database.collection<StoreDocument>("stores").findOne({ _id: new ObjectId(storeId) });
  return store ? serializeAdminStore(store) : null;
}

export async function listActiveStores(): Promise<PublicStore[]> {
  const database = await getDatabase();
  const stores = await database.collection<StoreDocument>("stores")
    .find({ isActive: true }, { projection: { name: 1, address: 1, location: 1 } })
    .sort({ name: 1 })
    .toArray();
  return stores.map((store) => serializePublicStore(store));
}

export async function findNearbyStores(
  latitude: number,
  longitude: number,
  radiusKm: number,
  limit: number
): Promise<PublicStore[]> {
  const database = await getDatabase();
  const stores = await database.collection<StoreDocument>("stores").aggregate<StoreDocument & { distanceMeters: number }>([
    {
      $geoNear: {
        near: { type: "Point", coordinates: [longitude, latitude] },
        key: "location",
        spherical: true,
        maxDistance: radiusKm * 1000,
        query: { isActive: true },
        distanceField: "distanceMeters"
      }
    },
    { $limit: limit },
    { $project: { name: 1, address: 1, location: 1, distanceMeters: 1 } }
  ]).toArray();

  return stores.map((store) => serializePublicStore(store, Number((store.distanceMeters / 1000).toFixed(2))));
}
