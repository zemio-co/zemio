"use client";

import { DownloadIcon, FileIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import type React from "react";
import { useCallback, useMemo, useState } from "react";
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
import { cn, formatBytes } from "@/lib/utils";
import { api } from "@/trpc/react";
import type { ReviewAttachment, ReviewLoadState } from "./review-types";

const DOWNLOAD_URL_REFRESH_INTERVAL_MS = 4 * 60 * 1000;

type BatchDownloadFile = {
	id: string;
	filename: string;
	url: string;
};

type DownloadFilesCache = {
	files: BatchDownloadFile[];
	idsKey: string;
	updatedAt: number;
};

function ReviewAttachments({
	attachments,
	className,
	errorMessage,
	loading,
	...props
}: React.ComponentProps<"section"> & {
	attachments?: ReviewAttachment[];
} & ReviewLoadState) {
	const t = useTranslations("modules.review.attachments");

	if (loading) {
		return (
			<section className={cn("space-y-4", className)} {...props}>
				<AttachmentsHeader attachments={[]} loading />
				<Skeleton className="min-h-32 w-full" />
			</section>
		);
	}

	if (errorMessage || !attachments) {
		return (
			<section className={cn("space-y-4", className)} {...props}>
				<AttachmentsHeader attachments={[]} />
				<div className="flex min-h-24 flex-col items-center justify-center gap-1 rounded-md border border-dashed px-6 py-10">
					<p className="text-center font-medium text-destructive text-sm">
						{t("loadErrorTitle")}
					</p>
					<p className="text-center text-xs">{errorMessage ?? t("unknownError")}</p>
				</div>
			</section>
		);
	}

	if (attachments.length === 0) {
		return (
			<section className={cn("space-y-4", className)} {...props}>
				<AttachmentsHeader attachments={attachments} />
				<div className="flex min-h-24 flex-col items-center justify-center gap-1 rounded-md border border-dashed px-6 py-10">
					<p className="text-center font-medium text-sm">{t("emptyTitle")}</p>
					<p className="text-center text-muted-foreground text-xs">
						{t("emptyDescription")}
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
	attachments: ReviewAttachment[];
	loading?: boolean;
}) {
	const t = useTranslations("modules.review.attachments");

	return (
		<div
			className={cn("flex items-center justify-start gap-2", className)}
			data-slot="attachments-header"
			{...props}
		>
			<p className="font-semibold text-zinc-800">{t("title")}</p>
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
	attachments: ReviewAttachment[];
}) {
	const t = useTranslations("modules.review.attachments");
	const attachmentIds = useMemo(
		() => attachments.map((attachment) => attachment.id),
		[attachments],
	);
	const attachmentIdsKey = useMemo(
		() => attachmentIds.join("\0"),
		[attachmentIds],
	);
	const [downloadFilesCache, setDownloadFilesCache] =
		useState<DownloadFilesCache | null>(null);
	const { mutateAsync, isPending } =
		api.attachment.getBatchDownloadUrls.useMutation();

	const getFreshDownloadFiles = useCallback((): BatchDownloadFile[] | null => {
		if (
			!downloadFilesCache ||
			downloadFilesCache.idsKey !== attachmentIdsKey ||
			downloadFilesCache.files.length !== attachmentIds.length ||
			Date.now() - downloadFilesCache.updatedAt >= DOWNLOAD_URL_REFRESH_INTERVAL_MS
		) {
			return null;
		}

		return downloadFilesCache.files;
	}, [attachmentIds.length, attachmentIdsKey, downloadFilesCache]);

	const prepareDownloadFiles = useCallback(async () => {
		if (attachmentIds.length === 0) {
			return [];
		}

		const result = await mutateAsync({ ids: attachmentIds });
		setDownloadFilesCache({
			files: result.files,
			idsKey: attachmentIdsKey,
			updatedAt: Date.now(),
		});
		return result.files;
	}, [attachmentIds, attachmentIdsKey, mutateAsync]);

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

		const freshDownloadFiles = getFreshDownloadFiles();
		if (!freshDownloadFiles) {
			toast.promise(
				prepareDownloadFiles().then((files) => {
					for (const file of files) {
						triggerDownload(file.url, file.filename);
					}
				}),
				{
					loading: t("downloadAllLoading"),
					success: t("downloadAllSuccess"),
					error: t("downloadAllError"),
				},
			);
			return;
		}

		for (const file of freshDownloadFiles) {
			triggerDownload(file.url, file.filename);
		}

		toast.success(t("downloadAllSuccess"));
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
			{t("downloadAllAction")}
			<DownloadIcon />
		</Button>
	);
}

function AttachmentItem({ attachment }: { attachment: ReviewAttachment }) {
	const t = useTranslations("modules.review.attachments");
	const { mutateAsync, isPending } = api.attachment.getDownloadUrl.useMutation();

	function handleDownload() {
		toast.promise(
			mutateAsync({ id: attachment.id }).then((result) => {
				window.location.href = result.url;
			}),
			{
				loading: t("downloadLoading"),
				success: t("downloadSuccess"),
				error: t("downloadError"),
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
					{t("downloadAction")}
					<DownloadIcon />
				</Button>
			</div>
		</BoxItem>
	);
}

export { ReviewAttachments };
