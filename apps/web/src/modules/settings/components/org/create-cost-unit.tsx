"use client";

import { Dialog as DialogPrimitive, Radio, RadioGroup } from "@base-ui/react";
import { useForm } from "@tanstack/react-form";
import { useSuspenseQueries } from "@tanstack/react-query";
import type { CostUnitGroup } from "@zemio/db";
import {
	Button,
	Field,
	FieldDescription,
	FieldError,
	FieldGroup,
	FieldLabel,
	Input,
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
	SelectValue,
	type Sheet,
	SheetBody,
	SheetClose,
	SheetContent,
	SheetFooter,
	SheetHeader,
	SheetTitle,
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@zemio/ui";
import { InfoIcon, LoaderIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import React from "react";
import { toast } from "sonner";
import type z from "zod";
import { AsyncBoundary } from "@/components/async-boundary";
import { COST_UNIT_COLORS } from "@/lib/colors/cost-units";
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
		queries: [utils.costUnit.groups.list.queryOptions()],
	});

	const create = api.costUnit.create.useMutation({
		onSuccess: (value) => {
			toast.success(t("savedToast"), {
				description: `${value.tag} • ${value.title}`,
			});
			utils.costUnit.list.invalidate({});
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
			color: "BASE",
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
							{({ state, ...field }) => {
								const isInvalid = state.meta.isTouched && !state.meta.isValid;

								const items = groups.map((group) => ({
									label: group.title,
									value: group.id,
								}));

								items.push({
									label: t("noGroupOption"),
									value: NO_COST_UNIT_GROUP,
								});

								return (
									<Field data-invalid={isInvalid}>
										<FieldLabel
											className="mb-1 font-semibold text-base text-slate-800"
											htmlFor={field.name}
										>
											{t("groupLabel")}
										</FieldLabel>
										<Select
											items={items}
											onValueChange={(value) =>
												field.handleChange(value ?? NO_COST_UNIT_GROUP)
											}
											value={state.value}
										>
											<SelectTrigger>
												<SelectValue placeholder={t("noGroupOption")} />
											</SelectTrigger>
											<SelectContent>
												<SelectGroup>
													{groups.map((group) => (
														<SelectItem key={group.id} value={group.id}>
															{group.title}
														</SelectItem>
													))}
												</SelectGroup>
											</SelectContent>
										</Select>
										<FieldDescription>{t("groupDescription")}</FieldDescription>
										<div>
											<DialogPrimitive.Trigger
												handle={createGroupHandle}
												render={
													<Button
														className={"inline-flex w-fit -translate-x-2.5"}
														variant={"ghost"}
													>
														{t("createGroupButton")}
													</Button>
												}
											/>
										</div>
										{isInvalid && <FieldError errors={state.meta.errors} />}
									</Field>
								);
							}}
						</form.Field>
						<form.Field name="color">
							{({ state, ...field }) => {
								const isInvalid = state.meta.isTouched && !state.meta.isValid;
								return (
									<Field data-invalid={isInvalid}>
										<FieldLabel
											className="mb-1 font-semibold text-base text-slate-800"
											htmlFor={field.name}
										>
											{t("colorLabel")}
										</FieldLabel>
										<RadioGroup
											className={"grid grid-cols-9 gap-3 md:grid-cols-18"}
											id={field.name}
											name={field.name}
											onValueChange={field.handleChange}
											value={state.value}
										>
											{Object.entries(COST_UNIT_COLORS).map(([key, value]) => {
												return (
													<Radio.Root
														className={"aspect-square w-full rounded-md"}
														key={key}
														style={{
															backgroundColor: value.fill,
														}}
														value={key}
													>
														<Radio.Indicator className="flex h-full w-full items-center justify-center before:size-2 before:rounded-full before:bg-white data-unchecked:hidden" />
													</Radio.Root>
												);
											})}
										</RadioGroup>
										<FieldDescription>{t("colorDescription")}</FieldDescription>
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
			<SheetFooter>
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
							{isSubmitting ? (
								<>
									<LoaderIcon className="animate-spin" />
									{tActions("creating")}
								</>
							) : (
								tActions("create")
							)}
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
