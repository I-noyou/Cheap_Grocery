import { getDatabase } from "./mongo.js";

export async function ensureProductVariantIndexes(): Promise<void> {
  const collection = (await getDatabase()).collection("productVariants");
  await Promise.all([
    collection.createIndex({ variantId: 1 }, { unique: true, name: "product_variants_variant_id_unique" }),
    collection.createIndex({ productId: 1 }, { name: "product_variants_product_id_index" }),
    collection.createIndex({ productId: 1, normalizedVariety: 1, normalizedBrand: 1, "package.quantity": 1, "package.unit": 1 }, {
      unique: true,
      name: "product_variants_identity_unique"
    }),
    collection.createIndex({ isActive: 1, productId: 1 }, { name: "product_variants_active_product_index" })
  ]);
}
