import type { Prisma } from "@zemio/db";
import { logger } from "@/lib/logger";
import type { AuditEventRow } from "./audit.repository";

export type AuditEventDTO = {
	id: string;
	organizationId: string;
	actorId: string;
	actor: { id: string; name: string; image: string | null };
	entityType: string;
	entityId: string;
	action: string;
	diff: Record<string, unknown> | null;
	payload: Record<string, unknown> | null;
	createdAt: Date;
};

function toJsonObject(
	value: Prisma.JsonValue | null,
): Record<string, unknown> | null {
	if (value === null) return null;
	if (typeof value !== "object" || Array.isArray(value)) {
		logger.warn("audit.dto.unexpected_json_shape", { type: typeof value });
		return null;
	}
	return value as Record<string, unknown>;
}

export function toAuditEventDTO(row: AuditEventRow): AuditEventDTO {
	return {
		id: row.id,
		organizationId: row.organizationId,
		actorId: row.actorId,
		actor: row.actor,
		entityType: row.entityType,
		entityId: row.entityId,
		action: row.action,
		diff: toJsonObject(row.diff),
		payload: toJsonObject(row.payload),
		createdAt: row.createdAt,
	};
}
