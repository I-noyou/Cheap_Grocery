import { getDatabase } from "./mongo.js";

export async function ensureAdminAuditIndexes(): Promise<void> {
  const collection = (await getDatabase()).collection("adminAudit");
  await Promise.all([
    collection.createIndex({ createdAt: -1, _id: -1 }, { name: "admin_audit_created_index" }),
    collection.createIndex({ administratorId: 1, createdAt: -1 }, { name: "admin_audit_administrator_created_index" }),
    collection.createIndex({ entityType: 1, entityId: 1, createdAt: -1 }, { name: "admin_audit_entity_created_index" }),
    collection.createIndex({ action: 1, createdAt: -1 }, { name: "admin_audit_action_created_index" })
  ]);
}
