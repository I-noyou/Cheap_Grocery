import { getDatabase } from "./mongo.js";

export async function ensureStoreIndexes(): Promise<void> {
  const database = await getDatabase();
  await Promise.all([
    database.collection("stores").createIndex({ location: "2dsphere" }, { name: "stores_location_2dsphere" }),
    database.collection("stores").createIndex({ isActive: 1, updatedAt: -1 }, { name: "stores_status_updated_index" })
  ]);
}
