"use client";

import {
	AlertDialog as AlertDialogPrimitive,
	Dialog as DialogPrimitive,
} from "@base-ui/react";
import { useForm } from "@tanstack/react-form";
import { useSuspenseQueries } from "@tanstack/react-query";
import type { CostUnitGroup, CostUnitStatus } from "@zemio/db";
import { CircleIcon, InfoIcon, TrashIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import React from "react";
import { toast } from "sonner";
import type z from "zod";
import { AsyncBoundary } from "@/components/async-boundary";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
	Field,
	FieldDescription,
	FieldError,
	FieldGroup,
	FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	NativeSelect,
	NativeSelectOptGroup,
	NativeSelectOption,
} from "@/components/ui/native-select";
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	type Sheet,
	SheetBody,
	SheetClose,
	SheetContent,
	SheetFooter,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { NO_COST_UNIT_GROUP } from "@/lib/consts";
import { cn } from "@/lib/utils";
import { updateCostUnitSchema } from "@/lib/validators";
import { api } from "@/trpc/react";
import { ExamplesInput } from "./examples-input";
import { SheetFormError, SheetFormSkeleton } from "./sheet-form-state";

type UpdateCostUnitPayload = { id: string } | undefined;
type UpdateCostUnitHandle = ReturnType<
	typeof DialogPrimitive.createHandle<UpdateCostUnitPayload>
>;
type UpdateCostUnitFormValues = z.infer<typeof updateCostUnitSchema>;

const FORM_ID = "update-cost-unit";
const COST_UNIT_FORM_FIELD_COUNT = 4;

function createCostUnitUpdateHandle() {
	return DialogPrimitive.createHandle<UpdateCostUnitPayload>();
}

function UpdateCostUnitSheet({
	handle,
	...props
}: Omit<React.ComponentProps<typeof Sheet>, "handle"> & {
	handle: UpdateCostUnitHandle;
}) {
	const t = useTranslations("modules.settings.costUnits.updateSheet");

	return (
		<DialogPrimitive.Root {...props} handle={handle}>
			{({ payload }) => (
				<SheetContent className={"data-nested-dialog-open:blur-xs"}>
					<SheetHeader>
						<SheetTitle>{t("title")}</SheetTitle>
					</SheetHeader>

					{payload ? (
						<AsyncBoundary
							// SECTION 3 — keying on the entity id remounts queries + form
							// when a different row opens the sheet. Fresh seed every time;
							// you never manually reset form state.
							key={payload.id}
							pending={<SheetFormSkeleton fieldCount={COST_UNIT_FORM_FIELD_COUNT} />}
							rejected={({ error, retry }) => (
								<SheetFormError error={error} retry={retry} />
							)}
						>
							<UpdateCostUnitFormConnected costUnitId={payload.id} handle={handle} />
						</AsyncBoundary>
					) : null}
				</SheetContent>
			)}
		</DialogPrimitive.Root>
	);
}

type UpdateCostUnitFormProps = {
	defaultValues: UpdateCostUnitFormValues;
	submitLabel: string;
	groups: CostUnitGroup[];
	canDelete?: boolean;

	onSubmit: (values: UpdateCostUnitFormValues) => Promise<void> | void;
	onDelete: () => Promise<void> | void;
};

function UpdateCostUnitFormConnected({
	costUnitId,
	handle,
}: {
	costUnitId: string;
	handle: UpdateCostUnitHandle;
}) {
	const t = useTranslations("modules.settings.costUnits.updateSheet");
	const tActions = useTranslations("modules.settings.actions");
	const utils = api.useUtils();

	const [{ data: groups }, { data: costUnit }] = useSuspenseQueries({
		queries: [
			utils.costUnit.listGroups.queryOptions(),
			utils.costUnit.getById.queryOptions({ id: costUnitId }),
		],
	});

	const update = api.costUnit.update.useMutation({
		onSuccess: (value) => {
			toast.success(t("savedToast"), {
				description: `${value.tag} • ${value.title}`,
			});
			utils.costUnit.listCostUnits.invalidate({});
			utils.costUnit.getById.invalidate({ id: value.id });
			handle.close();
		},
		onError: (error) => {
			toast.error(t("saveErrorTitle"), {
				description: error.message ?? t("saveErrorFallback"),
			});
		},
	});

	const deleteCostUnit = api.costUnit.delete.useMutation({
		onSuccess: (value) => {
			toast.success(t("deletedToast"), {
				description: `${value.tag} • ${value.title}`,
			});
			handle.close();
		},
		onError: (error) => {
			toast.error(t("deleteErrorTitle"), {
				description: error.message ?? t("deleteErrorFallback"),
			});
		},
	});

	return (
		<UpdateCostUnitForm
			canDelete={costUnit._count.reports === 0}
			defaultValues={{
				...costUnit,
				costUnitGroupId: costUnit.costUnitGroupId ?? NO_COST_UNIT_GROUP,
			}}
			groups={groups}
			onDelete={async () => {
				await deleteCostUnit.mutateAsync({
					id: costUnitId,
				});
			}}
			onSubmit={async (values) => {
				await update.mutateAsync(values);
			}}
			submitLabel={tActions("update")}
		/>
	);
}

