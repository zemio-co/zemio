"use client";

import { FileSearchCornerIcon, PlusIcon } from "lucide-react";
import Link from "next/link";
import type React from "react";
import { Button } from "@/components/ui/button";
import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "@/components/ui/empty";
import { ReportStatus } from "@/generated/prisma/enums";
import { cn } from "@/lib/utils";
import { api } from "@/trpc/react";
import { ReportExpenseCard } from "./report-expense-card";

export function ReportExpensesList({
	className,
	reportId,
	reportStatus,
	...props
}: React.ComponentProps<"ul"> & {
	reportId: string;
	reportStatus: ReportStatus;
}) {
	const canAddExpense =
		reportStatus === ReportStatus.DRAFT ||
		reportStatus === ReportStatus.NEEDS_REVISION;

	const [expenses] = api.expense.listForReport.useSuspenseQuery({
		reportId: reportId,
	});

	if (expenses.length === 0) {
		return (
			<Empty className="border">
				<EmptyHeader>
					<EmptyMedia variant="icon">
						<FileSearchCornerIcon />
					</EmptyMedia>
					<EmptyTitle>Keine Ausgaben gefunden</EmptyTitle>
					<EmptyDescription>
						Füge eine neue Ausgabe hinzu, um deinen Antrag einzureichen.
					</EmptyDescription>
				</EmptyHeader>
				<EmptyContent className="flex-row justify-center gap-2">
					<Button
						aria-disabled={!canAddExpense}
						className={
							"data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50 sm:w-fit"
						}
						data-disabled={!canAddExpense}
						nativeButton={false}
						render={
							<Link href={`/reports/${reportId}/expenses/new`}>
								<PlusIcon />
								Ausgabe hinzufügen
							</Link>
						}
						size="sm"
						tabIndex={canAddExpense ? 0 : -1}
					/>
				</EmptyContent>
			</Empty>
		);
	}

	return (
		<ul
			className={cn(
				"grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3",
				className,
			)}
			data-slot="report-expenses-list"
			{...props}
		>
			{expenses.map((expense) => (
				<li key={expense.id}>
					<ReportExpenseCard expense={expense} reportStatus={reportStatus} />
				</li>
			))}
		</ul>
	);
}
