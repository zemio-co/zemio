"use client";

import type { ExpenseType, ReportStatus } from "@zemio/db";
import { format, formatDistanceToNow } from "date-fns";
import { de } from "date-fns/locale";
import {
	ArrowUpIcon,
	BadgeCheckIcon,
	BadgeXIcon,
	FilePenIcon,
	FilePlusIcon,
	FileXIcon,
	MessageSquareIcon,
	PencilIcon,
	PlusIcon,
	RefreshCcwIcon,
	SendIcon,
} from "lucide-react";
import React from "react";
import { toast } from "sonner";
import {
	InputGroup,
	InputGroupAddon,
	InputGroupButton,
	InputGroupTextarea,
} from "@/components/ui/input-group";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { StatusIcons } from "@/lib/icons";
import { cn, formatTimeElapsed, translateExpenseType } from "@/lib/utils";
import type { AuditEventDTO } from "@/server/modules/audit/audit.dto";
import { api } from "@/trpc/react";

type BaseEventProps = {
	actor: AuditEventDTO["actor"];
	createdAt: Date;
};

function EventMeta({ actor, createdAt }: BaseEventProps) {
	return (
		<div className="flex items-center gap-1.5 text-sm">
			<span className="font-medium text-slate-900">{actor.name}</span>
			<span className="text-slate-400">·</span>
			<span className="text-slate-500">{formatTimeElapsed(createdAt)}</span>
		</div>
	);
}

function ReportCreatedEvent({
	event,
	...props
}: React.ComponentProps<"div"> & { event: BaseEventProps }) {
	return (
		<EventItem {...props}>
			<EventIconColumn>
				<PlusIcon className="text-violet-600" />
			</EventIconColumn>
			<EventContent>
				<p>
					<InlineActor actor={event.actor} /> hat diesen Bericht erstellt
				</p>
				<span className="block text-slate-500">•</span>
				<EventDate date={event.createdAt} />
			</EventContent>
		</EventItem>
	);
}

function ReportUpdatedEvent({
	event,
	...props
}: React.ComponentProps<"div"> & {
	event: BaseEventProps & {
		diff: {
			before: Record<string, string | null>;
			after: Record<string, string | null>;
		};
	};
}) {
	const fieldLabels: Record<string, string> = {
		title: '"Titel"',
		description: '"Beschreibung"',
	};
	const labels = Object.keys(event.diff.after)
		.map((f) => fieldLabels[f] ?? f)
		.join(", ");

	return (
		<EventItem data-slot="report-updated-event" {...props}>
			<EventIconColumn>
				<PencilIcon className="text-slate-500" />
			</EventIconColumn>
			<EventContent>
				<p>
					<InlineActor actor={event.actor} /> hat{" "}
					<span className="font-semibold text-slate-800">{labels}</span> bearbeitet
				</p>
				<EventDate date={event.createdAt} />
			</EventContent>
		</EventItem>
	);
}

function ReportDeletedEvent({
	event,
	...props
}: React.ComponentProps<"div"> & { event: BaseEventProps }) {
	return (
		<EventItem data-slot="report-deleted-event" {...props}>
			<EventIconColumn>
				<FileXIcon className="text-red-500" />
			</EventIconColumn>
			<EventContent>
				<p>
					<InlineActor actor={event.actor} /> hat diesen Bericht gelöscht
				</p>
				<span className="block text-slate-500">•</span>
				<EventDate date={event.createdAt} />
			</EventContent>
		</EventItem>
	);
}

function ReportStatusChangedEvent({
	className,
	event,
	...props
}: React.ComponentProps<"div"> & {
	event: BaseEventProps & {
		diff: { before: { status: ReportStatus }; after: { status: ReportStatus } };
	};
}) {
	if (event.diff.after.status === "PENDING_APPROVAL") {
		return (
			<ReportSubmittedEvent className={className} event={event} {...props} />
		);
	}

	if (event.diff.after.status === "NEEDS_REVISION") {
		return (
			<ReportRevisionRequestedEvent
				className={className}
				event={event}
				{...props}
			/>
		);
	}

	if (event.diff.after.status === "ACCEPTED") {
		return <ReportAcceptedEvent className={className} event={event} {...props} />;
	}

	if (event.diff.after.status === "PAID") {
		return <ReportPaidEvent className={className} event={event} {...props} />;
	}

	if (event.diff.after.status === "REJECTED") {
		return <ReportRejectedEvent className={className} event={event} {...props} />;
	}

	return null;
}

