import type {
	CostUnit,
	Report as ReportPrimitive,
	User,
} from "@/generated/prisma/client";

export type ListReport = ReportPrimitive & {
	sum: number;
	owner: Pick<User, "name" | "image" | "email">;
	costUnit: Pick<CostUnit, "tag">;
};
