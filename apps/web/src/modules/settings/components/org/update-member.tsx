"use client";

import { Dialog as DialogPrimitive } from "@base-ui/react";
import { useForm } from "@tanstack/react-form";
import { format } from "date-fns";
import { CircleIcon } from "lucide-react";
import type React from "react";
import { toast } from "sonner";
import z from "zod";
import { AsyncBoundary } from "@/components/async-boundary";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
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
import { cn } from "@/lib/utils";
import { api } from "@/trpc/react";
import { SheetFormError, SheetFormSkeleton } from "./sheet-form-state";

const updateMemberSchema = z.object({
	id: z.string(),
	name: z.string(),
	email: z.string(),
	role: z.literal(["member", "admin"]),
	createdAt: z.string(),
});

type UpdateMemberPayload = { id: string } | undefined;
type UpdateMemberHandle = ReturnType<
	typeof DialogPrimitive.createHandle<UpdateMemberPayload>
>;
type UpdateMemberFormValues = z.infer<typeof updateMemberSchema>;

const FORM_ID = "update-member";
const MEMBER_FORM_FIELD_COUNT = 4;

function createUpdateMemberHandle() {
	return DialogPrimitive.createHandle<UpdateMemberPayload>();
}

function UpdateMemberSheet({
	handle,
	...props
}: Omit<React.ComponentProps<typeof Sheet>, "handle"> & {
	handle: UpdateMemberHandle;
}) {
	return (
		<DialogPrimitive.Root {...props} handle={handle}>
			{({ payload }) => (
				<SheetContent className={"data-nested-dialog-open:blur-xs"}>
					<SheetHeader>
						<SheetTitle>Edit Member</SheetTitle>
					</SheetHeader>

					{payload ? (
						<AsyncBoundary
							// SECTION 3 — keying on the entity id remounts queries + form
							// when a different row opens the sheet. Fresh seed every time;
							// you never manually reset form state.
							key={payload.id}
							pending={<SheetFormSkeleton fieldCount={MEMBER_FORM_FIELD_COUNT} />}
							rejected={({ error, retry }) => (
								<SheetFormError error={error} retry={retry} />
							)}
						>
							<UpdateCostUnitFormConnected handle={handle} memberId={payload.id} />
						</AsyncBoundary>
					) : null}
				</SheetContent>
			)}
		</DialogPrimitive.Root>
	);
}

function UpdateCostUnitFormConnected({
	memberId,
	handle,
}: {
	memberId: string;
	handle: UpdateMemberHandle;
}) {
	const utils = api.useUtils();

	const [membership] = api.settings.getMembershipDetails.useSuspenseQuery({
		id: memberId,
	});

	const setRole = api.user.setMemberRole.useMutation({
		onSuccess: () => {
			toast.success("Rolle wurde erfolgreich aktualisiert", {});
			utils.settings.listMembers.invalidate();
			utils.settings.getMembershipDetails.invalidate({ id: memberId });
			handle.close();
		},
		onError: (error) => {
			toast.error("Fehler beim Aktualisieren der Rolle", {
				description: error.message ?? "Ein unbekannter Fehler ist aufgetreten",
			});
		},
	});

	return (
		<UpdateMemberForm
			defaultValues={{
				id: membership?.id,
				role: (membership.role.split(",")[0] as "member" | "admin") ?? "member",
				email: membership.user.email,
				name: membership.user.name,
				createdAt: format(membership.createdAt, "dd.MM.yyyy, HH:mm"),
			}}
			onSubmit={async (values) => {
				await setRole.mutateAsync({
					memberId: values.id,
					role: values.role,
				});
			}}
		/>
	);
}

type UpdateMemberFormProps = {
	defaultValues: UpdateMemberFormValues;

	onSubmit: (values: UpdateMemberFormValues) => Promise<void> | void;
};

function UpdateMemberForm({ defaultValues, onSubmit }: UpdateMemberFormProps) {
	const form = useForm({
		defaultValues,
		validators: {
			onSubmit: updateMemberSchema,
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
						<form.Field name="name">
							{(field) => {
								const isInvalid =
									field.state.meta.isTouched && !field.state.meta.isValid;
								return (
									<Field data-invalid={isInvalid}>
										<FieldLabel
											className="mb-1 font-semibold text-base text-slate-800"
											htmlFor={field.name}
										>
											Name
										</FieldLabel>
										<Input
											disabled
											id={field.name}
											placeholder="Name"
											value={field.state.value}
										/>
									</Field>
								);
							}}
						</form.Field>
						<form.Field name="email">
							{(field) => {
								const isInvalid =
									field.state.meta.isTouched && !field.state.meta.isValid;
								return (
									<Field data-invalid={isInvalid}>
										<FieldLabel
											className="mb-1 font-semibold text-base text-slate-800"
											htmlFor={field.name}
										>
											E-Mail
										</FieldLabel>
										<Input
											disabled
											id={field.name}
											placeholder="E-Mail"
											value={field.state.value}
										/>
									</Field>
								);
							}}
						</form.Field>
						<form.Field name="createdAt">
							{(field) => {
								const isInvalid =
									field.state.meta.isTouched && !field.state.meta.isValid;
								return (
									<Field data-invalid={isInvalid}>
										<FieldLabel
											className="mb-1 font-semibold text-base text-slate-800"
											htmlFor={field.name}
										>
											Beigetreten
										</FieldLabel>
										<Input
											disabled
											id={field.name}
											placeholder="E-Mail"
											value={field.state.value}
										/>
									</Field>
								);
							}}
						</form.Field>
						<form.Field name="role">
							{({ state, ...field }) => {
								const isInvalid = state.meta.isTouched && !state.meta.isValid;
								return (
									<Field data-invalid={isInvalid}>
										<FieldLabel
											className="mb-1 font-semibold text-base text-slate-800"
											htmlFor={field.name}
										>
											Rolle
										</FieldLabel>
										<Select
											items={{
												member: "Mitglied",
												admin: "Administrator",
											}}
											onValueChange={(value) => field.handleChange(value ?? "member")}
											value={state.value}
										>
											<SelectTrigger>
												<SelectValue placeholder="Wähle eine Rolle" />
											</SelectTrigger>
											<SelectContent>
												<SelectGroup>
													<SelectItem
														className={cn(
															"focus:bg-slate-100 focus:text-slate-800 not-data-[variant=destructive]:focus:**:text-slate-800",
															"**:data-[slot='item-text']:items-center",
														)}
														value={"admin"}
													>
														<CircleIcon className="size-2.5 text-white **:fill-blue-500 group-focus/item:**:text-slate-100!" />
														Admin
													</SelectItem>
													<SelectItem
														className={cn(
															"focus:bg-slate-100 focus:text-slate-800 not-data-[variant=destructive]:focus:**:text-slate-800",
															"**:data-[slot='item-text']:items-center",
														)}
														value={"member"}
													>
														<CircleIcon className="size-2.5 text-white **:fill-orange-500 group-focus/item:**:text-slate-100!" />
														Mitglied
													</SelectItem>
												</SelectGroup>
											</SelectContent>
										</Select>
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
						isDefaultValue: s.isDefaultValue,
					})}
				>
					{({ canSubmit, isSubmitting, isDefaultValue }) => (
						<Button
							disabled={!canSubmit || isSubmitting || isDefaultValue}
							form={FORM_ID}
							type="submit"
						>
							{isSubmitting ? "Saving…" : "Aktualisieren"}
						</Button>
					)}
				</form.Subscribe>
			</SheetFooter>
		</>
	);
}

export { createUpdateMemberHandle, type UpdateMemberHandle, UpdateMemberSheet };
