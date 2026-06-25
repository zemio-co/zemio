"use client";

import { Dialog, NumberField } from "@base-ui/react";
import { useForm } from "@tanstack/react-form";
import { formatDate, isValid, parse } from "date-fns";
import { CarIcon, ReceiptIcon, UtensilsIcon, XIcon } from "lucide-react";
import type React from "react";
import { useRef } from "react";
import { toast } from "sonner";
import z from "zod";
import { DatePicker } from "@/components/date-picker";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import {
	Sheet,
	SheetBody,
	SheetContent,
	SheetFooter,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { UploadDropzone } from "@/components/ui/upload-dropzone";
import { usePresignedUpload } from "@/lib/use-presigned-upload";
import { formatBytes, renameFileWithHash } from "@/lib/utils";
import { api } from "@/trpc/react";

function CreateExpense({
	reportId,
	...props
}: React.ComponentProps<typeof Button> & {
	reportId: string;
}) {
	const receiptHandleRef = useRef<ReturnType<typeof Dialog.createHandle> | null>(
		null,
	);
	if (!receiptHandleRef.current)
		receiptHandleRef.current = Dialog.createHandle();
	const receiptHandle = receiptHandleRef.current;

	return (
		<>
			<DropdownMenu>
				<DropdownMenuTrigger render={<Button disableAnimation {...props} />} />
				<DropdownMenuContent align="center" className={"min-w-52"}>
					<DropdownMenuItem onClick={() => receiptHandle.open(null)}>
						<ReceiptIcon />
						Belege & Rechnungen
					</DropdownMenuItem>
					<DropdownMenuItem disabled>
						<CarIcon />
						Reisepauschale
					</DropdownMenuItem>
					<DropdownMenuItem disabled>
						<UtensilsIcon />
						Verpflegungspauschale
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>
			<ReceiptExpense handle={receiptHandle} reportId={reportId} />
		</>
	);
}

const receiptExpenseFormSchema = z.object({
	description: z.string(),
	amount: z.number().min(0),
	startDate: z
		.string()
		.min(1, "Startdatum ist erforderlich")
		.refine(
			(val) => {
				const date = parse(val, "dd.MM.yyyy", new Date());
				return isValid(date);
			},
			{ message: "Ungültiges Startdatum" },
		)
		.transform((val) => parse(val, "dd.MM.yyyy", new Date())),
	endDate: z
		.string()
		.min(1, "Enddatum ist erforderlich")
		.refine(
			(val) => {
				const date = parse(val, "dd.MM.yyyy", new Date());
				return isValid(date);
			},
			{ message: "Ungültiges Enddatum" },
		)
		.transform((val) => parse(val, "dd.MM.yyyy", new Date())),
	files: z.file().array(),
});

function ReceiptExpense({
	reportId,
	...props
}: React.ComponentProps<typeof Sheet> & {
	reportId: string;
}) {
	const utils = api.useUtils();
	const deletePendingUploads = api.attachment.deletePendingUploads.useMutation();
	const createReceipt = api.expense.createReceipt.useMutation({
		onSuccess: () => {
			utils.expense.list.invalidate({ reportId });
			utils.report.financialSummary.invalidate({ id: reportId });
			utils.attachment.listForReport.invalidate({ id: reportId });
			toast.success("Ausgabe erfolgreich erstellt");

			props.handle?.close();
		},
		onError: (error) => {
			toast.error("Fehler beim Erstellen der Ausgabe", {
				description: error.message ?? "Ein unerwarteter Fehler ist aufgetreten",
			});
		},
	});
	const form = useForm({
		defaultValues: {
			description: "",
			amount: 0,
			startDate: formatDate(new Date(), "dd.MM.yyyy"),
			endDate: formatDate(new Date(), "dd.MM.yyyy"),
			files: [] as File[],
		},
		validators: {
			onSubmit: receiptExpenseFormSchema,
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
						toast.error("Upload fehlgeschlagen", {
							description:
								"Teilweise hochgeladene Dateien konnten nicht bereinigt werden",
						});
						return;
					}
				}

				toast.error("Upload fehlgeschlagen", {
					description: "Nicht alle Dateien konnten hochgeladen werden",
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

			form.reset();
		},
	});

	const uploader = usePresignedUpload();

	return (
		<Sheet {...props}>
			<SheetContent>
				<SheetHeader>
					<SheetTitle>Belege und Rechnungen hinzufügen</SheetTitle>
				</SheetHeader>
				<form
					className="flex min-h-0 w-full grow flex-col data-[disabled=true]:opacity-50"
					data-disabled={createReceipt.isPending || form.state.isSubmitting}
					id="create-receipt-expense"
					onSubmit={(e) => {
						e.preventDefault();
						form.handleSubmit(e);
					}}
				>
					<SheetBody>
						<FieldGroup className="grid grid-cols-2 gap-8">
							<form.Field
								children={(field) => {
									const isInvalid =
										field.state.meta.isTouched && !field.state.meta.isValid;
									return (
										<Field className="col-span-2" data-invalid={isInvalid}>
											<FieldLabel
												className="mb-1 font-semibold text-base text-slate-800"
												htmlFor={field.name}
											>
												Beschreibung
											</FieldLabel>
											<Textarea
												aria-invalid={isInvalid}
												autoComplete="off"
												id={field.name}
												name={field.name}
												onBlur={field.handleBlur}
												onChange={(e) => field.handleChange(e.target.value)}
												placeholder="Verpflegung Weihnachtsfeier"
												value={field.state.value}
											/>
											<FieldDescription>
												Optional. Füge dieser Ausgabe eine Kurze Beschreibung hinzu.
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
											<FieldLabel
												className="mb-1 font-semibold text-base text-slate-800"
												htmlFor={field.name}
											>
												Startdatum
											</FieldLabel>
											<DatePicker
												aria-invalid={isInvalid}
												id={field.name}
												name={field.name}
												onBlur={field.handleBlur}
												onChange={(date) => field.handleChange(date.target.value)}
												placeholder="01.01.2026"
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
											<FieldLabel
												className="mb-1 font-semibold text-base text-slate-800"
												htmlFor={field.name}
											>
												Enddatum
											</FieldLabel>
											<DatePicker
												aria-invalid={isInvalid}
												id={field.name}
												name={field.name}
												onBlur={field.handleBlur}
												onChange={(date) => field.handleChange(date.target.value)}
												placeholder="01.01.2026"
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
											<FieldLabel htmlFor={field.name}>Betrag</FieldLabel>
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
											<FieldLabel htmlFor={field.name}>Anhänge</FieldLabel>
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
														<div
															className="flex items-center justify-between"
															key={file.name}
														>
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
					<SheetFooter className="items-end">
						<Button
							className={"w-fit"}
							disabled={createReceipt.isPending}
							form="create-receipt-expense"
							type="submit"
						>
							Hinzufügen
						</Button>
					</SheetFooter>
				</form>
			</SheetContent>
		</Sheet>
	);
}

export { CreateExpense };
