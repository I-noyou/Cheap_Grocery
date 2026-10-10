import type { ObjectId } from "mongodb";

export interface ProductDocument {
  _id: ObjectId;
  productId: string;
  name: string;
  slug: string;
  category: string;
  description?: string;
  aliases: string[];
  imageUrl?: string;
  isActive: boolean;
  legacyCatalogKey?: string;
  legacyCatalog?: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductListItem {
  id: string;
  productId: string;
  name: string;
  slug: string;
  category: string;
  aliases: string[];
  imageUrl?: string;
  isActive: boolean;
  legacyCatalogKey?: string;
}

export interface ProductSeedInput {
  productId: string;
  name: string;
  slug: string;
  category: string;
  description?: string;
  aliases: string[];
  imageUrl?: string;
  isActive: boolean;
  legacyCatalogKey?: string;
  legacyCatalog?: Record<string, unknown> | null;
}
