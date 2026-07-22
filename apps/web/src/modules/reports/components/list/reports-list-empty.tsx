"use client";

import { FilterIcon, PlusIcon, TrafficConeIcon, XIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { CreateReport } from "@/modules/report/components";

function ReportsListEmpty({
	className,
	...props
}: React.ComponentProps<"div">) {
	const t = useTranslations("modules.reports.empty");

	return (
		<div className={cn("", className)} data-slot="reports-list-empty" {...props}>
			<div className="container max-w-md">
				<div className="mb-8 flex w-fit items-center justify-center rounded-sm bg-zinc-100 p-2">
					<TrafficConeIcon className="size-5" />
				</div>
				<p className="font-medium text-sm">{t("title")}</p>
				<p className="mt-1 text-muted-foreground text-sm">{t("description")}</p>
				<div className="mt-4">
					<CreateReport>
						<SheetTrigger
							render={
								<Button size={"sm"}>
									<PlusIcon /> {t("createButton")}
								</Button>
							}
						/>
					</CreateReport>
				</div>
			</div>
		</div>
	);
}

function ReportsListNoResults({
	className,
	onClearFilters,
	...props
}: React.ComponentProps<"div"> & {
	onClearFilters: () => void;
}) {
	const t = useTranslations("modules.reports.noResults");

	return (
		<div
			className={cn("", className)}
			data-slot="reports-list-no-results"
			{...props}
		>
			<div className="container max-w-md">
				<div className="mb-8 flex w-fit items-center justify-center rounded-sm bg-zinc-100 p-2">
					<FilterIcon className="size-5" />
				</div>
				<p className="font-medium text-sm">{t("title")}</p>
				<p className="mt-1 text-muted-foreground text-sm">{t("description")}</p>
				<div className="mt-4">
					<Button onClick={onClearFilters} size={"sm"}>
						{t("clearFilters")}
						<XIcon />
					</Button>
				</div>
			</div>
		</div>
	);
}

export { ReportsListEmpty, ReportsListNoResults };
