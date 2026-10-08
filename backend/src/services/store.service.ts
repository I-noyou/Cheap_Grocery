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

function serializeStore(store: StoreDocument, distanceKm?: number): PublicStore {
  const [longitude, latitude] = store.location.coordinates;
  return {
    id: store._id.toHexString(),
    name: store.name,
    address: store.address,
    location: { latitude, longitude },
    ...(distanceKm === undefined ? {} : { distanceKm })
  };
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
  return serializeStore(store);
}

export async function listActiveStores(): Promise<PublicStore[]> {
  const database = await getDatabase();
  const stores = await database.collection<StoreDocument>("stores")
    .find({ isActive: true }, { projection: { name: 1, address: 1, location: 1 } })
    .sort({ name: 1 })
    .toArray();
  return stores.map((store) => serializeStore(store));
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

  return stores.map((store) => serializeStore(store, Number((store.distanceMeters / 1000).toFixed(2))));
}
