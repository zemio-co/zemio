"use client";

import type React from "react";
import { cn } from "@/lib/utils";
import { api } from "@/trpc/react";
import { ReviewAttachments } from "./review-attachments";
import { ReviewDetails } from "./review-details";
import { ReviewExpenses } from "./review-expenses";
import { ExpensesHeader } from "./review-header";
import { ReviewNavbar } from "./review-navbar";
import { ReviewReasoning } from "./review-reasoning";

function ReviewContent({
	className,
	reportId,
	...props
}: React.ComponentProps<"main"> & { reportId: string }) {
	const {
		data: review,
		error,
		isPending,
	} = api.admin.getReview.useQuery({
		id: reportId,
	});
	const errorMessage = error?.message;

	return (
		<main className={cn("bg-zinc-50 pb-32", className)} {...props}>
			<ReviewNavbar
				loading={isPending}
				report={
					review
						? {
								iban: review.bankingSummary.iban,
								id: review.report.id,
								name: review.bankingSummary.ownerName,
								readableId: review.report.readableId,
								sum: review.totalAmount,
								title: review.report.title,
							}
						: undefined
				}
			/>
			<section className="mt-20">
				<div className="mx-auto w-full max-w-5xl px-8">
					<ExpensesHeader
						errorMessage={errorMessage}
						loading={isPending}
						report={review?.report}
					/>

					<ReviewDetails
						bankingSummary={review?.bankingSummary}
						className="mt-10 lg:grid-cols-3"
						errorMessage={errorMessage}
						loading={isPending}
						totalAmount={review?.totalAmount}
					/>
				</div>
			</section>
			<div className="mx-auto mt-20 w-full max-w-5xl px-8">
				<ReviewReasoning
					className="mt-20"
					errorMessage={errorMessage}
					loading={isPending}
					report={review?.report}
				/>
				<ReviewExpenses
					className="mt-20"
					errorMessage={errorMessage}
					expenses={review?.expenses}
					loading={isPending}
					totalAmount={review?.totalAmount}
				/>
				<ReviewAttachments
					attachments={review?.attachments}
					className="mt-20"
					errorMessage={errorMessage}
					loading={isPending}
				/>
			</div>
		</main>
	);
}

export { ReviewContent };