function ReportSubmittedEvent({
	event,
	...props
}: React.ComponentProps<"div"> & {
	event: BaseEventProps & {
		diff: { before: { status: ReportStatus }; after: { status: ReportStatus } };
	};
}) {
	const resubmitted = event.diff.before.status !== "DRAFT";

	return (
		<EventItem data-slot="report-submitted-event" {...props}>
			<EventIconColumn>
				<SendIcon className="text-violet-600" />
				{resubmitted && (
					<div className="absolute right-1/8 bottom-1/8 flex size-3.5 translate-x-1/2 translate-y-1/2 items-center justify-center rounded-full bg-white">
						<RefreshCcwIcon className="size-2.5 text-slate-700" />
					</div>
				)}
			</EventIconColumn>
			<EventContent>
				<p>
					<InlineActor actor={event.actor} /> hat den Antrag{" "}
					{resubmitted && <span className="font-medium">erneut</span>} eingereicht
				</p>
				<span className="block text-slate-500">•</span>
				<EventDate date={event.createdAt} />
			</EventContent>
		</EventItem>
	);
}

function ReportRevisionRequestedEvent({
	event,
	...props
}: React.ComponentProps<"div"> & {
	event: BaseEventProps & {
		diff: { before: { status: ReportStatus }; after: { status: ReportStatus } };
	};
}) {
	return (
		<EventItem data-slot="report-revision-event" {...props}>
			<EventIconColumn>
				<RefreshCcwIcon className="text-orange-500" />
			</EventIconColumn>
			<EventContent>
				<p>
					Revision angefordert von <InlineActor actor={event.actor} />
				</p>
				<span className="block text-slate-500">•</span>
				<EventDate date={event.createdAt} />
			</EventContent>
		</EventItem>
	);
}

function ReportAcceptedEvent({
	event,
	...props
}: React.ComponentProps<"div"> & {
	event: BaseEventProps & {
		diff: { before: { status: ReportStatus }; after: { status: ReportStatus } };
	};
}) {
	return (
		<EventItem data-slot="report-accepted-event" {...props}>
			<EventIconColumn>
				<BadgeCheckIcon className="text-green-500" />
			</EventIconColumn>
			<EventContent>
				<p>
					Antrag wurde von <InlineActor actor={event.actor} /> als akzeptiert
					markiert
				</p>
				<span className="block text-slate-500">•</span>
				<EventDate date={event.createdAt} />
			</EventContent>
		</EventItem>
	);
}

function ReportPaidEvent({
	event,
	...props
}: React.ComponentProps<"div"> & {
	event: BaseEventProps & {
		diff: { before: { status: ReportStatus }; after: { status: ReportStatus } };
	};
}) {
	return (
		<EventItem data-slot="report-pail-event" {...props}>
			<EventIconColumn>
				<StatusIcons.PAID className="text-green-500" />
			</EventIconColumn>
			<EventContent>
				<p>
					Antrag wurde von <InlineActor actor={event.actor} /> als ausgezahlt
					markiert
				</p>
				<span className="block text-slate-500">•</span>
				<EventDate date={event.createdAt} />
			</EventContent>
		</EventItem>
	);
}

function ReportRejectedEvent({
	event,
	...props
}: React.ComponentProps<"div"> & {
	event: BaseEventProps & {
		diff: { before: { status: ReportStatus }; after: { status: ReportStatus } };
	};
}) {
	return (
		<EventItem data-slot="report-rejected-event" {...props}>
			<EventIconColumn>
				<BadgeXIcon className="text-red-500" />
			</EventIconColumn>
			<EventContent>
				<p>
					Antrag wurde von <InlineActor actor={event.actor} /> abgelehnt
				</p>
				<span className="block text-slate-500">•</span>
				<EventDate date={event.createdAt} />
			</EventContent>
		</EventItem>
	);
}

function ReportCommentAddedEvent({
	event,
	...props
}: React.ComponentProps<"div"> & {
	event: BaseEventProps & { text: string };
}) {
	return (
		<EventItem data-slot="report-comment-event" {...props}>
			<EventIconColumn>
				<MessageSquareIcon className="text-slate-500" />
			</EventIconColumn>
			<EventContent className="grow flex-col gap-y-2">
				<div className="flex flex-wrap gap-x-1 gap-y-0.5">
					<p>
						<InlineActor actor={event.actor} /> kommentierte
					</p>
					<span className="block text-slate-500">•</span>
					<EventDate date={event.createdAt} />
				</div>
				<div className="w-full max-w-xl rounded-lg rounded-tl-none border border-slate-200 p-4 text-slate-600 text-sm">
					<p>{event.text}</p>
				</div>
			</EventContent>
		</EventItem>
	);
}

function ExpenseAddedEvent({
	event,
	...props
}: React.ComponentProps<"div"> & {
	event: BaseEventProps & {
		type: ExpenseType;
	};
}) {
	return (
		<EventItem data-slot="expense-added-event" {...props}>
			<EventIconColumn>
				<FilePlusIcon className="text-blue-500" />
			</EventIconColumn>
			<EventContent>
				<p>
					<InlineActor actor={event.actor} /> hat eine Ausgabe vom Typ{" "}
					<span className="font-semibold text-slate-800">
						{translateExpenseType(event.type)}
					</span>{" "}
					hinzugefügt
				</p>
				<span className="block text-slate-500">•</span>
				<EventDate date={event.createdAt} />
			</EventContent>
		</EventItem>
	);
}

