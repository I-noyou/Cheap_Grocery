import { getDatabase } from "./mongo.js";

export async function ensurePriceIndexes(): Promise<void> {
  const database = await getDatabase();
  await Promise.all([
    database.collection("prices").createIndex(
      { storeId: 1, variantId: 1 },
      { unique: true, name: "prices_store_variant_unique" }
    ),
    database.collection("prices").createIndex(
      { variantId: 1, storeId: 1 },
      { name: "prices_variant_store_index" }
    ),
    database.collection("priceHistory").createIndex(
      { storeId: 1, variantId: 1, observedAt: 1, recordedAt: 1 },
      { name: "price_history_store_variant_observed_index" }
    )
  ]);
}
