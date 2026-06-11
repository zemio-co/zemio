"use client";

import { NumberField } from "@base-ui/react";
import { useForm } from "@tanstack/react-form";
import { keepPreviousData } from "@tanstack/react-query";
import type { Attachment, ExpenseType } from "@zemio/db";
import { formatDate, isValid, parse } from "date-fns";
import { DownloadIcon, ImageIcon, XIcon } from "lucide-react";
import { toast } from "sonner";
import { DatePicker } from "@/components/date-picker";
import { Button } from "@/components/ui/button";
import {
	Field,
	FieldDescription,
	FieldGroup,
	FieldLabel,
} from "@/components/ui/field";
import {
	InputGroup,
	InputGroupAddon,
	InputGroupInput,
} from "@/components/ui/input-group";
import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { UploadDropzone } from "@/components/ui/upload-dropzone";
import { usePresignedUpload } from "@/lib/use-presigned-upload";
import { cn, formatBytes, renameFileWithHash } from "@/lib/utils";
import { api } from "@/trpc/react";

const MAX_ATTACHMENTS = 5;

function ReportUpdateExpense({
	expenseId,
	expenseType,
	canModify,
	children,
	...props
}: Omit<React.ComponentProps<typeof Sheet>, "children"> & {
	expenseId: string;
	expenseType: ExpenseType;
	canModify: boolean;
	children?: React.ReactNode;
}) {
	return (
		<Sheet {...props}>
			{children}
			<SheetContent className={"data-[side=right]:sm:max-w-2xl"}>
				<UpdateExpenseContent
					canModify={canModify}
					expenseId={expenseId}
					expenseType={expenseType}
				/>
			</SheetContent>
		</Sheet>
	);
}

function ReportUpdateExpenseTrigger({
	className,
	...props
}: React.ComponentProps<typeof SheetTrigger>) {
	return <SheetTrigger className={cn("", className)} {...props} />;
}

function UpdateExpenseContent({
	className,
	expenseId,
	expenseType,
	canModify,
	...props
}: React.ComponentProps<"div"> & {
	expenseId: string;
	expenseType: ExpenseType;
	canModify: boolean;
}) {
	return (
		<div
			className={cn("", className)}
			data-slot="update-expense-content"
			{...props}
		>
			<SheetHeader>
				<SheetTitle>Ausgabe</SheetTitle>
			</SheetHeader>
			<UpdateExpenseForm
				canModify={canModify}
				expenseId={expenseId}
				expenseType={expenseType}
			/>
			{expenseType === "RECEIPT" && (
				<UpdateExpenseAttachments canModify={canModify} expenseId={expenseId} />
			)}
		</div>
	);
}

function UpdateExpenseForm({
	expenseId,
	expenseType,
	canModify,
}: {
	expenseId: string;
	expenseType: ExpenseType;
	canModify: boolean;
}) {
	const { data, isPending, error } = api.expense.getById.useQuery(
		{ id: expenseId },
		{ placeholderData: keepPreviousData },
	);

	if (expenseType !== "RECEIPT" || !canModify) {
		return null;
	}

	if (isPending) {
		return (
			<div className="space-y-4 p-4">
				<Skeleton className="h-20 w-full" />
				<Skeleton className="h-10 w-full" />
				<Skeleton className="h-10 w-full" />
			</div>
		);
	}

	if (error || !data) {
		return (
			<p className="p-4 text-destructive text-sm">
				{error?.message ?? "Ausgabe konnte nicht geladen werden"}
			</p>
		);
	}

	return <ReceiptUpdateForm expense={data} />;
}

