"use client";

import { DownloadIcon, FileIcon } from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
	Box,
	BoxItem,
	BoxItemContent,
	BoxItemDescription,
	BoxItemIcon,
	BoxItemTitle,
} from "@/components/box";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { Attachment } from "@/generated/prisma/client";
import { cn, formatBytes } from "@/lib/utils";
import { api } from "@/trpc/react";

const DOWNLOAD_URL_REFRESH_INTERVAL_MS = 4 * 60 * 1000;

type BatchDownloadFile = {
	id: string;
	filename: string;
	url: string;
};

function ReviewAttachments({
	reportId,
	className,
	...props
}: React.ComponentProps<"section"> & { reportId: string }) {
	const {
		data: attachments,
		isPending,
		error,
	} = api.attachment.listForReport.useQuery({
		id: reportId,
	});

	if (isPending) {
		return (
			<section className={cn("space-y-4", className)} {...props}>
				<AttachmentsHeader attachments={[]} loading />
				<Skeleton className="min-h-32 w-full" />
			</section>
		);
	}

	if (error || !attachments) {
		return (
			<section className={cn("space-y-4", className)} {...props}>
				<AttachmentsHeader attachments={[]} />
				<div className="flex min-h-24 flex-col items-center justify-center gap-1 rounded-md border border-dashed px-6 py-10">
					<p className="text-center font-medium text-destructive text-sm">
						Fehler beim Laden der Anhänge
					</p>
					<p className="text-center text-xs">
						{error?.message ?? "Ein unbekannter Fehler ist aufgetreten"}
					</p>
				</div>
			</section>
		);
	}

	if (attachments.length === 0) {
		return (
			<section className={cn("space-y-4", className)} {...props}>
				<AttachmentsHeader attachments={attachments} />
				<div className="flex min-h-24 flex-col items-center justify-center gap-1 rounded-md border border-dashed px-6 py-10">
					<p className="text-center font-medium text-sm">Keine Uploads gefunden</p>
					<p className="text-center text-xs">
						Der Nutzer hat keine Dokumente hochgeladen.
					</p>
				</div>
			</section>
		);
	}

	return (
		<section className={cn("space-y-4", className)} {...props}>
			<AttachmentsHeader attachments={attachments} />
			<Box>
				{attachments.map((attachment) => (
					<AttachmentItem attachment={attachment} key={attachment.id} />
				))}
			</Box>
		</section>
	);
}

function AttachmentsHeader({
	className,
	attachments,
	loading,
	...props
}: React.ComponentProps<"div"> & {
	attachments: Attachment[];
	loading?: boolean;
}) {
	return (
		<div
			className={cn("flex items-center justify-start gap-2", className)}
			data-slot="attachments-header"
			{...props}
		>
			<p className="font-semibold text-zinc-800">Anhänge</p>
			{loading ? (
				<Skeleton className="h-5 w-7 rounded-full" />
			) : (
				<Badge variant={"secondary"}>{attachments.length}</Badge>
			)}
			<AttachmentsDownloadAll
				attachments={attachments}
				className={"ml-auto translate-x-2.5"}
				disabled={loading}
			/>
		</div>
	);
}

