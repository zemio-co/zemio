"use client";

import { PlusIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { CreateReport } from "@/modules/report";
import { DashboardReportList } from "./dashboard-report-list";
import { DashboardStats } from "./dashboard-stats";

function DashboardContent({
	className,
	...props
}: React.ComponentProps<"div">) {
	return (
		<div className={cn("", className)} data-slot="dashboard-content" {...props}>
			<main className="py-12">
				<DashboarHeader />
				<section className="container mt-8">
					<DashboardStats />
				</section>
				<section className="container mt-20">
					<DashboardReportList />
				</section>
			</main>
		</div>
	);
}

function DashboarHeader({
	className,
	...props
}: React.ComponentProps<"section">) {
	const t = useTranslations("modules.dashboard.header");

	return (
		<section
			className={cn("container", className)}
			data-slot="dashboard-header"
			{...props}
		>
			<div className="flex flex-wrap justify-between gap-4">
				<h1 className="font-semibold text-2xl text-slate-800">{t("title")}</h1>
				<CreateReport>
					<SheetTrigger
						render={
							<Button size={"sm"}>
								<PlusIcon /> {t("newReport")}
							</Button>
						}
					/>
				</CreateReport>
			</div>
			<Separator className={"mt-4"} />
		</section>
	);
}

export { DashboardContent };
