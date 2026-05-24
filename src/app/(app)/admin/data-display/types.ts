import type { Report as ReportPrimitive } from "@/generated/prisma/client";

export type ListReport = ReportPrimitive & {
	sum: number;
};