function AttachmentsDownloadAll({
	className,
	attachments,
	disabled,
	onClick,
	...props
}: React.ComponentProps<typeof Button> & {
	attachments: Attachment[];
}) {
	const attachmentIds = useMemo(
		() => attachments.map((attachment) => attachment.id),
		[attachments],
	);
	const [downloadFiles, setDownloadFiles] = useState<BatchDownloadFile[]>([]);
	const [downloadFilesUpdatedAt, setDownloadFilesUpdatedAt] = useState<
		number | null
	>(null);
	const { mutateAsync, isPending } =
		api.attachment.getBatchDownloadUrls.useMutation();

	const hasFreshDownloadFiles = useCallback(() => {
		return (
			downloadFiles.length === attachmentIds.length &&
			downloadFilesUpdatedAt !== null &&
			Date.now() - downloadFilesUpdatedAt < DOWNLOAD_URL_REFRESH_INTERVAL_MS
		);
	}, [attachmentIds.length, downloadFiles.length, downloadFilesUpdatedAt]);

	const prepareDownloadFiles = useCallback(async () => {
		if (attachmentIds.length === 0) {
			return;
		}

		const result = await mutateAsync({ ids: attachmentIds });
		setDownloadFiles(result.files);
		setDownloadFilesUpdatedAt(Date.now());
	}, [attachmentIds, mutateAsync]);

	useEffect(() => {
		setDownloadFiles([]);
		setDownloadFilesUpdatedAt(null);

		if (attachmentIds.length === 0) {
			return;
		}

		void prepareDownloadFiles();
	}, [attachmentIds, prepareDownloadFiles]);

	function triggerDownload(url: string, filename: string) {
		const link = document.createElement("a");
		link.href = url;
		link.download = filename;
		link.rel = "noopener";
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
	}

	const handleDownloadAll: NonNullable<
		React.ComponentProps<typeof Button>["onClick"]
	> = (event) => {
		onClick?.(event);

		if (
			event.defaultPrevented ||
			event.baseUIHandlerPrevented ||
			attachments.length === 0
		) {
			return;
		}

		if (!hasFreshDownloadFiles()) {
			toast.promise(prepareDownloadFiles(), {
				loading: "Downloads werden vorbereitet…",
				success: "Downloads vorbereitet",
				error: "Downloads fehlgeschlagen",
			});
			return;
		}

		for (const file of downloadFiles) {
			triggerDownload(file.url, file.filename);
		}

		toast.success("Downloads gestartet");
	};

	return (
		<Button
			className={cn("text-blue-500 hover:text-blue-500", className)}
			data-slot="attachments-download-all"
			disabled={disabled || isPending || attachments.length === 0}
			onClick={handleDownloadAll}
			variant={"ghost"}
			{...props}
		>
			Alle herunterladen
			<DownloadIcon />
		</Button>
	);
}

function AttachmentItem({ attachment }: { attachment: Attachment }) {
	const { mutateAsync, isPending } = api.attachment.getDownloadUrl.useMutation();

	function handleDownload() {
		toast.promise(
			mutateAsync({ id: attachment.id }).then((result) => {
				window.location.href = result.url;
			}),
			{
				loading: "Download wird vorbereitet…",
				success: "Download gestartet",
				error: "Download fehlgeschlagen",
			},
		);
	}

	const dotIndex = attachment.originalName.lastIndexOf(".");
	const fileExtension =
		dotIndex !== -1
			? attachment.originalName.slice(dotIndex + 1).toUpperCase()
			: "—";

	return (
		<BoxItem key={attachment.id} variant="clickable">
			<BoxItemIcon>
				<FileIcon />
			</BoxItemIcon>
			<BoxItemContent>
				<BoxItemTitle className="truncate">{attachment.originalName}</BoxItemTitle>
				<div className="flex items-center justify-start gap-1.5">
					<BoxItemDescription>
						{formatBytes(Number(attachment.size))}
					</BoxItemDescription>
					<BoxItemDescription className="text-zinc-600">•</BoxItemDescription>
					<BoxItemDescription>{fileExtension}</BoxItemDescription>
				</div>
			</BoxItemContent>
			<div className="ml-auto flex items-center justify-center gap-2 transition-opacity group-hover/item:opacity-100 md:opacity-0">
				<Button
					className={"cursor-pointer text-blue-500 hover:text-blue-500"}
					disabled={isPending}
					onClick={handleDownload}
					size={"sm"}
					variant={"ghost"}
				>
					Herunterladen
					<DownloadIcon />
				</Button>
			</div>
		</BoxItem>
	);
}

export { ReviewAttachments };
