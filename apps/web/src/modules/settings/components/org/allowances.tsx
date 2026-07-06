"use client";

import { NumberField } from "@base-ui/react";
import { useForm } from "@tanstack/react-form";
import { toast } from "sonner";
import type z from "zod";
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
	InputGroupText,
} from "@/components/ui/input-group";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
	updateMealAllowancesSchema,
	updateTravelAllowancesSchema,
} from "@/lib/validators";
import { api } from "@/trpc/react";

function OrgSettingsAllowances() {
	return (
		<section className="container">
			<header className="flex flex-wrap items-start justify-between gap-8">
				<div className="space-y-1">
					<h1 className="font-bold text-2xl text-zinc-800">Zulagen & Abzüge</h1>
					<p className="text-sm text-zinc-700">
						Verwalte die Zulagen und Abzüge für Spesenanträge.
					</p>
				</div>
			</header>
			<section className="mt-12">
				<OrgTravelAllowancesContent />
			</section>
			<Separator className={"my-12"} />
			<section>
				<OrgMealAllowancesContent />
			</section>
		</section>
	);
}

/* begin OrgTravelAllowancesContent ===============================================================  */

function OrgTravelAllowancesContent({
	className,
	...props
}: React.ComponentProps<"div">) {
	const orgQuery = api.settings.get.useQuery();

	if (orgQuery.isPending) {
		return <OrgTravelAllowancesSkeleton className={className} {...props} />;
	}

	if (orgQuery.error) {
		return <OrgTravelAllowancesError className={className} {...props} />;
	}

	const { data } = orgQuery;

	return (
		<div className={cn("", className)} data-slot="component" {...props}>
			<OrgTravelAllowancesForm
				defaultValues={{
					kilometerRate: data.kilometerRate,
				}}
			/>
		</div>
	);
}

type UpdateOrgTravelAllowancesFormValues = z.infer<
	typeof updateTravelAllowancesSchema
>;

const UPDATE_TRAVEL_ALLOWANCES_FORM_ID = "org-update-food-allowances-form";

function OrgTravelAllowancesForm({
	className,
	defaultValues,
	...props
}: React.ComponentProps<"form"> & {
	defaultValues: UpdateOrgTravelAllowancesFormValues;
}) {
	const utils = api.useUtils();

	const updateMutation = api.settings.updateTravelAllowances.useMutation({
		onSuccess: () => {
			toast.success("Einstellungen wurden erfolgreich gespeichert");
			utils.settings.get.invalidate();
			form.reset();
		},
		onError: (error) => {
			toast.error("Einstellungen konnten nicht gespeichert werden", {
				description: error.message ?? "Ein unbekannter Fehler ist aufgetreten",
			});
		},
	});

	const form = useForm({
		defaultValues,
		validators: {
			onSubmit: updateTravelAllowancesSchema,
		},
		onSubmit: ({ value }) => {
			updateMutation.mutate(value);
		},
	});

	return (
		<form
			className={cn(className)}
			id={UPDATE_TRAVEL_ALLOWANCES_FORM_ID}
			onSubmit={(e) => {
				e.preventDefault();
				form.handleSubmit();
			}}
			{...props}
		>
			<FieldGroup>
				<form.Field name={"kilometerRate"}>
					{({ state, ...field }) => {
						const isInvalid = !state.meta.isValid && state.meta.isTouched;

						return (
							<Field data-invalid={isInvalid}>
								<FieldLabel htmlFor={field.name}>Kilometerpauschale</FieldLabel>
								<NumberField.Root
									format={{
										style: "decimal",
										minimumFractionDigits: 2,
										maximumFractionDigits: 2,
									}}
									locale={"de-DE"}
									onBlur={field.handleBlur}
									onValueChange={(value) => field.handleChange(value ?? 0)}
									value={state.value}
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
								<FieldDescription>
									Dieser Betrag wird pro Kilometer für Reise-Ausgaben berechnet.
								</FieldDescription>
								{isInvalid && <FieldError errors={state.meta.errors} />}
							</Field>
						);
					}}
				</form.Field>
				<div className="flex justify-end">
					<form.Subscribe
						selector={(s) => ({
							canSubmit: s.canSubmit,
							isSubmitting: s.isSubmitting,
							isDefaultValue: s.isDefaultValue,
						})}
					>
						{({ canSubmit, isSubmitting, isDefaultValue }) => (
							<Button
								disabled={
									!canSubmit ||
									isSubmitting ||
									isDefaultValue ||
									updateMutation.isPending
								}
								form={UPDATE_TRAVEL_ALLOWANCES_FORM_ID}
								size={"sm"}
								type="submit"
							>
								Speichern
							</Button>
						)}
					</form.Subscribe>
				</div>
			</FieldGroup>
		</form>
	);
}

