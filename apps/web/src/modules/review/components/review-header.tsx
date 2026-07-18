"use client";

import type { ReportStatus } from "@zemio/db";
import { format, formatDistanceToNow } from "date-fns";
import { de } from "date-fns/locale";
import { ChevronDownIcon, FileIcon, SheetIcon, TrashIcon } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { StatusIcons } from "@/lib/icons";
import { cn, translateReportStatus } from "@/lib/utils";
import { api } from "@/trpc/react";
import type { ReviewReport } from "./review-types";

function ExpensesHeader({
	className,
	reportId,
	...props
}: React.ComponentProps<"header"> & {
	reportId: string;
}) {
	const {
		data: review,
		error,
		isPending,
	} = api.report.review.useQuery({
		id: reportId,
	});

	if (isPending) {
		return <HeaderLoading className={className} {...props} />;
	}

	const errorMessage = error?.message;
	const report = review?.report;

	if (errorMessage) {
		return (
			<header
				className={cn("flex flex-col items-start gap-1", className)}
				data-slot="expenses-header-error"
				{...props}
			>
				<p className="font-medium text-destructive text-sm">
					Report konnte nicht geladen werden
				</p>
				<p className="text-muted-foreground text-xs">{errorMessage}</p>
			</header>
		);
	}

	if (!report) {
		return null;
	}

	const StatusIcon = StatusIcons[report.status];

	return (
		<header
			className={cn(
				"flex flex-col flex-wrap items-start justify-start gap-5 sm:flex-row",
				className,
			)}
			data-slot="expenses-header"
			{...props}
		>
			<div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-zinc-800 sm:mt-0.75 md:size-10">
				<FileIcon className="size-4 text-white md:size-5" />
			</div>
			<div className="mr-auto">
				<h1 className="font-semibold text-2xl text-zinc-800">
					<span className="me-2 text-zinc-500">#{report.tag}</span>
					{report.title}
				</h1>
				<div className="mt-2 flex flex-col flex-wrap items-start justify-start gap-2 sm:flex-row sm:items-center sm:gap-3">
					<Tooltip>
						<TooltipTrigger>
							<p className="font-medium text-sm text-zinc-600">
								vor {formatDistanceToNow(report.createdAt, { locale: de })} Uhr
							</p>
						</TooltipTrigger>
						<TooltipContent>
							Erstellt am{" "}
							{format(report.createdAt, "dd MMMM yyyy, HH:mm", { locale: de })} Uhr
						</TooltipContent>
					</Tooltip>
					<p className="hidden text-sm text-zinc-500 sm:block">•</p>
					<p
						className={cn(
							"flex items-center justify-center gap-1.5 font-medium text-sm text-zinc-600",
							report.status === "ACCEPTED" && "text-green-600",
							report.status === "REJECTED" && "text-red-600",
							report.status === "NEEDS_REVISION" && "text-orange-600",
							report.status === "PENDING_APPROVAL" && "text-yellow-600",
						)}
					>
						{translateReportStatus(report.status)}
						<StatusIcon className="size-3.5" />
					</p>
					<p className="hidden text-sm text-zinc-500 sm:block">•</p>
					<p className="flex items-center justify-center gap-1.5 font-medium text-sm text-zinc-600">
						<Avatar className={"size-4"}>
							<AvatarImage src={report.owner.image ?? undefined} />
							<AvatarFallback>
								{report.owner.name.charAt(0)?.toUpperCase()}
							</AvatarFallback>
						</Avatar>
						{report.owner.name}
					</p>
				</div>
			</div>
			<div className="mt-0.75 flex flex-nowrap gap-4">
				<ReportActions report={report}>Bearbeiten</ReportActions>
				<ExportReport reportId={report.id} />
			</div>
		</header>
	);
}

function HeaderLoading({
	className,
	...props
}: React.ComponentProps<"header">) {
	return (
		<header
			className={cn("flex flex-wrap items-start justify-start gap-6", className)}
			data-slot="header-loading"
			{...props}
		>
			<Skeleton className="size-8 md:size-10" />
			<div className="grow">
				<Skeleton className="h-10 w-full max-w-96" />
				<Skeleton className="mt-2 h-6 w-full max-w-64" />
			</div>
			<Skeleton className="h-8 w-32" />
		</header>
	);
}

