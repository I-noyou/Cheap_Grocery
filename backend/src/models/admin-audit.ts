import type { ObjectId } from "mongodb";

export const AUDIT_ACTIONS = ["create", "update", "activate", "deactivate", "price_change"] as const;
export const AUDIT_ENTITY_TYPES = ["store", "product", "variant", "inventory", "price"] as const;
export type AuditAction = typeof AUDIT_ACTIONS[number];
export type AuditEntityType = typeof AUDIT_ENTITY_TYPES[number];

export interface AdminAuditDocument {
  _id: ObjectId;
  administratorId: string;
  action: AuditAction;
  entityType: AuditEntityType;
  entityId: string;
  storeId?: string;
  productId?: string;
  variantId?: string;
  changes?: { before?: Record<string, unknown>; after?: Record<string, unknown> };
  createdAt: Date;
}
