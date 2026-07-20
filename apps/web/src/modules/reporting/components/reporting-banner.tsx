"use client";

import { TriangleAlertIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

function ReportingBanner({ className, ...props }: React.ComponentProps<"div">) {
	const t = useTranslations("modules.reporting.banner");

	return (
		<div
			className={cn(
				"flex flex-nowrap items-start justify-start gap-3 rounded-xl bg-amber-50 px-5 py-4",
				className,
			)}
			data-slot="reporting-banner"
			{...props}
		>
			<TriangleAlertIcon className="mt-0.5 size-4 shrink-0 text-amber-600" />
			<div>
				<p className="font-semibold text-amber-800 text-sm">{t("title")}</p>
				<p className="mt-1 max-w-4xl text-amber-700 text-sm">{t("description")}</p>
			</div>
		</div>
	);
}

export { ReportingBanner };