function ReportActions({
	report,
	...props
}: React.ComponentProps<typeof Button> & {
	report: Pick<ReviewReport, "id" | "status">;
}) {
	const utils = api.useUtils();

	const { mutate: setStatus } = api.report.transition.useMutation({
		onMutate: () => {
			toast.info("Status wird aktualisiert");
		},
		onSuccess: () => {
			toast.success("Status erfolgreich aktualisiert");
			void utils.report.review.invalidate({ id: report.id });
		},
		onError: () => {
			toast.error("Fehler beim Aktualisieren des Reports");
		},
	});

	const updateStatus = (status: ReportStatus) => {
		setStatus({
			id: report.id,
			status,
			notify:
				status === "NEEDS_REVISION" ||
				status === "ACCEPTED" ||
				status === "REJECTED",
		});
	};

	return (
		<DropdownMenu data-slot="report-actions">
			<DropdownMenuTrigger render={<Button variant={"outline"} {...props} />} />
			<DropdownMenuContent align="end" className={"w-64"}>
				<DropdownMenuGroup>
					<DropdownMenuLabel>Status ändern</DropdownMenuLabel>
					<DropdownMenuItem
						disabled={report.status === "ACCEPTED"}
						onClick={() => {
							updateStatus("ACCEPTED");
						}}
					>
						<StatusIcons.ACCEPTED /> Akzeptieren
					</DropdownMenuItem>
					<DropdownMenuItem
						disabled={report.status === "REJECTED"}
						onClick={() => {
							updateStatus("REJECTED");
						}}
					>
						<StatusIcons.REJECTED /> Ablehnen
					</DropdownMenuItem>
					<DropdownMenuItem
						disabled={report.status === "NEEDS_REVISION"}
						onClick={() => {
							updateStatus("NEEDS_REVISION");
						}}
					>
						<StatusIcons.NEEDS_REVISION /> Benötigt Revision
					</DropdownMenuItem>
					<DropdownMenuItem
						disabled={report.status === "PENDING_APPROVAL"}
						onClick={() => {
							updateStatus("PENDING_APPROVAL");
						}}
					>
						<StatusIcons.PENDING_APPROVAL /> In Bearbeitung
					</DropdownMenuItem>
				</DropdownMenuGroup>
				<DropdownMenuSeparator />
				<DropdownMenuGroup>
					<DropdownMenuItem disabled variant="destructive">
						<TrashIcon /> Antrag löschen
					</DropdownMenuItem>
				</DropdownMenuGroup>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

function ExportReport({
	className,
	reportId,
	...props
}: React.ComponentProps<typeof ButtonGroup> & { reportId: string }) {
	const createSummaryPdf = api.report.exportToPdf.useMutation({
		onMutate: () => {
			toast.info("PDF wird erstellt", {
				description: "Dies kann einige Sekunden dauern",
			});
		},
		onSuccess: (data) => {
			window.open(data.url, "_blank");
			toast.success("PDF Zusammenfassung erstellt", {
				description: "Datei wird heruntergeladen",
			});
		},
		onError: ({ message }) => {
			toast.error("Fehler beim Erstellen der PDF Zusammenfassung", {
				description: message ?? "Ein unerwarteter Fehler ist aufgetreten",
			});
		},
	});

	return (
		<ButtonGroup className={cn("", className)} data-slot="component" {...props}>
			<Button onClick={() => createSummaryPdf.mutate({ id: reportId })}>
				Exportieren
			</Button>
			<DropdownMenu>
				<DropdownMenuTrigger
					render={
						<Button size={"icon"}>
							<ChevronDownIcon />
						</Button>
					}
				/>
				<DropdownMenuContent align="end" className={"w-52"}>
					<DropdownMenuGroup>
						<DropdownMenuItem
							onClick={() => createSummaryPdf.mutate({ id: reportId })}
						>
							<FileIcon /> PDF exportieren
						</DropdownMenuItem>
						<DropdownMenuItem disabled>
							<SheetIcon /> CSV exportieren
						</DropdownMenuItem>
					</DropdownMenuGroup>
				</DropdownMenuContent>
			</DropdownMenu>
		</ButtonGroup>
	);
}

export { ExpensesHeader };