function UpdateCostUnitForm({
	defaultValues,
	submitLabel,
	canDelete,
	groups,

	onSubmit,
	onDelete,
}: UpdateCostUnitFormProps) {
	const t = useTranslations("modules.settings.costUnits.updateSheet");
	const tActions = useTranslations("modules.settings.actions");
	const deleteHandleRef = React.useRef<ReturnType<
		typeof AlertDialogPrimitive.createHandle
	> | null>(null);
	if (!deleteHandleRef.current)
		deleteHandleRef.current = AlertDialogPrimitive.createHandle();
	const deleteHandle = deleteHandleRef.current;

	const form = useForm({
		defaultValues,
		validators: {
			onSubmit: updateCostUnitSchema,
		},
		onSubmit: async ({ value }) => {
			await onSubmit(value);
		},
	});

	return (
		<>
			<SheetBody>
				<form
					className="space-y-5"
					id={FORM_ID}
					onSubmit={(e) => {
						e.preventDefault();
						void form.handleSubmit();
					}}
				>
					<FieldGroup className="grid gap-12">
						<div className="grid grid-cols-3 gap-x-6 gap-y-2">
							<form.Field name="tag">
								{(field) => {
									const isInvalid =
										field.state.meta.isTouched && !field.state.meta.isValid;
									return (
										<Field data-invalid={isInvalid}>
											<FieldLabel
												className="mb-1 font-semibold text-base text-slate-800"
												htmlFor={field.name}
											>
												{t("tagLabel")}
												<Tooltip>
													<TooltipTrigger
														render={<InfoIcon className="size-3.5 text-slate-500" />}
													/>
													<TooltipContent>{t("tagTooltip")}</TooltipContent>
												</Tooltip>
											</FieldLabel>
											<Input
												aria-invalid={isInvalid}
												id={field.name}
												name={field.name}
												onBlur={field.handleBlur}
												onChange={(e) => field.handleChange(e.target.value)}
												placeholder={t("tagPlaceholder")}
												value={field.state.value}
											/>
											{isInvalid && <FieldError errors={field.state.meta.errors} />}
										</Field>
									);
								}}
							</form.Field>
							<form.Field name="title">
								{(field) => {
									const isInvalid =
										field.state.meta.isTouched && !field.state.meta.isValid;
									return (
										<Field className="col-span-2" data-invalid={isInvalid}>
											<FieldLabel
												className="mb-1 font-semibold text-base text-slate-800"
												htmlFor={field.name}
											>
												{t("titleLabel")}
											</FieldLabel>
											<Input
												aria-invalid={isInvalid}
												id={field.name}
												name={field.name}
												onBlur={field.handleBlur}
												onChange={(e) => field.handleChange(e.target.value)}
												placeholder={t("titlePlaceholder")}
												value={field.state.value}
											/>
											{isInvalid && <FieldError errors={field.state.meta.errors} />}
										</Field>
									);
								}}
							</form.Field>
							<FieldDescription className="col-span-2">
								{t("tagTitleDescription")}
							</FieldDescription>
						</div>
						<form.Field name="status">
							{({ state, ...field }) => {
								const isInvalid = state.meta.isTouched && !state.meta.isValid;
								return (
									<Field data-invalid={isInvalid}>
										<FieldLabel
											className="mb-1 font-semibold text-base text-slate-800"
											htmlFor={field.name}
										>
											{t("statusLabel")}
										</FieldLabel>
										<Select
											items={{
												ACTIVE: t("statusActive"),
												ARCHIVED: t("statusArchived"),
											}}
											onValueChange={(value) => field.handleChange(value ?? "ACTIVE")}
											value={state.value}
										>
											<SelectTrigger>
												<SelectValue placeholder={t("statusPlaceholder")}>
													{(status: CostUnitStatus) => (
														<span
															className={cn(
																"flex flex-1 shrink-0 items-center gap-2 whitespace-nowrap",
															)}
														>
															<CircleIcon
																className={cn(
																	"size-2.5 text-white **:fill-green-500",
																	status === "ARCHIVED" && "**:fill-orange-500",
																)}
															/>
															{status === "ARCHIVED" ? t("statusArchived") : t("statusActive")}
														</span>
													)}
												</SelectValue>
											</SelectTrigger>
											<SelectContent>
												<SelectGroup>
													<SelectItem
														className={cn(
															"focus:bg-slate-100 focus:text-slate-800 not-data-[variant=destructive]:focus:**:text-slate-800",
															"**:data-[slot='item-text']:items-center",
														)}
														value={"ACTIVE"}
													>
														<CircleIcon className="size-2.5 text-white **:fill-green-500 group-focus/item:**:text-slate-100!" />
														{t("statusActive")}
													</SelectItem>
													<SelectItem
														className={cn(
															"focus:bg-slate-100 focus:text-slate-800 not-data-[variant=destructive]:focus:**:text-slate-800",
															"**:data-[slot='item-text']:items-center",
														)}
														value={"ARCHIVED"}
													>
														<CircleIcon className="size-2.5 text-white **:fill-orange-500 group-focus/item:**:text-slate-100!" />
														{t("statusArchived")}
													</SelectItem>
												</SelectGroup>
											</SelectContent>
										</Select>
										<FieldDescription>{t("statusDescription")}</FieldDescription>
									</Field>
								);
							}}
						</form.Field>
						<form.Field name="costUnitGroupId">
							{(field) => {
								const isInvalid =
									field.state.meta.isTouched && !field.state.meta.isValid;
								return (
									<Field data-invalid={isInvalid}>
										<FieldLabel
											className="mb-1 font-semibold text-base text-slate-800"
											htmlFor={field.name}
										>
											{t("groupLabel")}
										</FieldLabel>
										<NativeSelect
											onChange={(e) => field.handleChange(e.target.value)}
											value={field.state.value}
										>
											<NativeSelectOption value={NO_COST_UNIT_GROUP}>
												{t("noGroupOption")}
											</NativeSelectOption>
											<NativeSelectOptGroup label={t("groupOptGroupLabel")}>
												{groups.map((group) => (
													<NativeSelectOption key={group.id} value={group.id}>
														{group.title}
													</NativeSelectOption>
												))}
											</NativeSelectOptGroup>
										</NativeSelect>
										<FieldDescription>{t("groupDescription")}</FieldDescription>
										{isInvalid && <FieldError errors={field.state.meta.errors} />}
									</Field>
								);
							}}
						</form.Field>
						<form.Field name="examples">
							{(field) => {
								const isInvalid =
									field.state.meta.isTouched && !field.state.meta.isValid;
								return (
									<Field data-invalid={isInvalid}>
										<FieldLabel
											className="mb-1 font-semibold text-base text-slate-800"
											htmlFor={field.name}
										>
											{t("examplesLabel")}
										</FieldLabel>
										<ExamplesInput
											onChange={field.handleChange}
											placeholder={t("examplesPlaceholder")}
											value={field.state.value}
										/>
										<FieldDescription>{t("examplesDescription")}</FieldDescription>
										{isInvalid && <FieldError errors={field.state.meta.errors} />}
									</Field>
								);
							}}
						</form.Field>
					</FieldGroup>
				</form>
				<div className="mt-12 flex flex-nowrap items-start justify-between gap-8">
					<div>
						<Label
							className="mb-1 font-semibold text-base text-red-600"
							htmlFor={"delete-cost-unit"}
						>
							{t("deleteSectionLabel")}
						</Label>
						<FieldDescription>
							{canDelete
								? t("deleteSectionDescriptionAllowed")
								: t("deleteSectionDescriptionBlocked")}
						</FieldDescription>
					</div>
					<AlertDialogTrigger
						disabled={!canDelete}
						handle={deleteHandle}
						id={"delete-cost-unit"}
						render={
							<Button type="button" variant={"destructive"}>
								<TrashIcon /> {tActions("delete")}
							</Button>
						}
					/>
				</div>
			</SheetBody>

			<SheetFooter className="flex flex-row items-center justify-end gap-4">
				<SheetClose
					render={
						<Button type="button" variant="outline">
							{tActions("cancel")}
						</Button>
					}
				/>

				<form.Subscribe
					selector={(s) => ({
						canSubmit: s.canSubmit,
						isSubmitting: s.isSubmitting,
						isDefaultValue: s.isDefaultValue,
					})}
				>
					{({ canSubmit, isSubmitting, isDefaultValue }) => (
						<Button
							disabled={!canSubmit || isSubmitting || isDefaultValue}
							form={FORM_ID}
							type="submit"
						>
							{isSubmitting ? tActions("saving") : submitLabel}
						</Button>
					)}
				</form.Subscribe>
			</SheetFooter>
			<AlertDialog handle={deleteHandle}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>{t("deleteDialogTitle")}</AlertDialogTitle>
						<AlertDialogDescription>
							{t("deleteDialogDescription")}
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>{tActions("cancel")}</AlertDialogCancel>
						<AlertDialogAction
							onClick={onDelete}
							render={<Button variant={"destructive"}>{tActions("delete")}</Button>}
						/>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
}

export {
	createCostUnitUpdateHandle,
	type UpdateCostUnitHandle,
	UpdateCostUnitSheet,
};
