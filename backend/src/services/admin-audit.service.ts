import { ObjectId, type Db } from "mongodb";
import { getDatabase } from "../db/mongo.js";
import { AUDIT_ACTIONS, AUDIT_ENTITY_TYPES, type AdminAuditDocument, type AuditAction, type AuditEntityType } from "../models/admin-audit.js";

export { AUDIT_ACTIONS, AUDIT_ENTITY_TYPES };
export interface AuditInput { administratorId: string; action: AuditAction; entityType: AuditEntityType; entityId: string; storeId?: string; productId?: string; variantId?: string; changes?: { before?: Record<string, unknown>; after?: Record<string, unknown> }; }
export interface AuditFilters { action?: AuditAction; entityType?: AuditEntityType; administratorId?: string; entityId?: string; from?: Date; to?: Date; }

function cleanSummary(value: Record<string, unknown> | undefined): Record<string, unknown> | undefined {
  if (!value) return undefined;
  const allowed = Object.entries(value).filter(([key, item]) => /^[a-zA-Z][a-zA-Z0-9]{0,39}$/.test(key)
    && (item === null || typeof item === "string" || typeof item === "number" || typeof item === "boolean"
      || (Array.isArray(item) && item.length <= 25 && item.every((entry) => entry === null || typeof entry === "string" || typeof entry === "number" || typeof entry === "boolean")))).slice(0, 20);
  return allowed.length ? Object.fromEntries(allowed) : undefined;
}

export function createAdminAuditDocument(input: AuditInput): AdminAuditDocument {
  const before = cleanSummary(input.changes?.before); const after = cleanSummary(input.changes?.after);
  return { _id: new ObjectId(), administratorId: input.administratorId, action: input.action, entityType: input.entityType, entityId: input.entityId, ...(input.storeId ? { storeId: input.storeId } : {}), ...(input.productId ? { productId: input.productId } : {}), ...(input.variantId ? { variantId: input.variantId } : {}), ...((before || after) ? { changes: { ...(before ? { before } : {}), ...(after ? { after } : {}) } } : {}), createdAt: new Date() };
}
export async function recordAdminAuditWith(input: AuditInput, database: Pick<Db, "collection">): Promise<void> {
  await database.collection<AdminAuditDocument>("adminAudit").insertOne(createAdminAuditDocument(input));
}
export async function recordAdminAudit(input: AuditInput): Promise<void> {
  await recordAdminAuditWith(input, await getDatabase());
}

export async function listAdminAudit(filters: AuditFilters, skip: number, limit: number): Promise<{ records: Array<Omit<AdminAuditDocument, "_id"> & { id: string }>; total: number }> {
  const query: Record<string, unknown> = {};
  if (filters.action) query.action = filters.action; if (filters.entityType) query.entityType = filters.entityType;
  if (filters.administratorId) query.administratorId = filters.administratorId; if (filters.entityId) query.entityId = filters.entityId;
  if (filters.from || filters.to) query.createdAt = { ...(filters.from ? { $gte: filters.from } : {}), ...(filters.to ? { $lte: filters.to } : {}) };
  const collection = (await getDatabase()).collection<AdminAuditDocument>("adminAudit");
  const [records, total] = await Promise.all([collection.find(query).sort({ createdAt: -1, _id: -1 }).skip(skip).limit(limit).toArray(), collection.countDocuments(query)]);
  return { records: records.map(({ _id, ...record }) => ({ id: _id.toHexString(), ...record })), total };
}
