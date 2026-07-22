"use client";

import { Dialog as DialogPrimitive } from "@base-ui/react";
import { useForm } from "@tanstack/react-form";
import { useSuspenseQueries } from "@tanstack/react-query";
import type { CostUnitGroup } from "@zemio/db";
import { InfoIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import React from "react";
import { toast } from "sonner";
import type z from "zod";
import { AsyncBoundary } from "@/components/async-boundary";
import { Button } from "@/components/ui/button";
import {
	Field,
	FieldDescription,
	FieldError,
	FieldGroup,
	FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
	NativeSelect,
	NativeSelectOptGroup,
	NativeSelectOption,
} from "@/components/ui/native-select";
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
import type { WithHandle } from "@/lib/types";
import { createCostUnitSchema } from "@/lib/validators";
import { api } from "@/trpc/react";
import {
	type CreateCostUnitGroupHandle,
	CreateCostUnitGroupSheet,
	createCostUnitGroupCreateHandle,
} from "./create-cost-unit-group";
import { ExamplesInput } from "./examples-input";
import { SheetFormError, SheetFormSkeleton } from "./sheet-form-state";

type CreateCostUnitFormValues = z.infer<typeof createCostUnitSchema>;
type CreateCostUnitHandle = ReturnType<typeof DialogPrimitive.createHandle>;

const FORM_ID = "create-cost-unit";
const COST_UNIT_FORM_FIELD_COUNT = 4;

function createCostUnitCreateHandle(): CreateCostUnitHandle {
	return DialogPrimitive.createHandle();
}

function CreateCostUnitSheetTrigger({
	handle,
	...props
}: React.ComponentProps<typeof Button> & WithHandle) {
	return (
		<DialogPrimitive.Trigger
			data-slot="create-cost-unit-sheet-trigger"
			handle={handle}
			render={<Button {...props} />}
		/>
	);
}

function CreateCostUnitSheet({
	handle,
	...props
}: Omit<React.ComponentProps<typeof Sheet>, "handle"> & WithHandle) {
	const t = useTranslations("modules.settings.costUnits.createSheet");

	return (
		<DialogPrimitive.Root handle={handle} {...props}>
			<SheetContent
				className={
					"data-nested-dialog-open:-translate-x-6 data-nested-dialog-open:scale-98"
				}
			>
				<SheetHeader>
					<SheetTitle>{t("title")}</SheetTitle>
				</SheetHeader>

				<AsyncBoundary
					pending={<SheetFormSkeleton fieldCount={COST_UNIT_FORM_FIELD_COUNT} />}
					rejected={({ error, retry }) => (
						<SheetFormError error={error} retry={retry} />
					)}
				>
					<CreateCostUnitFormConnected handle={handle} />
				</AsyncBoundary>
			</SheetContent>
		</DialogPrimitive.Root>
	);
}

function CreateCostUnitFormConnected({ handle }: WithHandle) {
	const t = useTranslations("modules.settings.costUnits.createSheet");
	const utils = api.useUtils();

	const [{ data: groups }] = useSuspenseQueries({
		queries: [utils.costUnit.listGroups.queryOptions()],
	});

	const create = api.costUnit.create.useMutation({
		onSuccess: (value) => {
			toast.success(t("savedToast"), {
				description: `${value.tag} • ${value.title}`,
			});
			utils.costUnit.listCostUnits.invalidate({});
			handle.close();
		},
		onError: (error) => {
			toast.error(t("saveErrorTitle"), {
				description: error.message ?? t("saveErrorFallback"),
			});
		},
	});

	return (
		<CreateCostUnitForm
			groups={groups}
			onSubmit={async (values) => {
				await create.mutateAsync(values);
			}}
		/>
	);
}

type CreateCostUnitFormProps = {
	onSubmit: (values: CreateCostUnitFormValues) => Promise<void>;
	groups: CostUnitGroup[];
};

function CreateCostUnitForm({ onSubmit, groups }: CreateCostUnitFormProps) {
	const t = useTranslations("modules.settings.costUnits.createSheet");
	const tActions = useTranslations("modules.settings.actions");
	const createGroupHandleRef = React.useRef<CreateCostUnitGroupHandle | null>(
		null,
	);
	if (!createGroupHandleRef.current)
		createGroupHandleRef.current = createCostUnitGroupCreateHandle();
	const createGroupHandle = createGroupHandleRef.current;

	const form = useForm({
		defaultValues: {
			tag: "",
			title: "",
			examples: [],
			costUnitGroupId: NO_COST_UNIT_GROUP,
		} as CreateCostUnitFormValues,
		validators: {
			onSubmit: createCostUnitSchema,
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
										<div>
											<DialogPrimitive.Trigger
												handle={createGroupHandle}
												render={
													<Button className={"w-fit -translate-x-2.5"} variant={"link"}>
														{t("createGroupButton")}
													</Button>
												}
											/>
										</div>
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
					})}
				>
					{({ canSubmit, isSubmitting }) => (
						<Button
							disabled={!canSubmit || isSubmitting}
							form={FORM_ID}
							type="submit"
						>
							{isSubmitting ? tActions("creating") : tActions("create")}
						</Button>
					)}
				</form.Subscribe>
			</SheetFooter>
			<CreateCostUnitGroupSheet closeOnSuccess handle={createGroupHandle} />
		</>
	);
}

export {
	type CreateCostUnitHandle,
	CreateCostUnitSheet,
	CreateCostUnitSheetTrigger,
	createCostUnitCreateHandle,
};
