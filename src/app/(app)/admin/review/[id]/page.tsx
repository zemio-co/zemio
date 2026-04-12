import { ChevronDown, DownloadIcon, FileIcon } from "lucide-react";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { ReviewAttachments } from "@/modules/review/components/review-attachments";
import { ReviewExpenses } from "@/modules/review/components/review-expenses";
import { ReviewNavbar } from "@/modules/review/components/review-navbar";
import { api } from "@/trpc/server";

export default async function ServerPage({
	params,
}: PageProps<"/reports/[id]">) {
	const { id: reportId } = await params;

	const [report, details, expenses] = await Promise.all([
		api.report.getById({ id: reportId }),
		api.report.getDetails({
			id: reportId,
		}),
		api.expense.listForReport({ reportId }),
	]);

	// const report = await api.report.getById({ id: reportId });

	// // Prefetch additional data for client components
	// const details = await api.report.getDetails({
	// 	id: reportId,
	// });
	// const expenses = api.expense.listForReport({ reportId });

	if (!report || !details || !expenses) {
		return <p>Not found</p>;
	}

	return (
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
								E-Mail Provider (cc-tool & spesen-tool)
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
				<div className="">
					<div className="flex items-center justify-start gap-2">
						<p className="font-semibold text-zinc-800">Begründung</p>
					</div>
					<div className="mt-4">
						<p className="max-w-prose rounded-lg rounded-bl-none px-4 py-3 text-zinc-700 leading-7 shadow-sm ring-1 ring-zinc-700/15">
							Es gibt im Moment in diese Mannschaft, oh, einige Spieler vergessen ihnen
							Profi was sie sind. Ich lese nicht sehr viele Zeitungen, aber ich habe
							gehört viele Situationen.
						</p>
						<div className="mt-3 flex items-center justify-start">
							<p className="text-sm text-zinc-500">Von</p>
							<Avatar className={"mr-1 ml-2 size-3.5"}>
								<AvatarImage src="https://github.com/chris23lngr.png" />
							</Avatar>
							<p className="font-medium text-sm text-zinc-600">Christoph Langer</p>
						</div>
					</div>
				</div>
				<div className="mt-20">
					<div className="flex items-center justify-start gap-2">
						<p className="font-semibold text-zinc-800">Kostenaufstellung</p>
						<Badge variant={"secondary"}>3</Badge>
						<div className="ml-auto flex cursor-pointer items-center justify-center gap-1.5">
							<p className="font-medium text-blue-500 text-sm">Exportieren</p>
							<DownloadIcon className="size-3.5 text-blue-500" />
						</div>
					</div>
					<div className="mt-4">
						<ReviewExpenses expenses={expenses} />
						<table className="hidden w-full">
							<thead>
								<tr className="border-b">
									<th className="py-3 text-left font-medium text-xs text-zinc-500">
										Titel
									</th>
									<th className="py-3 text-left font-medium text-xs text-zinc-500">
										Datum
									</th>
									<th className="py-3 text-right font-medium text-xs text-zinc-500">
										Betrag
									</th>
									<th className="py-3 text-right font-medium text-xs text-zinc-500">
										Aktionen
									</th>
								</tr>
							</thead>
							<tbody>
								<tr>
									<td className="py-3">
										<span className="font-medium text-sm text-zinc-800">Beleg</span>
									</td>
									<td className="py-3">
										<span className="text-sm text-zinc-500">12.04. - 14.04.2026</span>
									</td>
									<td className="py-3 text-right font-medium text-sm text-zinc-800">
										23.14 EUR
									</td>
								</tr>
								<tr className="border-t">
									<td className="py-3">
										<span className="font-medium text-sm text-zinc-800">Beleg</span>
									</td>
									<td className="py-3">
										<span className="text-sm text-zinc-500">13.04.2026</span>
									</td>
									<td className="py-3 text-right font-medium text-sm text-zinc-800">
										74.21 EUR
									</td>
								</tr>
								<tr className="border-t">
									<td className="py-3">
										<span className="font-medium text-sm text-zinc-800">Reise</span>
									</td>
									<td className="py-3">
										<span className="text-sm text-zinc-500">12.04.2026</span>
									</td>
									<td className="py-3 text-right font-medium text-sm text-zinc-800">
										5.07 EUR
									</td>
								</tr>
								<tr className="border-t">
									<td
										className="bg-zinc-50 py-3 text-right font-medium text-sm text-zinc-800"
										colSpan={2}
									>
										Gesamtbetrag
									</td>
									<td
										className="bg-zinc-50 py-3 text-right font-medium text-sm text-zinc-800"
										colSpan={1}
									>
										102.42 EUR
									</td>
									<td className="bg-zinc-50"></td>
								</tr>
							</tbody>
						</table>
					</div>
				</div>
				<ReviewAttachments className="mt-20" reportId={reportId} />
			</div>
		</main>
	);
}
