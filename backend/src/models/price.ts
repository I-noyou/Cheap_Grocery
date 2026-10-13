import type { ObjectId } from "mongodb";

import type { ProductVariantPackage } from "./product-variant.js";

export const PRICE_SOURCE_VALUES = ["manual", "store_reported", "imported"] as const;
export type PriceSource = typeof PRICE_SOURCE_VALUES[number];

export interface PriceDocument {
  _id: ObjectId;
  storeId: string;
  variantId: string;
  amount: number;
  currency: string;
  priceUnit: ProductVariantPackage;
  source: PriceSource;
  observedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface PriceHistoryDocument {
  _id: ObjectId;
  storeId: string;
  variantId: string;
  amount: number;
  currency: string;
  source: PriceSource;
  observedAt: Date;
  recordedAt: Date;
}
