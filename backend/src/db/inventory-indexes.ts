import { getDatabase } from "./mongo.js";

export async function ensureInventoryIndexes(): Promise<void> {
  const collection = (await getDatabase()).collection("inventory");
  await Promise.all([
    collection.createIndex({ storeId: 1, variantId: 1 }, { unique: true, name: "inventory_store_variant_unique" }),
    collection.createIndex({ storeId: 1 }, { name: "inventory_store_id_index" }),
    collection.createIndex({ variantId: 1 }, { name: "inventory_variant_id_index" }),
    collection.createIndex({ availability: 1, variantId: 1 }, { name: "inventory_availability_variant_index" })
  ]);
}
