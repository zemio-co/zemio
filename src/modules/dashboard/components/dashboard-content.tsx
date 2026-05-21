import { PageTitle } from "@/components/page-title";
import { cn } from "@/lib/utils";
import { DashboardReportList } from "./dashboard-report-list";
import { DashboardStats } from "./dashboard-stats";

function DashboardContent({
	className,
	...props
}: React.ComponentProps<"main">) {
	return (
		<main
			className={cn("py-12", className)}
			data-slot="dashboard-content"
			{...props}
		>
			<DashboarHeader />
			<section className="container mt-8">
				<DashboardStats />
			</section>
			<section className="container mt-12">
				<DashboardReportList />
			</section>
		</main>
	);
}

function DashboarHeader({
	className,
	...props
}: React.ComponentProps<"section">) {
	return (
		<section
			className={cn("container", className)}
			data-slot="dashboard-header"
			{...props}
		>
			<PageTitle>Dashboard</PageTitle>
		</section>
	);
}

export { DashboardContent };
