"use client";

import type { ColumnDef } from "@tanstack/react-table";
import type { CostUnit, User } from "@/generated/prisma/client";

export type ExtendedReport = Report & {
	owner: Pick<User, "name" | "image" | "email">;
	costUnit: Pick<CostUnit, "tag">;
};

export function generateReportsListColumns(args: {
	reports: ExtendedReport[];
}): ColumnDef<ExtendedReport>[] {
	const { reports: _reports } = args;

	return [];
}
