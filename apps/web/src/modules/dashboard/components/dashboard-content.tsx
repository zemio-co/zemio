"use client";

import { PlusIcon } from "lucide-react";
import Link from "next/link";
import { PageTitle } from "@/components/page-title";
import { buttonVariants } from "@/components/ui/button";
import { ROUTES } from "@/lib/routes";
import { cn } from "@/lib/utils";
import { DashboardNavbar } from "./dashboard-navbar";
import { DashboardReportList } from "./dashboard-report-list";
import { DashboardStats } from "./dashboard-stats";

function DashboardContent({
	className,
	...props
}: React.ComponentProps<"div">) {
	return (
		<div className={cn("", className)} data-slot="dashboard-content" {...props}>
			<DashboardNavbar />
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
			<Link className={buttonVariants()} href={ROUTES.NEW_REPORT()}>
				<PlusIcon />
				Neuer Antrag
			</Link>
		</section>
	);
}

export { DashboardContent };
