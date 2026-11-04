import type { Request, Response } from "express";
import { AUDIT_ACTIONS, AUDIT_ENTITY_TYPES, listAdminAudit, type AuditFilters } from "../services/admin-audit.service.js";

const ID = /^[A-Za-z0-9._~:-]{1,500}$/;
function single(value: unknown): string | undefined { const item = Array.isArray(value) ? value[0] : value; return typeof item === "string" && item.trim() ? item.trim() : undefined; }
function positive(value: unknown, fallback: number, maximum: number): number | null { if (value === undefined) return fallback; const n = typeof value === "string" ? Number(value) : NaN; return Number.isInteger(n) && n >= 1 && n <= maximum ? n : null; }
function date(value: string | undefined): Date | null | undefined { if (!value) return undefined; if (!/^\d{4}-\d{2}-\d{2}(?:T.*Z)?$/.test(value)) return null; const parsed = new Date(value); return Number.isNaN(parsed.getTime()) ? null : parsed; }

export async function respondWithAdminAudit(request: Request, response: Response, load = listAdminAudit): Promise<void> {
  const page = positive(request.query.page, 1, 1_000_000); const limit = positive(request.query.limit, 25, 100);
  const action = single(request.query.action); const entityType = single(request.query.entityType); const administratorId = single(request.query.administratorId); const entityId = single(request.query.entityId); const from = date(single(request.query.from)); const to = date(single(request.query.to));
  if (page === null || limit === null || (action && !AUDIT_ACTIONS.includes(action as never)) || (entityType && !AUDIT_ENTITY_TYPES.includes(entityType as never)) || (administratorId && !ID.test(administratorId)) || (entityId && !ID.test(entityId)) || from === null || to === null || (from && to && from > to)) { response.status(400).json({ error: "Provide valid audit pagination and filters." }); return; }
  try { const result = await load({ ...(action ? { action: action as AuditFilters["action"] } : {}), ...(entityType ? { entityType: entityType as AuditFilters["entityType"] } : {}), ...(administratorId ? { administratorId } : {}), ...(entityId ? { entityId } : {}), ...(from ? { from } : {}), ...(to ? { to } : {}) }, (page - 1) * limit, limit); response.status(200).json({ ...result, page, limit, actions: AUDIT_ACTIONS, entityTypes: AUDIT_ENTITY_TYPES }); } catch { response.status(503).json({ error: "Audit service is unavailable." }); }
}
export async function getAdminAudit(request: Request, response: Response): Promise<void> { await respondWithAdminAudit(request, response); }
