import {
	CircleCheckIcon,
	CircleDotDashedIcon,
	CircleGaugeIcon,
	CircleXIcon,
	RefreshCwIcon,
} from "lucide-react";
import type { ReportStatus } from "@/generated/prisma/enums";

export const StatusIcons: Record<
	ReportStatus,
	React.FC<React.SVGProps<SVGSVGElement>>
> = {
	DRAFT: CircleDotDashedIcon,
	PENDING_APPROVAL: CircleGaugeIcon,
	NEEDS_REVISION: RefreshCwIcon,
	ACCEPTED: CircleCheckIcon,
	REJECTED: CircleXIcon,
};
