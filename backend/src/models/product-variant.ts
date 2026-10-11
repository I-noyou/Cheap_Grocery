import type { ObjectId } from "mongodb";

export type PackageUnit = "g" | "kg" | "ml" | "l" | "count";

export interface ProductVariantPackage {
  quantity: number;
  unit: PackageUnit;
  displayName: string;
}

export interface ProductVariantDocument {
  _id: ObjectId;
  variantId: string;
  productId: string;
  variety: string;
  normalizedVariety: string;
  brand: string;
  normalizedBrand: string;
  package: ProductVariantPackage;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductVariantListItem extends Omit<ProductVariantDocument, "_id" | "createdAt" | "updatedAt"> {}

export interface ProductVariantSeedInput {
  variantId: string;
  productId: string;
  variety: string;
  normalizedVariety: string;
  brand: string;
  normalizedBrand: string;
  package: ProductVariantPackage;
  isActive: boolean;
}