function OrgTravelAllowancesSkeleton({
	className,
	...props
}: React.ComponentProps<"div">) {
	return (
		<div
			className={cn("", className)}
			data-slot="org-travel-allowances-content-skeleton"
			{...props}
		/>
	);
}

function OrgTravelAllowancesError({
	className,
	...props
}: React.ComponentProps<"div">) {
	return (
		<div
			className={cn("", className)}
			data-slot="org-travel-allowances-content-skeleton"
			{...props}
		/>
	);
}

/* end OrgTravelAllowancesContent =================================================================  */

/* begin OrgMealAllowancesContent =================================================================  */

function OrgMealAllowancesContent({
	className,
	...props
}: React.ComponentProps<"div">) {
	const orgQuery = api.settings.get.useQuery();

	if (orgQuery.isPending) {
		return <OrgMealAllowancesSkeleton className={className} {...props} />;
	}

	if (orgQuery.error) {
		return <OrgMealAllowancesError className={className} {...props} />;
	}

	const { data } = orgQuery;

	return (
		<div className={cn("", className)} data-slot="component" {...props}>
			<OrgMealAllowancesForm
				defaultValues={{
					breakfastDeduction: data.breakfastDeduction,
					dailyFoodAllowance: data.dailyFoodAllowance,
					dinnerDeduction: data.dinnerDeduction,
					lunchDeduction: data.lunchDeduction,
				}}
			/>
		</div>
	);
}

type UpdateOrgMealAllowancesFormValues = z.infer<
	typeof updateMealAllowancesSchema
>;

const UPDATE_MEAL_ALLOWANCES_FORM_ID = "org-update-meal-allowances-form";

