import { getDatabase } from "./mongo.js";

export async function ensureProductIndexes(): Promise<void> {
  const database = await getDatabase();

  await Promise.all([
    database.collection("products").createIndex({ productId: 1 }, { unique: true, name: "products_product_id_unique" }),
    database.collection("products").createIndex({ slug: 1 }, { unique: true, name: "products_slug_unique" }),
    database.collection("products").createIndex({ isActive: 1, name: 1 }, { name: "products_active_name_index" }),
    database.collection("products").createIndex({ aliases: 1 }, { name: "products_aliases_index" }),
    database.collection("products").createIndex({ category: 1 }, { name: "products_category_index" })
  ]);
}