function ExpenseUpdatedEvent({
	event,
	...props
}: React.ComponentProps<"div"> & {
	event: BaseEventProps;
}) {
	return (
		<EventItem data-slot="expense-updated-event" {...props}>
			<EventIconColumn>
				<FilePenIcon className="text-blue-500" />
			</EventIconColumn>
			<EventContent>
				<p>
					<InlineActor actor={event.actor} />
					hat eine Ausgabe aktualisiert
				</p>
				<span className="block text-slate-500">•</span>
				<EventDate date={event.createdAt} />
			</EventContent>
		</EventItem>
	);
}

function ExpenseDeletedEvent({
	event,
	...props
}: React.ComponentProps<"div"> & {
	event: BaseEventProps & {
		type: ExpenseType;
	};
}) {
	return (
		<EventItem data-slot="expense-deleted-event" {...props}>
			<EventIconColumn>
				<FileXIcon className="text-red-500" />
			</EventIconColumn>
			<EventContent>
				<p>
					<InlineActor actor={event.actor} /> hat eine Ausgabe entfernt
				</p>
				<span className="block text-slate-500">•</span>
				<EventDate date={event.createdAt} />
			</EventContent>
		</EventItem>
	);
}

function AttachmentAddedEvent({
	actor,
	createdAt,
	fileName,
}: BaseEventProps & { fileName: string }) {
	return (
		<div>
			<EventMeta actor={actor} createdAt={createdAt} />
			<p className="text-slate-700 text-sm">
				hat eine Datei hinzugefügt: <span className="font-medium">{fileName}</span>
			</p>
		</div>
	);
}

function AttachmentDeletedEvent({
	actor,
	createdAt,
	fileName,
}: BaseEventProps & { fileName: string }) {
	return (
		<div>
			<EventMeta actor={actor} createdAt={createdAt} />
			<p className="text-slate-700 text-sm">
				hat eine Datei entfernt: <span className="font-medium">{fileName}</span>
			</p>
		</div>
	);
}

function UnknownEvent({
	actor,
	createdAt,
	action,
}: BaseEventProps & { action: string }) {
	return (
		<div>
			<EventMeta actor={actor} createdAt={createdAt} />
			<p className="text-slate-500 text-sm">{action}</p>
		</div>
	);
}

// -------- BEGIN EVENT PRIMITIVES ----------------------------------------------------------------------------------------

function EventItem({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			className={cn("group/item flex gap-4", className)}
			data-slot="event-item"
			{...props}
		/>
	);
}

function EventContent({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			className={cn(
				"flex flex-wrap gap-x-1 gap-y-0.5 pb-3 text-xs group-last/item:pb-0 [&_p:not([class*='text-'])]:text-zinc-600",
				className,
			)}
			data-slot="event-content"
			{...props}
		/>
	);
}

function EventDate({
	className,
	date,
	...props
}: React.ComponentProps<typeof TooltipTrigger> & {
	date: Date;
}) {
	return (
		<Tooltip data-slot="event-date">
			<TooltipTrigger
				className={cn("block text-slate-500 text-xs", className)}
				{...props}
			>
				{formatDistanceToNow(date, {
					locale: de,
					addSuffix: true,
				})}
			</TooltipTrigger>
			<TooltipContent>{format(date, "dd.MM.yyyy, HH:mm:ss")}</TooltipContent>
		</Tooltip>
	);
}

function EventIconColumn({
	className,
	children,
	...props
}: React.ComponentProps<"div">) {
	return (
		<div
			className={cn(
				"flex shrink-0 flex-col items-center gap-1 self-stretch pt-0.5 [&_svg:not([class*='size-'])]:size-full",
				className,
			)}
			data-slot="event-icon-column"
			{...props}
		>
			<div className="relative size-3.5 shrink-0">{children}</div>
			<div className="w-px flex-1 border-slate-200 border-r group-last/item:hidden" />
		</div>
	);
}

function InlineActor({
	actor,
	className,
	...props
}: React.ComponentProps<"span"> & {
	actor: {
		image: string | null;
		name: string;
	};
}) {
	return (
		<Tooltip>
			<TooltipTrigger>
				<span className={cn("font-semibold text-slate-800", className)} {...props}>
					<span>{actor.name.split(" ")[0]}</span>
				</span>
			</TooltipTrigger>
			<TooltipContent>{actor.name}</TooltipContent>
		</Tooltip>
	);
}

// -------- END EVENT PRIMITIVES ------------------------------------------------------------------------------------------