function OrgMealAllowancesForm({
	className,
	defaultValues,
	...props
}: React.ComponentProps<"form"> & {
	defaultValues: UpdateOrgMealAllowancesFormValues;
}) {
	const utils = api.useUtils();

	const updateMutation = api.settings.updateMealAllowances.useMutation({
		onSuccess: () => {
			toast.success("Einstellungen wurden erfolgreich gespeichert");
			utils.settings.get.invalidate();
			form.reset();
		},
		onError: (error) => {
			toast.error("Einstellungen konnten nicht gespeichert werden", {
				description: error.message ?? "Ein unbekannter Fehler ist aufgetreten",
			});
		},
	});

	const form = useForm({
		defaultValues,
		validators: {
			onSubmit: updateMealAllowancesSchema,
		},
		onSubmit: ({ value }) => {
			updateMutation.mutate(value);
		},
	});

	return (
		<form
			className={cn(className)}
			id={UPDATE_MEAL_ALLOWANCES_FORM_ID}
			onSubmit={(e) => {
				e.preventDefault();
				form.handleSubmit();
			}}
			{...props}
		>
			<FieldGroup>
				<FieldGroup className="grid grid-cols-1 gap-8 md:grid-cols-2">
					<form.Field name="dailyFoodAllowance">
						{(field) => {
							const isInvalid =
								field.state.meta.isTouched && !field.state.meta.isValid;
							return (
								<Field className="md:col-span-2" data-invalid={isInvalid}>
									<FieldLabel htmlFor={field.name}>
										Tägliche Verpflegungszulage
									</FieldLabel>
									<NumberField.Root
										format={{
											style: "decimal",
											minimumFractionDigits: 2,
											maximumFractionDigits: 2,
										}}
										locale={"de-DE"}
										onBlur={field.handleBlur}
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
									<FieldDescription>
										Dieser Betrag wird pro Tag für die Verpflegung erhoben.
									</FieldDescription>
									{isInvalid && <FieldError errors={field.state.meta.errors} />}
								</Field>
							);
						}}
					</form.Field>
					<form.Field name="breakfastDeduction">
						{(field) => {
							const isInvalid =
								field.state.meta.isTouched && !field.state.meta.isValid;
							return (
								<Field data-invalid={isInvalid}>
									<FieldLabel htmlFor={field.name}>Morgenstückabzug</FieldLabel>
									<NumberField.Root
										format={{
											style: "decimal",
											minimumFractionDigits: 2,
											maximumFractionDigits: 2,
										}}
										locale={"de-DE"}
										onBlur={field.handleBlur}
										onValueChange={(value) => field.handleChange(value ?? 0)}
										value={field.state.value}
									>
										<NumberField.Group>
											<InputGroup className="overflow-hidden">
												<InputGroupAddon align="inline-start">
													<InputGroupText>-</InputGroupText>
												</InputGroupAddon>
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
					</form.Field>
					<form.Field name="lunchDeduction">
						{(field) => {
							const isInvalid =
								field.state.meta.isTouched && !field.state.meta.isValid;
							return (
								<Field data-invalid={isInvalid}>
									<FieldLabel htmlFor={field.name}>Mittagessenabzug</FieldLabel>
									<NumberField.Root
										format={{
											style: "decimal",
											minimumFractionDigits: 2,
											maximumFractionDigits: 2,
										}}
										locale={"de-DE"}
										onBlur={field.handleBlur}
										onValueChange={(value) => field.handleChange(value ?? 0)}
										value={field.state.value}
									>
										<NumberField.Group>
											<InputGroup className="overflow-hidden">
												<InputGroupAddon align="inline-start">
													<InputGroupText>-</InputGroupText>
												</InputGroupAddon>
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
					</form.Field>
					<form.Field name="dinnerDeduction">
						{(field) => {
							const isInvalid =
								field.state.meta.isTouched && !field.state.meta.isValid;
							return (
								<Field data-invalid={isInvalid}>
									<FieldLabel htmlFor={field.name}>Abendessenabzug</FieldLabel>
									<NumberField.Root
										format={{
											style: "decimal",
											minimumFractionDigits: 2,
											maximumFractionDigits: 2,
										}}
										locale={"de-DE"}
										onBlur={field.handleBlur}
										onValueChange={(value) => field.handleChange(value ?? 0)}
										value={field.state.value}
									>
										<NumberField.Group>
											<InputGroup className="overflow-hidden">
												<InputGroupAddon align="inline-start">
													<InputGroupText>-</InputGroupText>
												</InputGroupAddon>
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
					</form.Field>
				</FieldGroup>
				<div className="flex justify-end">
					<form.Subscribe
						selector={(s) => ({
							canSubmit: s.canSubmit,
							isSubmitting: s.isSubmitting,
							isDefaultValue: s.isDefaultValue,
						})}
					>
						{({ canSubmit, isSubmitting, isDefaultValue }) => (
							<Button
								disabled={
									!canSubmit ||
									isSubmitting ||
									isDefaultValue ||
									updateMutation.isPending
								}
								form={UPDATE_MEAL_ALLOWANCES_FORM_ID}
								size={"sm"}
								type="submit"
							>
								Speichern
							</Button>
						)}
					</form.Subscribe>
				</div>
			</FieldGroup>
		</form>
	);
}

function OrgMealAllowancesSkeleton({
	className,
	...props
}: React.ComponentProps<"div">) {
	return (
		<div
			className={cn("", className)}
			data-slot="org-meal-allowances-content-skeleton"
			{...props}
		/>
	);
}

function OrgMealAllowancesError({
	className,
	...props
}: React.ComponentProps<"div">) {
	return (
		<div
			className={cn("", className)}
			data-slot="org-meal-allowances-content-skeleton"
			{...props}
		/>
	);
}

/* end OrgMealAllowancesContent ===================================================================  */

export { OrgSettingsAllowances };
