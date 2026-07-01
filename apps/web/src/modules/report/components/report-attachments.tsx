"use client";

import type { Attachment } from "@zemio/db";
import { DownloadIcon, FileIcon, TrashIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn, formatBytes } from "@/lib/utils";
import { api } from "@/trpc/react";

function ReportAttachments({
	className,
	reportId,
	...props
}: React.ComponentProps<"section"> & {
	reportId: string;
}) {
	const attachmentsQuery = api.attachment.listForReport.useQuery({
		id: reportId,
	});

	if (attachmentsQuery.isPending) {
		return <AttachmentsLoading className={className} {...props} />;
	}

	if (attachmentsQuery.error) {
		return <p>Fehler</p>;
	}

	const { data: attachments } = attachmentsQuery;

	if (attachments.length === 0) {
		return <AttachmentsEmpty className={className} {...props} />;
	}

	return (
		<section
			className={cn("", className)}
			data-slot="report-attachments"
			{...props}
		>
			<AttachmentsHeader />
			<AttachmentsList
				attachments={attachments}
				className="mt-6"
				reportId={reportId}
			/>
		</section>
	);
}

function AttachmentsHeader({
	className,
	...props
}: React.ComponentProps<"div">) {
	return (
		<div
			className={cn(
				"flex flex-wrap items-center justify-between gap-4",
				className,
			)}
			data-slot="report-expenses-header"
			{...props}
		>
			<h3 className="font-semibold text-lg text-slate-800">Anhänge</h3>
		</div>
	);
}

function AttachmentsEmpty({
	className,
	...props
}: React.ComponentProps<"section">) {
	return (
		<section
			className={cn("", className)}
			data-slot="report-attachments-empty"
			{...props}
		>
			<AttachmentsHeader />
			<div className="mt-12 flex w-full flex-col items-center justify-center rounded-lg">
				<div className="max-w-xs">
					<div className="w-fit rounded-sm bg-slate-100 p-2">
						<FileIcon className="size-5 text-slate-500" />
					</div>
					<p className="mt-6 font-medium text-slate-800 text-sm">
						Keine Anhänge gefunden
					</p>
					<p className="mt-1 text-slate-500 text-sm">
						Erstelle eine neue Ausgabe und hinterlege einen Anhang damit dieser hier
						erscheint.
					</p>
				</div>
			</div>
		</section>
	);
}

function AttachmentsLoading({
	className,
	...props
}: React.ComponentProps<"section">) {
	return (
		<section
			className={cn("", className)}
			data-slot="report-attachments-loading"
			{...props}
		>
			<AttachmentsHeader />
			<Skeleton className="mt-6 h-24 w-full" />
		</section>
	);
}

function AttachmentsList({
	className,
	attachments,
	reportId,
	...props
}: React.ComponentProps<"ul"> & {
	attachments: Attachment[];
	reportId: string;
}) {
	return (
		<ul
			className={cn("space-y-4", className)}
			data-slot="attachments-list"
			{...props}
		>
			{attachments.map((attachment) => (
				<AttachmentRow
					attachment={attachment}
					key={attachment.id}
					reportId={reportId}
				/>
			))}
		</ul>
	);
}

function AttachmentRow({
	className,
	attachment,
	reportId,
	...props
}: React.ComponentProps<"li"> & {
	attachment: Attachment;
	reportId: string;
}) {
	const utils = api.useUtils();
	const downloadMutation = api.attachment.getDownloadUrl.useMutation();
	const deleteMutation = api.attachment.delete.useMutation({
		onSuccess: () => {
			toast.success("Anhang erfolgreich gelöscht.");
			utils.attachment.listForReport.invalidate({ id: reportId });
		},
		onError: (error) => {
			toast.error("Fehler beim Löschen des Anhangs", {
				description: error.message ?? "Ein unerwarteter Fehler ist aufgetreten.",
			});
		},
	});

	const handleDelete = () => {
		deleteMutation.mutate({
			id: attachment.id,
		});
	};

	function handleDownload() {
		toast.promise(
			downloadMutation.mutateAsync({ id: attachment.id }).then((result) => {
				window.location.href = result.url;
			}),
			{
				loading: "Download wird vorbereitet…",
				success: "Download gestartet",
				error: (error) => {
					return {
						message: "Fehler beim Herunterladen des Anhangs",
						description: error.message ?? "Ein unbekannter Fehler ist aufgetreten",
					};
				},
			},
		);
	}

	return (
		<li
			className={cn(
				"group/row flex items-center justify-start group-data-[pending=true]/row:opacity-60",
				className,
			)}
			data-pending={deleteMutation.isPending}
			data-slot="attachment-row"
			{...props}
		>
			<div className="flex size-9 items-center justify-center rounded-sm bg-slate-100">
				<FileIcon className="size-5 text-slate-600" />
			</div>
			<div className="ml-4 space-y-0.5">
				<p className="font-medium text-slate-800 text-sm">
					{attachment.originalName}
				</p>
				<p className="text-slate-500 text-xs">{formatBytes(attachment.size)}</p>
			</div>
			<div className="ml-8 flex items-center justify-center gap-2">
				<Button
					aria-label="Anhang herunterladen"
					className={
						"opacity-0 transition-opacity group-hover/row:opacity-100 group-data-[pending=true]/row:opacity-100"
					}
					disabled={deleteMutation.isPending || downloadMutation.isPending}
					onClick={handleDownload}
					size={"icon-sm"}
					variant={"ghost"}
				>
					<DownloadIcon />
				</Button>
				<Button
					className={
						"opacity-0 transition-opacity group-hover/row:opacity-100 group-data-[pending=true]/row:opacity-100"
					}
					disabled={deleteMutation.isPending}
					onClick={handleDelete}
					size={"icon-sm"}
					variant={"ghost"}
				>
					<TrashIcon className="text-destructive" />
				</Button>
			</div>
		</li>
	);
}

export { ReportAttachments };