function ActivityCommentField({
	className,
	reportId,
	...props
}: React.ComponentProps<"div"> & {
	reportId: string;
}) {
	const utils = api.useUtils();
	const [value, setValue] = React.useState<string>("");

	const commentMutation = api.audit.addComment.useMutation({
		onError: (error) => {
			toast.error("Fehler beim Senden der Nachricht", {
				description: error.message ?? "Ein unbekannter Fehler ist aufgetreten",
			});
		},
		onSuccess() {
			setValue("");
			utils.audit.history.invalidate({ id: reportId });
		},
	});

	const canSend = value !== "" && !commentMutation.isPending;

	const handleSend = () => {
		commentMutation.mutate({
			id: reportId,
			text: value,
		});
	};

	const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
		if (e.key === "Enter" && e.ctrlKey && canSend) {
			e.preventDefault();
			handleSend();
		}
	};

	return (
		<div
			className={cn("", className)}
			data-slot="activity-comment-field"
			{...props}
		>
			<InputGroup>
				<InputGroupTextarea
					disabled={commentMutation.isPending}
					onChange={(e) => setValue(e.currentTarget.value)}
					onKeyDown={handleKeyDown}
					placeholder="Schreibe einen Kommentar"
					value={value}
				/>
				<InputGroupAddon align={"block-end"} className="justify-end">
					<InputGroupButton
						disabled={!canSend}
						onClick={handleSend}
						variant={"default"}
					>
						<ArrowUpIcon />
					</InputGroupButton>
				</InputGroupAddon>
			</InputGroup>
		</div>
	);
}

function AuditEventItem({ event }: { event: AuditEventDTO }) {
	const base = { actor: event.actor, createdAt: event.createdAt };

	switch (event.action) {
		case "report.created":
			return <ReportCreatedEvent event={base} />;
		case "report.updated":
			return (
				<ReportUpdatedEvent
					event={{
						...base,
						diff: event.diff as {
							before: Record<string, string | null>;
							after: Record<string, string | null>;
						},
					}}
				/>
			);
		case "report.deleted":
			return <ReportDeletedEvent event={base} />;
		case "report.status_changed":
			return (
				<ReportStatusChangedEvent
					event={{
						...base,
						diff: event.diff as {
							before: { status: ReportStatus };
							after: { status: ReportStatus };
						},
					}}
				/>
			);
		case "report.comment_added":
			return (
				<ReportCommentAddedEvent
					event={{ ...base, text: (event.payload as { text: string }).text }}
				/>
			);
		case "expense.added":
			return (
				<ExpenseAddedEvent
					event={{ ...base, type: (event.payload as { type: ExpenseType }).type }}
				/>
			);
		case "expense.updated":
			return <ExpenseUpdatedEvent event={{ ...base }} />;
		case "expense.deleted":
			return (
				<ExpenseDeletedEvent
					event={{
						...base,
						type: (event.diff as { before: { type: ExpenseType } }).before.type,
					}}
				/>
			);
		case "attachment.added":
			return (
				<AttachmentAddedEvent
					fileName={(event.payload as { fileName: string }).fileName}
					{...base}
				/>
			);
		case "attachment.deleted":
			return (
				<AttachmentDeletedEvent
					fileName={
						(event.diff as { before: { originalName: string } }).before.originalName
					}
					{...base}
				/>
			);
		default:
			return <UnknownEvent action={event.action} {...base} />;
	}
}

function EventHistory({
	className,
	items,
	...props
}: React.ComponentProps<"div"> & {
	items: AuditEventDTO[];
}) {
	return (
		<div
			className={cn("flex flex-col gap-1", className)}
			data-slot="event-history"
			{...props}
		>
			{items.map((event) => (
				<AuditEventItem event={event} key={event.id} />
			))}
		</div>
	);
}

function ReportActivityHeader({
	className,
	...props
}: React.ComponentProps<"div">) {
	return (
		<div
			className={cn("", className)}
			data-slot="report-activity-header"
			{...props}
		>
			<h3 className="font-semibold text-lg text-slate-800">Aktivität</h3>
		</div>
	);
}

function ReportActivity({
	className,
	reportId,
	...props
}: React.ComponentProps<"section"> & {
	reportId: string;
}) {
	const eventHistoryQuery = api.audit.history.useQuery({ id: reportId });

	if (eventHistoryQuery.isPending) return;

	if (eventHistoryQuery.error) {
		return <p>Error: {eventHistoryQuery.error.message}</p>;
	}

	const { data } = eventHistoryQuery;

	return (
		<section className={cn("", className)} data-slot="report-activity" {...props}>
			<ReportActivityHeader className="mb-6" />
			<EventHistory items={data.items} />
			<ActivityCommentField className="mt-8" reportId={reportId} />
		</section>
	);
}

export { ReportActivity };
