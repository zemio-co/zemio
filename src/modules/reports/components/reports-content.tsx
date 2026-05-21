import { PageTitle } from "@/components/page-title";
import { cn } from "@/lib/utils";
import { ReportsNavbar } from "./reports-navbar";
import { ReportsTable } from "./reports-table";

function ReportsContent({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div className={cn("", className)} data-slot="component" {...props}>
			<ReportsNavbar />
			<main className="py-12">
				<header className="container">
					<PageTitle>Deine Anträge</PageTitle>
				</header>

				<section className="container mt-12">
					<ReportsTable />
				</section>
			</main>
		</div>
	);
}

export { ReportsContent };
