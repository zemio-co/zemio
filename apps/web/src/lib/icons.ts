import type { ReportStatus } from "@zemio/db";
import {
	BanknoteArrowDownIcon,
	CircleCheckIcon,
	CircleDotDashedIcon,
	CircleGaugeIcon,
	CircleXIcon,
	RefreshCwIcon,
} from "lucide-react";

export const StatusIcons: Record<
	ReportStatus,
	React.FC<React.SVGProps<SVGSVGElement>>
> = {
	DRAFT: CircleDotDashedIcon,
	PENDING_APPROVAL: CircleGaugeIcon,
	NEEDS_REVISION: RefreshCwIcon,
	ACCEPTED: CircleCheckIcon,
	REJECTED: CircleXIcon,
	PAID: BanknoteArrowDownIcon,
};
