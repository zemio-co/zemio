import { ReviewAttachments } from "@/modules/review/components/review-attachments";
import { ReviewDetails } from "@/modules/review/components/review-details";
import { ReviewExpenses } from "@/modules/review/components/review-expenses";
import { ExpensesHeader } from "@/modules/review/components/review-header";
import { ReviewNavbar } from "@/modules/review/components/review-navbar";
import { ReviewReasoning } from "@/modules/review/components/review-reasoning";
import { api, HydrateClient } from "@/trpc/server";

export default async function ServerPage({
	params,
}: PageProps<"/reports/[id]">) {
	const { id: reportId } = await params;

	void (await Promise.all([
		api.report.getById.prefetch({ id: reportId }),
		api.report.getDetails.prefetch({ id: reportId }),
		api.expense.listForReport.prefetch({ reportId }),
		api.attachment.listForReport.prefetch({ id: reportId }),
	]));

	const [report] = await Promise.all([api.report.getById({ id: reportId })]);

	return (
		<HydrateClient>
			<main className="bg-zinc-50 pb-32">
				<ReviewNavbar
					report={{
						iban: "details.iban",
						id: report.id,
						name: "details.ownerName",
						readableId: report.tag.toString(),
						sum: 99,
						title: report.title,
					}}
				/>
				<section className="mt-20">
					<div className="mx-auto w-full max-w-5xl px-8">
						<ExpensesHeader reportId={reportId} />

						<ReviewDetails className="mt-10 lg:grid-cols-3" reportId={reportId} />
					</div>
				</section>
				<div className="mx-auto mt-20 w-full max-w-5xl px-8">
					<ReviewReasoning className="mt-20" reportId={reportId} />
					<ReviewExpenses className="mt-20" reportId={reportId} />
					<ReviewAttachments className="mt-20" reportId={reportId} />
				</div>
			</main>
		</HydrateClient>
	);
}
