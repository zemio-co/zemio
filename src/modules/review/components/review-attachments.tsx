"use client";

import { DownloadIcon, FileIcon } from "lucide-react";
import type React from "react";
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
import type { Attachment } from "@/generated/prisma/client";
import { cn, formatBytes } from "@/lib/utils";
import { api } from "@/trpc/react";

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
		return <p>Loading</p>;
	}

	if (error) {
		return <p>{error.message}</p>;
	}

	return (
		<section className={cn("space-y-4", className)} {...props}>
			<div className="flex items-center justify-start gap-2">
				<p className="font-semibold text-zinc-800">Anhänge</p>
				<Badge variant={"secondary"}>{attachments.length}</Badge>
				<div className="ml-auto flex cursor-pointer items-center justify-center gap-1.5">
					<p className="font-medium text-blue-500 text-sm">Alle herunterladen</p>
					<DownloadIcon className="size-3.5 text-blue-500" />
				</div>
			</div>
			<Box>
				{attachments.map((attachment) => (
					<AttachmentItem attachment={attachment} key={attachment.id} />
				))}
			</Box>
		</section>
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
		dotIndex !== -1 ? attachment.originalName.slice(dotIndex + 1).toUpperCase() : "—";

	return (
		<BoxItem key={attachment.id} variant="clickable">
			<BoxItemIcon>
				<FileIcon />
			</BoxItemIcon>
			<BoxItemContent>
				<BoxItemTitle className="truncate">{attachment.originalName}</BoxItemTitle>
				<div className="flex items-center justify-start gap-1.5">
					<BoxItemDescription>{formatBytes(Number(attachment.size))}</BoxItemDescription>
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
