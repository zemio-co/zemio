import type { ReportListItemDTO } from "@/server/modules/report/report.dto";

/**
 * The list rows as the server actually sends them. Typed against the DTO rather
 * than the Prisma model so a new column on `report` does not become a type error
 * in the table.
 */
export type ListReport = ReportListItemDTO;