function ReceiptUpdateForm({
	expense,
}: {
	expense: {
		id: string;
		reportId: string;
		description: string | null;
		amount: unknown;
		startDate: Date;
		endDate: Date;
	};
}) {
	const utils = api.useUtils();
	const updateExpense = api.expense.update.useMutation({
		onSuccess: () => {
			utils.expense.listForReport.invalidate({ reportId: expense.reportId });
			utils.expense.getById.invalidate({
				id: expense.id,
			});
			toast.success("Ausgabe erfolgreich aktualisiert");
		},
		onError: (error) => {
			toast.error("Fehler beim Aktualisieren der Ausgabe", {
				description: error.message ?? "Ein unerwarteter Fehler ist aufgetreten",
			});
		},
	});

	const form = useForm({
		defaultValues: {
			description: expense.description ?? "",
			amount: Number(expense.amount),
			startDate: formatDate(expense.startDate, "dd.MM.yyyy"),
			endDate: formatDate(expense.endDate, "dd.MM.yyyy"),
		},
		onSubmit: ({ value }) => {
			const startDate = parse(value.startDate, "dd.MM.yyyy", new Date());
			const endDate = parse(value.endDate, "dd.MM.yyyy", new Date());

			updateExpense.mutate({
				id: expense.id,
				description: value.description,
				amount: value.amount,
				startDate: isValid(startDate) ? startDate : undefined,
				endDate: isValid(endDate) ? endDate : undefined,
			});
		},
	});

	return (
		<form
			className="border-b p-4"
			onSubmit={(e) => {
				e.preventDefault();
				form.handleSubmit();
			}}
		>
			<FieldGroup className="grid gap-4 md:grid-cols-2">
				<form.Field name="description">
					{(field) => (
						<Field className="md:col-span-2">
							<FieldLabel htmlFor={field.name}>Beschreibung</FieldLabel>
							<Textarea
								autoComplete="off"
								id={field.name}
								name={field.name}
								onBlur={field.handleBlur}
								onChange={(e) => field.handleChange(e.target.value)}
								placeholder="Verpflegung Weihnachtsfeier"
								value={field.state.value}
							/>
							<FieldDescription>
								Beschreibung der Ausgabe oder Kommentar
							</FieldDescription>
						</Field>
					)}
				</form.Field>

				<form.Field name="startDate">
					{(field) => (
						<Field>
							<FieldLabel htmlFor={field.name}>Startdatum</FieldLabel>
							<DatePicker
								id={field.name}
								name={field.name}
								onBlur={field.handleBlur}
								onChange={(date) => field.handleChange(date.target.value)}
								placeholder="01.01.2026"
								value={field.state.value}
							/>
						</Field>
					)}
				</form.Field>

				<form.Field name="endDate">
					{(field) => (
						<Field>
							<FieldLabel htmlFor={field.name}>Enddatum</FieldLabel>
							<DatePicker
								id={field.name}
								name={field.name}
								onBlur={field.handleBlur}
								onChange={(date) => field.handleChange(date.target.value)}
								placeholder="01.01.2026"
								value={field.state.value}
							/>
						</Field>
					)}
				</form.Field>

				<form.Field name="amount">
					{(field) => (
						<Field className="md:col-span-2">
							<FieldLabel htmlFor={field.name}>Betrag</FieldLabel>
							<NumberField.Root
								format={{
									style: "decimal",
									minimumFractionDigits: 2,
									maximumFractionDigits: 2,
								}}
								locale="de-DE"
								onValueChange={(value) => field.handleChange(value ?? 0)}
								value={field.state.value}
							>
								<NumberField.Group>
									<InputGroup className="overflow-hidden opacity-100!">
										<NumberField.Input
											render={
												<InputGroupInput
													autoComplete="off"
													id={field.name}
													inputMode="decimal"
													name={field.name}
													placeholder="0,00"
												/>
											}
										/>
										<InputGroupAddon
											align="inline-end"
											className="flex w-8 items-center justify-center overflow-hidden border-l bg-muted p-2"
										>
											<span>€</span>
										</InputGroupAddon>
									</InputGroup>
								</NumberField.Group>
							</NumberField.Root>
						</Field>
					)}
				</form.Field>

				<Button
					className="md:col-span-2"
					disabled={updateExpense.isPending}
					type="submit"
				>
					{updateExpense.isPending ? "Wird gespeichert…" : "Speichern"}
				</Button>
			</FieldGroup>
		</form>
	);
}

function UpdateExpenseAttachments({
	className,
	expenseId,
	canModify,
	...props
}: React.ComponentProps<"div"> & {
	expenseId: string;
	canModify: boolean;
}) {
	const { isPending, data, error } = api.attachment.listForExpense.useQuery({
		expenseId,
	});

	if (isPending) {
		return (
			<div
				className={cn("p-4", className)}
				data-slot="update-expense-attachments"
				{...props}
			>
				<p className="font-semibold text-base text-zinc-800">Anhänge</p>
				<div className="mt-4">
					<Skeleton className="h-20 w-full" />
				</div>
			</div>
		);
	}

	if (!data || error) {
		return (
			<div
				className={cn("p-4", className)}
				data-slot="update-expense-attachments"
				{...props}
			>
				<p className="font-semibold text-base text-zinc-800">Anhänge</p>
				<div className="mt-4 flex flex-col items-center justify-center rounded-md border border-dashed px-4 py-8">
					<p className="font-medium text-destructive text-sm">
						Fehler beim Laden der Anhänge
					</p>
				</div>
			</div>
		);
	}

	const remainingSlots = MAX_ATTACHMENTS - data.length;

	return (
		<div
			className={cn("p-4", className)}
			data-slot="update-expense-attachments"
			{...props}
		>
			<p className="font-semibold text-base text-zinc-800">Anhänge</p>

			{data.length > 0 ? (
				<div className="mt-4 space-y-3">
					{data.map((attachment) => (
						<ReportExpenseAttachmentRow
							attachment={attachment}
							expenseId={expenseId}
							key={attachment.id}
						/>
					))}
				</div>
			) : (
				<p className="mt-4 text-muted-foreground text-sm">
					Keine Anhänge vorhanden
				</p>
			)}

			{canModify && remainingSlots > 0 && (
				<AttachmentUploadSection
					expenseId={expenseId}
					remainingSlots={remainingSlots}
				/>
			)}
		</div>
	);
}

