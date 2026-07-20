"use client";

import type { Attachment } from "@zemio/db";
import { DownloadIcon, FileIcon, TrashIcon } from "lucide-react";
import { useTranslations } from "next-intl";
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
	const t = useTranslations("modules.report.attachments");
	const attachmentsQuery = api.attachment.listForReport.useQuery({
		id: reportId,
	});

	if (attachmentsQuery.isPending) {
		return <AttachmentsLoading className={className} {...props} />;
	}

	if (attachmentsQuery.error) {
		return <p>{t("loadError")}</p>;
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
	const t = useTranslations("modules.report.attachments");

	return (
		<div
			className={cn(
				"flex flex-wrap items-center justify-between gap-4",
				className,
			)}
			data-slot="report-expenses-header"
			{...props}
		>
			<h3 className="font-semibold text-lg text-slate-800">{t("header")}</h3>
		</div>
	);
}

function AttachmentsEmpty({
	className,
	...props
}: React.ComponentProps<"section">) {
	const t = useTranslations("modules.report.attachments");

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
						{t("emptyTitle")}
					</p>
					<p className="mt-1 text-slate-500 text-sm">{t("emptyDescription")}</p>
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
	const t = useTranslations("modules.report.attachments");
	const tCommon = useTranslations("modules.report.common");
	const utils = api.useUtils();
	const downloadMutation = api.attachment.getDownloadUrl.useMutation();
	const deleteMutation = api.attachment.delete.useMutation({
		onSuccess: () => {
			toast.success(t("toasts.deleteSuccess"));
			utils.attachment.listForReport.invalidate({ id: reportId });
		},
		onError: (error) => {
			toast.error(t("toasts.deleteErrorTitle"), {
				description: error.message ?? t("toasts.deleteErrorDescription"),
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
				loading: tCommon("toasts.downloadPreparing"),
				success: tCommon("toasts.downloadStarted"),
				error: (error) => {
					return {
						message: t("toasts.downloadErrorTitle"),
						description: error.message ?? t("toasts.downloadErrorDescription"),
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
					aria-label={t("downloadAriaLabel")}
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
