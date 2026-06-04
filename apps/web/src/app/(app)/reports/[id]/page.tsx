import { ArrowLeftIcon, PlusIcon } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ReportStatus } from "@/generated/prisma/enums";
import { ROUTES } from "@/lib/consts";
import { api, HydrateClient } from "@/trpc/server";
import { ReportExpensesList } from "./_components/report-expenses-list";
import { ReportHeader } from "./_components/report-header";
import { ReportStats } from "./_components/report-stats";

export default async function ServerPage({
	params,
}: PageProps<"/reports/[id]">) {
	const { id: reportId } = await params;

	const report = await api.report.getById({ id: reportId });

	// Prefetch additional data for client components
	void api.report.getDetails.prefetch({ id: reportId });
	void api.expense.listForReport.prefetch({ reportId });

	const canAddExpense =
		report.status === ReportStatus.DRAFT ||
		report.status === ReportStatus.NEEDS_REVISION;

	return (
		<HydrateClient>
			<section className="container pt-12">
				<Button
					className={"-ms-2 mb-8"}
					nativeButton={false}
					render={
						<Link href={ROUTES.USER_DASHBOARD}>
							<ArrowLeftIcon />
							Zur Übersicht
						</Link>
					}
					variant={"ghost"}
				/>
				<ReportHeader report={report} />
			</section>
			<section className="container mt-8">
				<Suspense fallback={<Skeleton className="h-12 w-full" />}>
					<ReportStats reportId={reportId} />
				</Suspense>
			</section>
			<section className="container my-12 pb-24">
				<div className="mb-4 flex flex-col flex-wrap items-start justify-between gap-4 sm:flex-row">
					<h2 className="font-semibold">Ausgaben</h2>
					<Button
						className={
							"w-full data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50 sm:w-fit"
						}
						data-disabled={!canAddExpense}
						nativeButton={false}
						render={
							<Link href={`/reports/${reportId}/expenses/new`}>
								<PlusIcon />
								Ausgabe hinzufügen
							</Link>
						}
						tabIndex={!canAddExpense ? 0 : -1}
						variant={"outline"}
					/>
				</div>

				<Suspense fallback={<Skeleton className="h-12 w-full" />}>
					<ReportExpensesList reportId={reportId} reportStatus={report.status} />
				</Suspense>
			</section>
		</HydrateClient>
	);
}
