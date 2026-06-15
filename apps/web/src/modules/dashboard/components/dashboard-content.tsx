"use client";

import { PlusIcon } from "lucide-react";
import { PageTitle } from "@/components/page-title";
import { Button } from "@/components/ui/button";
import { SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { CreateReport } from "@/modules/report";
import { AppNavbar } from "@/modules/shared/components/app-navbar";
import { DashboardReportList } from "./dashboard-report-list";
import { DashboardStats } from "./dashboard-stats";

function DashboardContent({
	className,
	...props
}: React.ComponentProps<"div">) {
	return (
		<div
			className={cn("bg-white", className)}
			data-slot="dashboard-content"
			{...props}
		>
			{/* <DashboardNavbar /> */}
			<AppNavbar />
			<main className="py-12">
				<DashboarHeader />
				<section className="container mt-8">
					<DashboardStats />
				</section>
				<section className="container mt-12">
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
	return (
		<section
			className={cn("container flex flex-wrap justify-between gap-4", className)}
			data-slot="dashboard-header"
			{...props}
		>
			<PageTitle>Dashboard</PageTitle>
			<CreateReport>
				<SheetTrigger
					render={
						<Button size={"sm"}>
							<PlusIcon /> Neuer Antrag
						</Button>
					}
				/>
			</CreateReport>
		</section>
	);
}

export { DashboardContent };