function AttachmentUploadSection({
	expenseId,
	remainingSlots,
}: {
	expenseId: string;
	remainingSlots: number;
}) {
	const utils = api.useUtils();
	const uploader = usePresignedUpload();
	const deletePendingUploads = api.attachment.deletePendingUploads.useMutation();
	const addToExpense = api.attachment.addToExpense.useMutation({
		onSuccess: () => {
			utils.attachment.listForExpense.invalidate({ expenseId });
			toast.success("Anhänge erfolgreich hinzugefügt");
		},
		onError: (error) => {
			toast.error("Fehler beim Hinzufügen der Anhänge", {
				description: error.message ?? "Ein unerwarteter Fehler ist aufgetreten",
			});
		},
	});

	const isPending = uploader.isPending || addToExpense.isPending;

	async function handleFiles(files: File[]) {
		const timestamp = Date.now();
		const renamedFiles = await Promise.all(
			files.map((file) => renameFileWithHash(file, expenseId, timestamp)),
		);

		const { failedFiles, files: uploadedFiles } =
			await uploader.upload(renamedFiles);

		if (failedFiles.length > 0) {
			const keys = uploadedFiles.map((f) => f.objectInfo.key);
			if (keys.length > 0) {
				await deletePendingUploads.mutateAsync({ keys }).catch(() => {});
			}
			toast.error("Upload fehlgeschlagen", {
				description: "Nicht alle Dateien konnten hochgeladen werden",
			});
			return;
		}

		const attachments = uploadedFiles.map((uploadedFile, index) => {
			const original = files[index];
			if (!original) {
				throw new Error("Upload result count does not match selected file count");
			}
			return {
				key: uploadedFile.objectInfo.key,
				size: original.size,
				originalName: original.name,
			};
		});

		addToExpense.mutate({ expenseId, attachments });
	}

	return (
		<div className="mt-6">
			<p className="mb-3 font-semibold text-base text-zinc-800">
				Anhang hinzufügen
			</p>
			<UploadDropzone
				accept={{
					"image/*": [],
					"application/pdf": [".pdf"],
				}}
				control={{
					upload: async () => ({ files: [], failedFiles: [] }),
					isPending,
				}}
				description={{
					maxFiles: remainingSlots,
					maxFileSize: "5MB",
					fileTypes: "images and PDFs",
				}}
				uploadOverride={handleFiles}
			/>
		</div>
	);
}

function ReportExpenseAttachmentRow({
	className,
	attachment,
	expenseId,
	...props
}: React.ComponentProps<"li"> & {
	attachment: Attachment;
	expenseId: string;
}) {
	const utils = api.useUtils();
	const downloadMutation = api.attachment.getDownloadUrl.useMutation();
	const deleteMutation = api.attachment.delete.useMutation({
		onSuccess: () => {
			utils.attachment.listForExpense.invalidate({ expenseId });
			toast.success("Anhang erfolgreich gelöscht");
		},
		onError: (error) => {
			toast.error("Fehler beim Löschen des Anhangs", {
				description: error.message ?? "Ein unerwarteter Fehler ist aufgetreten",
			});
		},
	});

	function handleDownload() {
		toast.promise(
			downloadMutation.mutateAsync({ id: attachment.id }).then((result) => {
				window.location.href = result.url;
			}),
			{
				loading: "Download wird vorbereitet…",
				success: "Download gestartet",
				error: "Download fehlgeschlagen",
			},
		);
	}

	return (
		<li
			className={cn("flex items-center justify-start gap-4", className)}
			data-slot="report-expense-attachment-row"
			{...props}
		>
			<div className="w-fit rounded-md bg-zinc-100 p-2">
				<ImageIcon className="size-4 text-zinc-600" />
			</div>
			<div>
				<p className="font-medium text-sm text-zinc-800">
					{attachment.originalName}
				</p>
				<p className="text-muted-foreground text-xs">
					{formatBytes(Number(attachment.size))}
				</p>
			</div>
			<Button
				className={"ml-auto"}
				disabled={downloadMutation.isPending || deleteMutation.isPending}
				onClick={handleDownload}
				size={"icon-sm"}
				variant="ghost"
			>
				<DownloadIcon />
			</Button>
			<Button
				disabled={deleteMutation.isPending}
				onClick={() => deleteMutation.mutate({ id: attachment.id })}
				size={"icon-sm"}
				variant={"ghost"}
			>
				<XIcon />
			</Button>
		</li>
	);
}

export { ReportUpdateExpense, ReportUpdateExpenseTrigger };
