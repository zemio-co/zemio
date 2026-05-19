import { ChevronDown, FileIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { ReviewAttachments } from "@/modules/review/components/review-attachments";
import { ReviewExpenses } from "@/modules/review/components/review-expenses";
import { ReviewNavbar } from "@/modules/review/components/review-navbar";
import { ReviewReasoning } from "@/modules/review/components/review-reasoning";
import { api, HydrateClient } from "@/trpc/server";

export default async function ServerPage({
	params,
}: PageProps<"/reports/[id]">) {
	const { id: reportId } = await params;

	void (await Promise.all([
		api.report.getById.prefetch({ id: reportId }),
		api.expense.listForReport.prefetch({ reportId }),
		api.attachment.listForReport.prefetch({ id: reportId }),
	]));

	const [report, details] = await Promise.all([
		api.report.getById({ id: reportId }),
		api.report.getDetails({
			id: reportId,
		}),
	]);

	return (
		<HydrateClient>
			<main className="pb-32">
				<ReviewNavbar
					report={{
						iban: details.iban,
						id: report.id,
						name: details.ownerName,
						readableId: report.tag.toString(),
						sum: 99,
						title: report.title,
					}}
				/>
				<section className="mt-20">
					<div className="mx-auto w-full max-w-5xl px-8">
						<div className="flex items-start justify-start gap-5">
							<div className="mt-0.5 flex size-10 items-center justify-center rounded-md bg-zinc-800">
								<FileIcon className="size-5 text-white" />
							</div>
							<div>
								<h1 className="font-semibold text-2xl text-zinc-800">
									E-Mail Provider (cc-tool & zemio)
								</h1>
								<div className="mt-2 flex items-center justify-start gap-2">
									<p className="text-sm text-zinc-500">12 April 2026, 17:54</p>
									<p className="text-sm text-zinc-700">•</p>
									<p className="font-medium text-sm text-zinc-600">Entwurf</p>
								</div>
							</div>
							<div className="mt-0.5 ml-auto">
								<ButtonGroup>
									<Button variant={"outline"}>Bearbeiten</Button>
									<Button size={"icon"} variant={"outline"}>
										<ChevronDown />
									</Button>
								</ButtonGroup>
							</div>
						</div>
						<div className="mt-10 grid grid-cols-3 gap-8">
							<div className="space-y-4 rounded-lg p-4 shadow-sm ring-1 ring-zinc-700/15">
								<p className="font-medium text-xs text-zinc-500">Gesamtkosten</p>
								<p className="font-semibold text-lg text-zinc-800">231,31€</p>
							</div>
							<div className="space-y-4 rounded-lg p-4 shadow-sm ring-1 ring-zinc-700/15">
								<p className="font-medium text-xs text-zinc-500">IBAN</p>
								<p className="truncate font-semibold text-lg text-zinc-800">
									DE72 2812 0000 7510 7581 83
								</p>
							</div>
							<div className="space-y-4 rounded-lg p-4 shadow-sm ring-1 ring-zinc-700/15">
								<p className="font-medium text-xs text-zinc-500">Kontoname</p>
								<p className="font-semibold text-lg text-zinc-800">
									Karsten Frank Meier
								</p>
							</div>
						</div>
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
