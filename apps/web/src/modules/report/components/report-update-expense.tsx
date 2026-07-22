"use client";

import { NumberField } from "@base-ui/react";
import { useForm } from "@tanstack/react-form";
import { keepPreviousData } from "@tanstack/react-query";
import type { Attachment } from "@zemio/db";
import { formatDate, isValid, parse } from "date-fns";
import { DownloadIcon, ImageIcon, XIcon } from "lucide-react";
import { useTranslations } from "next-intl";
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
import { Separator } from "@/components/ui/separator";
import {
	Sheet,
	SheetBody,
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
import type { ExpenseByIdDTO } from "@/server/modules/expense";
import { api } from "@/trpc/react";

const MAX_ATTACHMENTS = 5;

function ReportUpdateExpense({
	expenseId,
	children,
	...props
}: Omit<React.ComponentProps<typeof Sheet>, "children"> & {
	expenseId: string;
	children?: React.ReactNode;
}) {
	return (
		<Sheet {...props}>
			{children}
			<SheetContent className={"data-[side=right]:sm:max-w-2xl"}>
				<UpdateExpenseContent expenseId={expenseId} />
			</SheetContent>
		</Sheet>
	);
}

function ReportUpdateExpenseTrigger({
	...props
}: React.ComponentProps<typeof Button>) {
	return <SheetTrigger render={<Button {...props} />} />;
}

function UpdateExpenseContent({
	className,
	expenseId,
	...props
}: React.ComponentProps<"div"> & {
	expenseId: string;
}) {
	const t = useTranslations("modules.report.updateExpense");
	const expenseQuery = api.expense.byId.useQuery(
		{ id: expenseId },
		{
			placeholderData: keepPreviousData,
		},
	);

	if (expenseQuery.isPending) {
		return (
			<div>
				<SheetHeader>{t("sheetTitle")}</SheetHeader>
				<SheetBody>
					<Skeleton className="h-24" />
				</SheetBody>
			</div>
		);
	}

	if (expenseQuery.error) {
		return (
			<div>
				<SheetHeader>{t("sheetTitle")}</SheetHeader>
				<SheetBody>
					<p>{t("loadError")}</p>
				</SheetBody>
			</div>
		);
	}

	const { data: expense } = expenseQuery;

	return (
		<div
			className={cn("", className)}
			data-slot="update-expense-content"
			{...props}
		>
			<SheetHeader>
				<SheetTitle>{t("sheetTitle")}</SheetTitle>
			</SheetHeader>
			<SheetBody className="min-h-0">
				{expense.type === "RECEIPT" && (
					<>
						<ReceiptUpdateForm expense={expense} />
						<Separator className={"my-8"} />
						<UpdateExpenseAttachments expenseId={expenseId} />
					</>
				)}
			</SheetBody>
		</div>
	);
}

function ReceiptUpdateForm({ expense }: { expense: ExpenseByIdDTO }) {
	const t = useTranslations("modules.report.updateExpense");
	const tCommon = useTranslations("modules.report.common");
	const utils = api.useUtils();
	const updateExpense = api.expense.update.useMutation({
		onSuccess: () => {
			utils.expense.list.invalidate({ reportId: expense.reportId });
			utils.expense.byId.invalidate({
				id: expense.id,
			});
			toast.success(t("toasts.updateSuccess"));
		},
		onError: (error) => {
			toast.error(t("toasts.updateErrorTitle"), {
				description: error.message ?? tCommon("toasts.unexpectedError"),
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
			className=""
			onSubmit={(e) => {
				e.preventDefault();
				form.handleSubmit();
			}}
		>
			<FieldGroup className="grid gap-4 md:grid-cols-2">
				<form.Field name="description">
					{(field) => (
						<Field className="md:col-span-2">
							<FieldLabel htmlFor={field.name}>
								{tCommon("fields.description")}
							</FieldLabel>
							<Textarea
								autoComplete="off"
								id={field.name}
								name={field.name}
								onBlur={field.handleBlur}
								onChange={(e) => field.handleChange(e.target.value)}
								placeholder={tCommon("fields.descriptionPlaceholder")}
								value={field.state.value}
							/>
							<FieldDescription>
								{tCommon("fields.descriptionHelper")}
							</FieldDescription>
						</Field>
					)}
				</form.Field>

				<form.Field name="startDate">
					{(field) => (
						<Field>
							<FieldLabel htmlFor={field.name}>
								{tCommon("fields.startDate")}
							</FieldLabel>
							<DatePicker
								id={field.name}
								name={field.name}
								onBlur={field.handleBlur}
								onChange={(date) => field.handleChange(date.target.value)}
								placeholder={tCommon("fields.datePlaceholder")}
								value={field.state.value}
							/>
						</Field>
					)}
				</form.Field>

				<form.Field name="endDate">
					{(field) => (
						<Field>
							<FieldLabel htmlFor={field.name}>{tCommon("fields.endDate")}</FieldLabel>
							<DatePicker
								id={field.name}
								name={field.name}
								onBlur={field.handleBlur}
								onChange={(date) => field.handleChange(date.target.value)}
								placeholder={tCommon("fields.datePlaceholder")}
								value={field.state.value}
							/>
						</Field>
					)}
				</form.Field>

				<form.Field name="amount">
					{(field) => (
						<Field className="md:col-span-2">
							<FieldLabel htmlFor={field.name}>{tCommon("fields.amount")}</FieldLabel>
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
					{updateExpense.isPending ? t("saving") : t("save")}
				</Button>
			</FieldGroup>
		</form>
	);
}

function UpdateExpenseAttachments({
	className,
	expenseId,
	...props
}: React.ComponentProps<"div"> & {
	expenseId: string;
}) {
	const t = useTranslations("modules.report.updateExpense.attachments");
	const { isPending, data, error } = api.attachment.list.useQuery({
		id: expenseId,
	});

	if (isPending) {
		return (
			<div
				className={cn("p-4", className)}
				data-slot="update-expense-attachments"
				{...props}
			>
				<p className="font-semibold text-base text-zinc-800">{t("header")}</p>
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
				<p className="font-semibold text-base text-zinc-800">{t("header")}</p>
				<div className="mt-4 flex flex-col items-center justify-center rounded-md border border-dashed px-4 py-8">
					<p className="font-medium text-destructive text-sm">{t("loadError")}</p>
				</div>
			</div>
		);
	}

	const remainingSlots = MAX_ATTACHMENTS - data.length;

	return (
		<div
			className={cn("", className)}
			data-slot="update-expense-attachments"
			{...props}
		>
			<p className="font-semibold text-base text-zinc-800">{t("header")}</p>

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
				<p className="mt-4 text-muted-foreground text-sm">{t("empty")}</p>
			)}

			{remainingSlots > 0 && (
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
	const t = useTranslations("modules.report.updateExpense.attachments");
	const tCommon = useTranslations("modules.report.common");
	const utils = api.useUtils();
	const uploader = usePresignedUpload();
	const deletePendingUploads = api.attachment.deletePendingUploads.useMutation();
	const addToExpense = api.attachment.addToExpense.useMutation({
		onSuccess: () => {
			utils.attachment.list.invalidate({ id: expenseId });
			toast.success(t("toasts.addSuccess"));
		},
		onError: (error) => {
			toast.error(t("toasts.addErrorTitle"), {
				description: error.message ?? tCommon("toasts.unexpectedError"),
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
				try {
					await deletePendingUploads.mutateAsync({ keys });
				} catch {
					toast.error(tCommon("toasts.uploadFailedTitle"), {
						description: tCommon("toasts.uploadCleanupFailedDescription"),
					});
					return;
				}
			}
			toast.error(tCommon("toasts.uploadFailedTitle"), {
				description: tCommon("toasts.uploadPartialFailureDescription"),
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

		addToExpense.mutate({ id: expenseId, attachments });
	}

	return (
		<div className="mt-6">
			<p className="mb-3 font-semibold text-base text-zinc-800">
				{t("addHeader")}
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
	const t = useTranslations("modules.report.updateExpense.attachments");
	const tCommon = useTranslations("modules.report.common");
	const utils = api.useUtils();
	const downloadMutation = api.attachment.getDownloadUrl.useMutation();
	const deleteMutation = api.attachment.delete.useMutation({
		onSuccess: () => {
			utils.attachment.list.invalidate({ id: expenseId });
			toast.success(t("toasts.deleteSuccess"));
		},
		onError: (error) => {
			toast.error(t("toasts.deleteErrorTitle"), {
				description: error.message ?? tCommon("toasts.unexpectedError"),
			});
		},
	});

	function handleDownload() {
		toast.promise(
			downloadMutation.mutateAsync({ id: attachment.id }).then((result) => {
				window.location.href = result.url;
			}),
			{
				loading: tCommon("toasts.downloadPreparing"),
				success: tCommon("toasts.downloadStarted"),
				error: t("toasts.downloadFailed"),
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
