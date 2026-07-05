"use client";

import { Dialog as DialogPrimitive } from "@base-ui/react";
import { useForm } from "@tanstack/react-form";
import { useSuspenseQueries } from "@tanstack/react-query";
import type { CostUnitGroup } from "@zemio/db";
import { InfoIcon } from "lucide-react";
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
import { Skeleton } from "@/components/ui/skeleton";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import type { WithHandle } from "@/lib/types";
import { createCostUnitSchema } from "@/lib/validators";
import { api } from "@/trpc/react";
import { ExamplesInput } from "./org-settings-cost-units";
import {
	type CreateCostUnitGroupHandle,
	CreateCostUnitGroupSheet,
} from "./org-settings-create-cost-unit-group";

type CreateCostUnitFormValues = z.infer<typeof createCostUnitSchema>;
type CreateCostUnitHandle = ReturnType<typeof DialogPrimitive.createHandle>;

const FORM_ID = "create-cost-unit";
const NO_COST_UNIT_GROUP = "NO_GROUP" as const;

function createCreateCostUnitHandle(): CreateCostUnitHandle {
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
	return (
		<DialogPrimitive.Root handle={handle} {...props}>
			<SheetContent
				className={
					"data-nested-dialog-open:-translate-x-6 data-nested-dialog-open:scale-98"
				}
			>
				<SheetHeader>
					<SheetTitle>Neue Kostenstelle</SheetTitle>
				</SheetHeader>

				<AsyncBoundary
					pending={<CreateCostUnitFormSkeleton />}
					rejected={({ error, retry }) => (
						<CreateCostUnitFormError error={error} retry={retry} />
					)}
				>
					<CreateCostUnitFormConnected handle={handle} />
				</AsyncBoundary>
			</SheetContent>
		</DialogPrimitive.Root>
	);
}

function CreateCostUnitFormConnected({ handle }: WithHandle) {
	const utils = api.useUtils();

	const [{ data: groups }] = useSuspenseQueries({
		queries: [utils.costUnit.listGroups.queryOptions()],
	});

	const create = api.costUnit.create.useMutation({
		onSuccess: (value) => {
			toast.success("Kostenstelle wurde erfolgreich erstellt", {
				description: `${value.tag} • ${value.title}`,
			});
			handle.close();
		},
		onError: (error) => {
			toast.error("Fehler beim Erstellen der Kostenstelle", {
				description: error.message ?? "Ein unbekannter Fehler ist aufgetreten",
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
	const createGroupHandleRef = React.useRef<CreateCostUnitGroupHandle | null>(
		null,
	);
	if (!createGroupHandleRef.current)
		createGroupHandleRef.current = createCreateCostUnitHandle();
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
												Tag
												<Tooltip>
													<TooltipTrigger
														render={<InfoIcon className="size-3.5 text-slate-500" />}
													/>
													<TooltipContent>
														Jede Kostenstelle besteht aus einer Kombination eines
														einzigartigen Tags und einem Titel
													</TooltipContent>
												</Tooltip>
											</FieldLabel>
											<Input
												aria-invalid={isInvalid}
												id={field.name}
												name={field.name}
												onBlur={field.handleBlur}
												onChange={(e) => field.handleChange(e.target.value)}
												placeholder="KS123"
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
												Titel
											</FieldLabel>
											<Input
												aria-invalid={isInvalid}
												id={field.name}
												name={field.name}
												onBlur={field.handleBlur}
												onChange={(e) => field.handleChange(e.target.value)}
												placeholder="Sommerfest"
												value={field.state.value}
											/>
											{isInvalid && <FieldError errors={field.state.meta.errors} />}
										</Field>
									);
								}}
							</form.Field>
							<FieldDescription className="col-span-2">
								Wird zur eindeutigen Identifikation der Kostenstelle verwendet.
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
											Gruppe
										</FieldLabel>
										<NativeSelect
											onChange={(e) => field.handleChange(e.target.value)}
											value={field.state.value}
										>
											<NativeSelectOption value={NO_COST_UNIT_GROUP}>
												Keine Gruppe
											</NativeSelectOption>
											<NativeSelectOptGroup label="Gruppen">
												{groups.map((group) => (
													<NativeSelectOption key={group.id} value={group.id}>
														{group.title}
													</NativeSelectOption>
												))}
											</NativeSelectOptGroup>
										</NativeSelect>
										<FieldDescription>
											Hilfe deinen Nutzern schneller eine passende Kostenstelle zu finden,
											indem du sie in Gruppen sortierst.
										</FieldDescription>
										<div>
											<DialogPrimitive.Trigger
												handle={createGroupHandle}
												render={
													<Button className={"w-fit -translate-x-2.5"} variant={"link"}>
														Neue Gruppe erstellen
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
											Beispiele
										</FieldLabel>
										<ExamplesInput
											onChange={field.handleChange}
											placeholder="z.B. Getränke "
											value={field.state.value}
										/>
										<FieldDescription>
											Beispiele können Nutzern helfen, besser zu verstehen ob sie die
											richtige Kostenstelle für Ihren Antrag gewählt haben.
										</FieldDescription>
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
							Cancel
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
							{isSubmitting ? "Saving…" : "Erstellen"}
						</Button>
					)}
				</form.Subscribe>
			</SheetFooter>
			<CreateCostUnitGroupSheet closeOnSuccess handle={createGroupHandle} />
		</>
	);
}

function CreateCostUnitFormSkeleton() {
	return (
		<>
			<SheetBody>
				<div className="space-y-5">
					{["Title", "Price", "Category"].map((label) => (
						<div className="space-y-2" key={label}>
							<Skeleton className="h-4 w-20" />
							<Skeleton className="h-10 w-full" />
						</div>
					))}
				</div>
			</SheetBody>
			<SheetFooter>
				<Skeleton className="h-10 w-32" />
			</SheetFooter>
		</>
	);
}

export function CreateCostUnitFormError({
	error,
	retry,
}: {
	error: Error;
	retry: () => void;
}) {
	return (
		<>
			<SheetBody>
				<div className="space-y-3">
					<p className="font-medium text-sm">Couldn&apos;t load the form</p>
					<p className="text-muted-foreground text-sm">{error.message}</p>
				</div>
			</SheetBody>
			<SheetFooter>
				<Button onClick={retry} variant="outline">
					Try again
				</Button>
			</SheetFooter>
		</>
	);
}

export {
	type CreateCostUnitHandle,
	CreateCostUnitSheet,
	CreateCostUnitSheetTrigger,
	createCreateCostUnitHandle,
};
