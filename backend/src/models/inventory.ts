import type { ObjectId } from "mongodb";

export const AVAILABILITY_VALUES = ["available", "unavailable", "unknown"] as const;
export type Availability = typeof AVAILABILITY_VALUES[number];

export const INVENTORY_SOURCE_VALUES = ["manual", "store_reported", "imported"] as const;
export type InventorySource = typeof INVENTORY_SOURCE_VALUES[number];

export interface InventoryDocument {
  _id: ObjectId;
  storeId: string;
  variantId: string;
  availability: Availability;
  stockQuantity: number | null;
  stockUnit: string | null;
  lastVerifiedAt: Date | null;
  source: InventorySource;
  createdAt: Date;
  updatedAt: Date;
}
