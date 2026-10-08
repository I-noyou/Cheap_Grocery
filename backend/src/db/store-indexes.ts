import { getDatabase } from "./mongo.js";

export async function ensureStoreIndexes(): Promise<void> {
  const database = await getDatabase();
  await database.collection("stores").createIndex({ location: "2dsphere" }, { name: "stores_location_2dsphere" });
}
