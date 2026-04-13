"use client";

import { NumberField } from "@base-ui/react";
import { useForm } from "@tanstack/react-form";
import { toast } from "sonner";
import {
	Box,
	BoxItem,
	BoxItemContent,
	BoxItemDescription,
	BoxItemTitle,
} from "@/components/box";
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
import { Switch } from "@/components/ui/switch";
import {
	updateMealAllowancesSchema,
	updateTravelAllowancesSchema,
} from "@/lib/validators";
import { api } from "@/trpc/react";

function OrgSettingsAllowances() {
	return (
		<main>
			<div className="space-y-1">
				<h1 className="font-semibold text-lg text-zinc-800">Zulagen & Abzüge</h1>
				<p className="text-sm text-zinc-600">
					Verwalte die Zulagen und Abzüge für Spesenanträge.
				</p>
			</div>
			<div className="mt-12">
				<div className="mb-3 flex flex-wrap items-end justify-between gap-4">
					<p className="font-medium text-xs text-zinc-600">Reisepauschale</p>
				</div>
				<TravelAllowances />
			</div>
			<div className="mt-12">
				<div className="mb-3 flex flex-wrap items-end justify-between gap-4">
					<p className="font-medium text-xs text-zinc-600">Verpflegungspauschale</p>
				</div>
				<MealAllowances />
			</div>
		</main>
	);
}

function TravelAllowances() {
	const utils = api.useUtils();
	const [settings] = api.settings.get.useSuspenseQuery();

	const updateTravelAllowances = api.settings.updateTravelAllowances.useMutation(
		{
			onSuccess: () => {
				toast.success("Zulagen erfolgreich aktualisiert");
				utils.settings.get.invalidate();
			},
			onError: (error) => {
				toast.error("Fehler beim Aktualisieren der Zulagen", {
					description: error.message ?? "Ein unerwarteter Fehler ist aufgetreten",
				});
			},
		},
	);

	const form = useForm({
		defaultValues: {
			kilometerRate: settings.kilometerRate,
		},
		validators: {
			onSubmit: updateTravelAllowancesSchema,
		},
		onSubmit: (value) => {
			updateTravelAllowances.mutate(value.value);
		},
	});

	return (
		<Box>
			<BoxItem variant="grid">
				<BoxItemContent>
					<BoxItemTitle>Verpflegungspauschalen aktiviert</BoxItemTitle>
					<BoxItemDescription>
						Bestimmt ob Nutzer Verpflegungspauschalen einreichen können
					</BoxItemDescription>
				</BoxItemContent>
				<div className="flex w-full justify-end">
					<Switch checked={true} disabled />
				</div>
			</BoxItem>
			<BoxItem>
				<form
					className="w-full"
					id="form-travel-allowance"
					onSubmit={(e) => {
						e.preventDefault();
						form.handleSubmit();
					}}
				>
					<form.Field name="kilometerRate">
						{(field) => {
							const isInvalid =
								field.state.meta.isTouched && !field.state.meta.isValid;
							return (
								<Field className="grid grid-cols-2 gap-6" data-invalid={isInvalid}>
									<BoxItemContent>
										<FieldLabel htmlFor={field.name}>Kilometerpauschale</FieldLabel>
										<BoxItemDescription>
											Dieser Betrag wird pro Kilometer für Reise-Ausgaben berechnet.
										</BoxItemDescription>
									</BoxItemContent>
									<div className="space-y-4">
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
										{isInvalid && <FieldError errors={field.state.meta.errors} />}
										<div className="flex justify-end">
											<Button
												disabled={updateTravelAllowances.isPending}
												form="form-travel-allowance"
												type="submit"
											>
												Speichern
											</Button>
										</div>
									</div>
								</Field>
							);
						}}
					</form.Field>
				</form>
			</BoxItem>
		</Box>
	);
}

function MealAllowances() {
	const utils = api.useUtils();
	const [settings] = api.settings.get.useSuspenseQuery();

	const updateMealAllowances = api.settings.updateMealAllowances.useMutation({
		onSuccess: () => {
			toast.success("Zulagen erfolgreich aktualisiert");
			utils.settings.get.invalidate();
		},
		onError: (error) => {
			toast.error("Fehler beim Aktualisieren der Zulagen", {
				description: error.message ?? "Ein unerwarteter Fehler ist aufgetreten",
			});
		},
	});

	const form = useForm({
		defaultValues: {
			dailyFoodAllowance: settings.dailyFoodAllowance,
			breakfastDeduction: settings.breakfastDeduction,
			lunchDeduction: settings.lunchDeduction,
			dinnerDeduction: settings.dinnerDeduction,
		},
		validators: {
			onSubmit: updateMealAllowancesSchema,
		},
		onSubmit: (value) => {
			updateMealAllowances.mutate(value.value);
		},
	});

	return (
		<Box>
			<BoxItem variant="grid">
				<BoxItemContent>
					<BoxItemTitle>Verpflegungspauschalen aktiviert</BoxItemTitle>
					<BoxItemDescription>
						Bestimmt ob Nutzer Verpflegungspauschalen einreichen können
					</BoxItemDescription>
				</BoxItemContent>
				<div className="flex w-full justify-end">
					<Switch checked={true} disabled />
				</div>
			</BoxItem>
			<BoxItem className="items-start" variant="grid">
				<BoxItemContent className="h-fit">
					<BoxItemTitle>Einstellugnen</BoxItemTitle>
					<BoxItemDescription>
						Bestimme die Raten für die Verpflegungspauschale
					</BoxItemDescription>
				</BoxItemContent>
				<form
					className="w-full"
					id="form-meal-allowance"
					onSubmit={(e) => {
						e.preventDefault();
						form.handleSubmit();
					}}
				>
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
						<div className="flex justify-end md:col-span-2">
							<Button
								disabled={updateMealAllowances.isPending}
								form="form-meal-allowance"
								type="submit"
							>
								Speichern
							</Button>
						</div>
					</FieldGroup>
				</form>
			</BoxItem>
		</Box>
	);
}

export { OrgSettingsAllowances };
