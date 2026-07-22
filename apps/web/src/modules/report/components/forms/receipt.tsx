"use client";

import { NumberField } from "@base-ui/react";
import { useForm } from "@tanstack/react-form";
import { formatDate } from "date-fns";
import { XIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import z from "zod";
import { DatePicker } from "@/components/date-picker";
import { Button } from "@/components/ui/button";
import {
	Field,
	FieldDescription,
	FieldError,
	FieldGroup,
	FieldLabel,
} from "@/components/ui/field";
import {
	InputGroup,
	InputGroupAddon,
	InputGroupInput,
} from "@/components/ui/input-group";
import { SheetBody, SheetFooter } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { UploadDropzone } from "@/components/ui/upload-dropzone";
import { usePresignedUpload } from "@/lib/use-presigned-upload";
import { formatBytes, renameFileWithHash } from "@/lib/utils";
import { baseCreateExpenseSchema } from "@/lib/validators";
import { api } from "@/trpc/react";

export function CreateReceiptExpenseForm({
	reportId,
	onSuccess,
	...props
}: React.ComponentProps<"form"> & {
	reportId: string;
	onSuccess?: () => void;
}) {
	const t = useTranslations("modules.report.receiptExpenseForm");
	const tCommon = useTranslations("modules.report.common");
	const router = useRouter();
	const utils = api.useUtils();
	const deletePendingUploads = api.attachment.deletePendingUploads.useMutation();
	const createReceipt = api.expense.createReceipt.useMutation({
		onSuccess: () => {
			utils.expense.invalidate();
			toast.success(t("toasts.createSuccess"));
			onSuccess?.();
		},
		onError: (error) => {
			toast.error(t("toasts.createErrorTitle"), {
				description: error.message ?? tCommon("toasts.unexpectedError"),
			});
		},
	});

	const form = useForm({
		defaultValues: {
			description: "",
			amount: 0,
			startDate: formatDate(new Date(), "dd.MM.yyyy"),
			endDate: formatDate(new Date(), "dd.MM.yyyy"),
			type: "RECEIPT",
			reportId,
			files: [] as File[],
		},
		validators: {
			// Only validates fields that are tracked in the form.
			// The attachments payload is built imperatively in onSubmit after upload
			// and is validated server-side by the TRPC router.
			onSubmit: baseCreateExpenseSchema.and(z.object({ files: z.file().array() })),
		},
		onSubmit: async ({ value }) => {
			// Rename files with unique hash before upload
			const timestamp = Date.now();
			const originalFiles = value.files;
			const renamedFiles = await Promise.all(
				originalFiles.map((file) => renameFileWithHash(file, reportId, timestamp)),
			);

			const { failedFiles, files } = await uploader.upload(renamedFiles);

			if (failedFiles.length > 0) {
				const uploadedKeys = files.map((file) => file.objectInfo.key);
				if (uploadedKeys.length > 0) {
					try {
						await deletePendingUploads.mutateAsync({
							keys: uploadedKeys,
						});
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

			const attachments = files.map((uploadedFile, index) => {
				const original = originalFiles[index];
				// originalFiles[index] is always defined here: the length guard above
				// ensures files.length === originalFiles.length, but TypeScript cannot
				// narrow that from a length comparison alone.
				if (!original) {
					throw new Error("Upload result count does not match selected file count");
				}
				return {
					key: uploadedFile.objectInfo.key,
					size: original.size,
					originalName: original.name,
				};
			});

			createReceipt.mutate({
				amount: value.amount,
				description: value.description,
				startDate: value.startDate,
				endDate: value.endDate,
				type: "RECEIPT",
				reportId,
				attachments,
			});

			// TODO: Invalidate expense list for report
			// utils.expense.listForReport.invalidate();
			router.push(`/reports/${reportId}`);
		},
	});

	const uploader = usePresignedUpload();

	return (
		<form
			className="flex grow flex-col"
			id="form-create-receipt-expense"
			onSubmit={(e) => {
				e.preventDefault();
				form.handleSubmit();
			}}
			{...props}
		>
			<SheetBody>
				<FieldGroup className="grid gap-4 md:grid-cols-2">
					<form.Field
						children={(field) => {
							const isInvalid =
								field.state.meta.isTouched && !field.state.meta.isValid;
							return (
								<Field className="md:col-span-2" data-invalid={isInvalid}>
									<FieldLabel htmlFor={field.name}>
										{tCommon("fields.description")}
									</FieldLabel>
									<Textarea
										aria-invalid={isInvalid}
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
									{isInvalid && <FieldError errors={field.state.meta.errors} />}
								</Field>
							);
						}}
						name="description"
					/>

					<form.Field
						children={(field) => {
							const isInvalid =
								field.state.meta.isTouched && !field.state.meta.isValid;
							return (
								<Field data-invalid={isInvalid}>
									<FieldLabel htmlFor={field.name}>
										{tCommon("fields.startDate")}
									</FieldLabel>
									<DatePicker
										aria-invalid={isInvalid}
										id={field.name}
										name={field.name}
										onBlur={field.handleBlur}
										onChange={(date) => field.handleChange(date.target.value)}
										placeholder={tCommon("fields.datePlaceholder")}
										value={field.state.value}
									/>
									{isInvalid && <FieldError errors={field.state.meta.errors} />}
								</Field>
							);
						}}
						name="startDate"
					/>
					<form.Field
						children={(field) => {
							const isInvalid =
								field.state.meta.isTouched && !field.state.meta.isValid;
							return (
								<Field data-invalid={isInvalid}>
									<FieldLabel htmlFor={field.name}>
										{tCommon("fields.endDate")}
									</FieldLabel>
									<DatePicker
										aria-invalid={isInvalid}
										id={field.name}
										name={field.name}
										onBlur={field.handleBlur}
										onChange={(date) => field.handleChange(date.target.value)}
										placeholder={tCommon("fields.datePlaceholder")}
										value={field.state.value}
									/>
									{isInvalid && <FieldError errors={field.state.meta.errors} />}
								</Field>
							);
						}}
						name="endDate"
					/>
					<form.Field
						children={(field) => {
							const isInvalid =
								field.state.meta.isTouched && !field.state.meta.isValid;
							return (
								<Field className="md:col-span-2" data-invalid={isInvalid}>
									<FieldLabel htmlFor={field.name}>
										{tCommon("fields.amount")}
									</FieldLabel>
									<NumberField.Root
										format={{
											style: "decimal",
											minimumFractionDigits: 2,
											maximumFractionDigits: 2,
										}}
										locale={"de-DE"}
										onValueChange={(value) => field.handleChange(value ?? 0)}
										value={field.state.value}
									>
										<NumberField.Group>
											<InputGroup className="overflow-hidden opacity-100!">
												<NumberField.Input
													render={
														<InputGroupInput
															aria-invalid={isInvalid}
															autoComplete="off"
															id={field.name}
															inputMode="decimal"
															name={field.name}
															placeholder="0,00"
														/>
													}
												/>
												<InputGroupAddon
													align={"inline-end"}
													className="flex w-8 items-center justify-center overflow-hidden border-l bg-muted p-2"
												>
													<span>€</span>
												</InputGroupAddon>
											</InputGroup>
										</NumberField.Group>
									</NumberField.Root>
									{isInvalid && <FieldError errors={field.state.meta.errors} />}
								</Field>
							);
						}}
						name="amount"
					/>
					<form.Field
						children={(field) => {
							const isInvalid =
								(field.state.meta.isTouched && !field.state.meta.isValid) ||
								uploader.isError;

							const MAX_FILE_AMOUNT = 5;

							return (
								<Field className="md:col-span-2" data-invalid={isInvalid}>
									<FieldLabel htmlFor={field.name}>
										{tCommon("fields.attachments")}
									</FieldLabel>
									<UploadDropzone
										accept={{
											"image/*": [],
											"application/pdf": [".pdf"],
										}}
										control={uploader.control}
										description={{
											maxFiles: MAX_FILE_AMOUNT,
											maxFileSize: "5MB",
											fileTypes: "images and PDFs",
										}}
										id={field.name}
										uploadOverride={(files) => {
											field.handleChange(Array.from([...field.state.value, ...files]));
										}}
									/>
									{field.state.value.length > 0 && (
										<div className="mt-4 grid gap-4">
											{field.state.value.map((file) => (
												<div className="flex items-center justify-between" key={file.name}>
													<div>
														<p>{file.name}</p>
														<p className="text-muted-foreground text-xs">
															{formatBytes(file.size)}
														</p>
													</div>
													<Button
														onClick={() => {
															field.handleChange(
																field.state.value.filter((f) => f.name !== file.name),
															);
														}}
														size="icon-sm"
														variant="destructive"
													>
														<XIcon className="size-4" />
													</Button>
												</div>
											))}
										</div>
									)}
									{isInvalid && (
										<FieldError
											errors={
												uploader.error
													? [{ message: uploader.error.message }]
													: field.state.meta.errors
											}
										/>
									)}
								</Field>
							);
						}}
						name="files"
					/>
				</FieldGroup>
			</SheetBody>
			<SheetFooter>
				<Button
					className={"md:col-span-2"}
					disabled={createReceipt.isPending || uploader.isPending}
					form="form-create-receipt-expense"
					type="submit"
				>
					{t("submit")}
				</Button>
			</SheetFooter>
		</form>
	);
}
