"use client";

import type { JsonValue } from "@prisma/client/runtime/client";
import { formatDate } from "date-fns";
import {
	CarIcon,
	EllipsisVerticalIcon,
	ExternalLinkIcon,
	InfoIcon,
	PencilIcon,
	ReceiptIcon,
	Trash2Icon,
	UtensilsIcon,
} from "lucide-react";
import Link from "next/link";
import React from "react";
import { toast } from "sonner";
import { ExpenseDetails } from "@/app/(app)/admin/_components/expense-details";
import { ReportCardField } from "@/components/report-card";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardAction,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Attachment, ExpenseType } from "@/generated/prisma/client";
import { ReportStatus } from "@/generated/prisma/enums";
import type { ClientExpense } from "@/lib/types";
import { translateExpenseType } from "@/lib/utils";
import {
	foodExpenseMetaSchema,
	travelExpenseMetaSchema,
} from "@/lib/validators";
import { api } from "@/trpc/react";
import { ExpenseEditDialog } from "./expense-edit-dialog";

export function ReportExpenseCard({
	className,
	expense,
	reportStatus,
	...props
}: React.ComponentProps<typeof Card> & {
	expense: ClientExpense & { attachments: Attachment[] };
	reportStatus?: ReportStatus;
}) {
	const [detailsOpen, setDetailsOpen] = React.useState(false);
	const [editOpen, setEditOpen] = React.useState(false);
	const [deleteOpen, setDeleteOpen] = React.useState(false);

	const utils = api.useUtils();
	const deleteExpense = api.expense.delete.useMutation({
		onSuccess: () => {
			utils.expense.listForReport.invalidate({ reportId: expense.reportId });
			toast.success("Ausgabe erfolgreich gelöscht");
			setDeleteOpen(false);
		},
		onError: (error) => {
			toast.error("Fehler beim Löschen der Ausgabe", {
				description: error.message ?? "Ein unerwarteter Fehler ist aufgetreten",
			});
		},
	});

	const canModify =
		reportStatus === ReportStatus.DRAFT ||
		reportStatus === ReportStatus.NEEDS_REVISION;

	return (
		<React.Fragment>
			<Card className={className} data-slot="report-expense-card" {...props}>
				<CardHeader>
					<CardTitle className="flex items-center justify-start gap-2 [&_svg]:size-4 [&_svg]:text-muted-foreground">
						{expense.type === "RECEIPT" ? (
							<ReceiptIcon />
						) : expense.type === "TRAVEL" ? (
							<CarIcon />
						) : (
							<UtensilsIcon />
						)}
						{translateExpenseType(expense.type)}
					</CardTitle>
					<CardDescription>
						{expense.type === "RECEIPT"
							? `${expense.attachments.length} Beleg(e)`
							: metaToDescription({ type: expense.type, meta: expense.meta })}
					</CardDescription>
					<CardAction>
						<DropdownMenu>
							<DropdownMenuTrigger
								render={
									<Button
										aria-label="Open expense actions"
										size={"icon"}
										variant={"ghost"}
									>
										<EllipsisVerticalIcon />
									</Button>
								}
							/>
							<DropdownMenuContent>
								<DropdownMenuGroup>
									<DropdownMenuItem onClick={() => setDetailsOpen(true)}>
										<InfoIcon /> Details
									</DropdownMenuItem>
									{canModify && (
										<>
											<DropdownMenuSeparator />
											<DropdownMenuItem onClick={() => setEditOpen(true)}>
												<PencilIcon /> Bearbeiten
											</DropdownMenuItem>
											<DropdownMenuItem
												className="text-destructive focus:text-destructive"
												onClick={() => setDeleteOpen(true)}
											>
												<Trash2Icon /> Löschen
											</DropdownMenuItem>
										</>
									)}
								</DropdownMenuGroup>
							</DropdownMenuContent>
						</DropdownMenu>
					</CardAction>
				</CardHeader>
				<CardContent className="space-y-2 border-t pt-4">
					<ReportCardField label="Betrag" value={`${expense.amount.toFixed(2)} €`} />
					<ReportCardField
						label="Datum"
						value={formatDate(expense.startDate, "dd.MM.yyyy")}
					/>
					{expense.type === "RECEIPT" && expense.attachments.length > 0 ? (
						<div className="space-y-2 pt-4">
							<p className="font-medium text-muted-foreground text-xs">Belege</p>
							<div className="flex flex-col gap-2">
								{expense.attachments.map((attachment, index) => (
									<Link
										className="flex items-center justify-start gap-2 font-medium text-primary text-sm"
										href={`/api/attachments/${attachment.id}`}
										key={attachment.id ?? attachment.key ?? index}
										rel="noopener noreferrer"
										target="_blank"
									>
										Beleg {index + 1}
										<ExternalLinkIcon className="size-3.5" />
									</Link>
								))}
							</div>
						</div>
					) : null}
				</CardContent>
			</Card>

			<ExpenseDetails
				expense={expense}
				onOpenChange={setDetailsOpen}
				open={detailsOpen}
			/>

			<ExpenseEditDialog
				expense={expense}
				onOpenChange={setEditOpen}
				open={editOpen}
			/>

			<AlertDialog onOpenChange={setDeleteOpen} open={deleteOpen}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Ausgabe löschen?</AlertDialogTitle>
						<AlertDialogDescription>
							Möchtest du diese {translateExpenseType(expense.type)}-Ausgabe wirklich
							löschen? Diese Aktion kann nicht rückgängig gemacht werden.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Abbrechen</AlertDialogCancel>
						<AlertDialogAction
							disabled={deleteExpense.isPending}
							onClick={() => deleteExpense.mutate({ id: expense.id })}
							variant={"destructive"}
						>
							<Trash2Icon /> Endgültig löschen
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</React.Fragment>
	);
}

/**
 * Builds a human-readable description from expense metadata.
 */
const metaToDescription = ({
	type,
	meta,
}: {
	type: ExpenseType;
	meta: JsonValue;
}): string | null => {
	let desc: string = "Ungültige Ausgabe";

	if (type === "TRAVEL") {
		const result = travelExpenseMetaSchema.safeParse(meta);

		if (!result.success) {
			return null;
		}

		desc = `${result.data.from} -> ${result.data.to}`;
	}

	if (type === "FOOD") {
		const result = foodExpenseMetaSchema.safeParse(meta);

		if (!result.success) {
			return null;
		}

		desc = `${result.data.days} Tage`;
	}

	return desc;
};
