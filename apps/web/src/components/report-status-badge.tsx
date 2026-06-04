import { CircleIcon } from "lucide-react";
import type React from "react";
import type { ReportStatus } from "@/generated/prisma/enums";
import { cn, translateReportStatus } from "@/lib/utils";
import { Badge } from "./ui/badge";

export function ReportStatusBadge({
	status,
	...props
}: React.ComponentProps<typeof Badge> & { status: ReportStatus }) {
	return (
		<Badge variant={"outline"} {...props}>
			<CircleIcon
				className={cn(
					"me-0.5 size-2.5!",
					status === "DRAFT" && "fill-muted-foreground text-muted-foreground",
					status === "PENDING_APPROVAL" && "fill-yellow-500 text-yellow-500",
					status === "NEEDS_REVISION" && "fill-orange-500 text-orange-500",
					status === "ACCEPTED" && "fill-green-500 text-green-500",
					status === "REJECTED" && "fill-red-500 text-red-500",
				)}
			/>
			{translateReportStatus(status)}
		</Badge>
	);
}
