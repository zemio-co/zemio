"use client";

import { Dialog as DialogPrimitive } from "@base-ui/react";
import { useForm } from "@tanstack/react-form";
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
	type Sheet,
	SheetBody,
	SheetClose,
	SheetContent,
	SheetFooter,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";
import type { WithHandle } from "@/lib/types";
import { createCostUnitGroupSchema } from "@/lib/validators";
import { api } from "@/trpc/react";
import { SheetFormError, SheetFormSkeleton } from "./sheet-form-state";

type CreateCostUnitGroupFormValues = z.infer<typeof createCostUnitGroupSchema>;
type CreateCostUnitGroupHandle = ReturnType<
	typeof DialogPrimitive.createHandle
>;

const FORM_ID = "create-cost-unit-group";
const COST_UNIT_GROUP_FORM_FIELD_COUNT = 1;

function createCostUnitGroupCreateHandle(): CreateCostUnitGroupHandle {
	return DialogPrimitive.createHandle();
}

function CreateCostUnitGroupSheetTrigger({
	handle,
	...props
}: React.ComponentProps<typeof Button> & WithHandle) {
	return (
		<DialogPrimitive.Trigger
			data-slot="create-cost-unit-group-sheet-trigger"
			handle={handle}
			render={<Button {...props} />}
		/>
	);
}

function CreateCostUnitGroupSheet({
	handle,
	closeOnSuccess,
	...props
}: Omit<React.ComponentProps<typeof Sheet>, "handle"> &
	WithHandle & {
		closeOnSuccess?: boolean;
	}) {
	return (
		<DialogPrimitive.Root handle={handle} {...props}>
			<SheetContent>
				<SheetHeader>
					<SheetTitle>Neue Kostenstellengruppe</SheetTitle>
				</SheetHeader>

				<AsyncBoundary
					pending={
						<SheetFormSkeleton fieldCount={COST_UNIT_GROUP_FORM_FIELD_COUNT} />
					}
					rejected={({ error, retry }) => (
						<SheetFormError error={error} retry={retry} />
					)}
				>
					<CreateCostUnitGroupFormConnected
						closeOnSuccess={closeOnSuccess}
						handle={handle}
					/>
				</AsyncBoundary>
			</SheetContent>
		</DialogPrimitive.Root>
	);
}

function CreateCostUnitGroupFormConnected({
	handle,
	closeOnSuccess,
}: WithHandle & {
	closeOnSuccess?: boolean;
}) {
	const utils = api.useUtils();

	const create = api.costUnit.createGroup.useMutation({
		onSuccess: (value) => {
			toast.success("Kostenstellengruppe wurde erfolgreich erstellt", {
				description: `${value.title}`,
			});
			utils.costUnit.listGroups.invalidate();

			closeOnSuccess && handle.close();
		},
		onError: (error) => {
			toast.error("Fehler beim Erstellen der Kostenstellengruppe", {
				description: error.message ?? "Ein unbekannter Fehler ist aufgetreten",
			});
		},
	});

	return (
		<CreateCostUnitGroupForm
			onSubmit={async (values) => {
				await create.mutateAsync(values);
			}}
		/>
	);
}

type CreateCostUnitGroupFormProps = {
	onSubmit: (values: CreateCostUnitGroupFormValues) => Promise<void>;
};

function CreateCostUnitGroupForm({ onSubmit }: CreateCostUnitGroupFormProps) {
	const form = useForm({
		defaultValues: {
			title: "",
		} as CreateCostUnitGroupFormValues,
		validators: {
			onSubmit: createCostUnitGroupSchema,
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
					<FieldGroup>
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
											Gruppenname
										</FieldLabel>
										<Input
											aria-invalid={isInvalid}
											id={field.name}
											name={field.name}
											onBlur={field.handleBlur}
											onChange={(e) => field.handleChange(e.target.value)}
											placeholder="Projekte, Werbung, Sonstiges..."
											value={field.state.value}
										/>
										{isInvalid && <FieldError errors={field.state.meta.errors} />}
									</Field>
								);
							}}
						</form.Field>
						<FieldDescription className="col-span-2">
							Hilfe deinen Nutzern schneller eine passende Kostenstelle zu finden,
							indem du sie in Gruppen sortierst. Titel ist öffentlich sichtbar.
						</FieldDescription>
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
		</>
	);
}

export {
	type CreateCostUnitGroupHandle,
	CreateCostUnitGroupSheet,
	CreateCostUnitGroupSheetTrigger,
	createCostUnitGroupCreateHandle,
};
