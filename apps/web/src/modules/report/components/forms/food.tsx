"use client";

import { NumberField } from "@base-ui/react";
import { useForm, useStore } from "@tanstack/react-form";
import { differenceInDays, formatDate, isValid, parse } from "date-fns";
import React from "react";
import { toast } from "sonner";
import { DatePicker } from "@/components/date-picker";
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
	InputGroup,
	InputGroupAddon,
	InputGroupInput,
	InputGroupText,
} from "@/components/ui/input-group";
import { Textarea } from "@/components/ui/textarea";
import { createFoodExpenseSchema } from "@/lib/validators";
import { api } from "@/trpc/react";

export function CreateFoodExpenseForm({
	reportId,
	onSuccess,
	...props
}: React.ComponentProps<"form"> & {
	reportId: string;
	onSuccess?: () => void;
}) {
	const [settings] = api.settings.get.useSuspenseQuery();
	const utils = api.useUtils();
	const createTravel = api.expense.createFood.useMutation({
		onSuccess: () => {
			utils.expense.invalidate();
			toast.success("Ausgabe erfolgreich erstellt");
			onSuccess?.();
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
			type: "TRAVEL",
			reportId,
			days: 0,
			breakfastDeduction: 0,
			lunchDeduction: 0,
			dinnerDeduction: 0,
		},
		validators: {
			onSubmit: createFoodExpenseSchema,
		},
		onSubmit: ({ value }) => {
			createTravel.mutate({
				...value,
				type: "FOOD",
			});
		},
	});

	const {
		startDate,
		endDate,
		days,
		breakfastDeduction,
		lunchDeduction,
		dinnerDeduction,
	} = useStore(form.store, (state) => ({
		startDate: state.values.startDate,
		endDate: state.values.endDate,
		days: state.values.days,
		breakfastDeduction: state.values.breakfastDeduction,
		lunchDeduction: state.values.lunchDeduction,
		dinnerDeduction: state.values.dinnerDeduction,
	}));

	React.useEffect(() => {
		const start = parse(startDate, "dd.MM.yyyy", new Date());
		const end = parse(endDate, "dd.MM.yyyy", new Date());

		if (!isValid(start) || !isValid(end)) return;

		const days = differenceInDays(end, start) + 1;

		if (days < 1) return;

		form.setFieldValue("days", days);
	}, [startDate, endDate, form]);

	React.useEffect(() => {
		const amount =
			settings.dailyFoodAllowance * days -
			(breakfastDeduction * settings.breakfastDeduction +
				lunchDeduction * settings.lunchDeduction +
				dinnerDeduction * settings.dinnerDeduction);

		form.setFieldValue("amount", amount);
	}, [
		days,
		breakfastDeduction,
		lunchDeduction,
		dinnerDeduction,
		settings,
		form,
	]);

	return (
		<form
			className="grid gap-4"
			id="form-create-travel-expense"
			onSubmit={(e) => {
				e.preventDefault();
				form.handleSubmit();
			}}
			{...props}
		>
			<FieldGroup className="grid gap-4 md:grid-cols-3">
				<form.Field
					children={(field) => {
						const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
						return (
							<Field className="md:col-span-3" data-invalid={isInvalid}>
								<FieldLabel htmlFor={field.name}>Beschreibung</FieldLabel>
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
									Beschreibung der Ausgabe oder Kommentar
								</FieldDescription>
								{isInvalid && <FieldError errors={field.state.meta.errors} />}
							</Field>
						);
					}}
					name="description"
				/>

				<form.Field
					children={(field) => {
						const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
						return (
							<Field data-invalid={isInvalid}>
								<FieldLabel htmlFor={field.name}>Startdatum</FieldLabel>
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
						const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
						return (
							<Field data-invalid={isInvalid}>
								<FieldLabel htmlFor={field.name}>Enddatum</FieldLabel>
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
						const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
						return (
							<Field data-invalid={isInvalid}>
								<FieldLabel htmlFor={field.name}>Dauer</FieldLabel>
								<NumberField.Root
									disabled
									format={{
										minimumFractionDigits: 0,
										maximumFractionDigits: 0,
									}}
									locale={"de-DE"}
									value={field.state.value}
								>
									<NumberField.Group>
										<InputGroup className="overflow-hidden opacity-100!">
											<NumberField.Input
												render={
													<InputGroupInput
														aria-invalid={isInvalid}
														autoComplete="off"
														className="aria-disabled:opacity-100"
														disabled
														id={field.name}
														inputMode="decimal"
														name={field.name}
														placeholder="0"
														readOnly
													/>
												}
											/>
											<InputGroupAddon align={"inline-end"}>
												<InputGroupText>Tage</InputGroupText>
											</InputGroupAddon>
										</InputGroup>
									</NumberField.Group>
								</NumberField.Root>
								{isInvalid && <FieldError errors={field.state.meta.errors} />}
							</Field>
						);
					}}
					name="days"
				/>
				<form.Field
					children={(field) => {
						const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
						return (
							<Field data-invalid={isInvalid}>
								<FieldLabel htmlFor={field.name}>Frühstücksabzug</FieldLabel>
								<NumberField.Root
									format={{
										minimumFractionDigits: 0,
										maximumFractionDigits: 0,
									}}
									locale={"de-DE"}
									onBlur={field.handleBlur}
									onValueChange={(value) => {
										field.handleChange(value ?? 0);
									}}
									value={field.state.value}
								>
									<NumberField.Group>
										<NumberField.Input
											render={
												<Input
													aria-invalid={isInvalid}
													autoComplete="off"
													className="aria-disabled:opacity-100"
													id={field.name}
													inputMode="numeric"
													name={field.name}
													placeholder="0"
												/>
											}
										/>
									</NumberField.Group>
								</NumberField.Root>
								<FieldDescription>
									Automatisch berechnet: - {settings.breakfastDeduction.toFixed(2)} € pro
									Tag
								</FieldDescription>
								{isInvalid && <FieldError errors={field.state.meta.errors} />}
							</Field>
						);
					}}
					name="breakfastDeduction"
				/>
				<form.Field
					children={(field) => {
						const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
						return (
							<Field data-invalid={isInvalid}>
								<FieldLabel htmlFor={field.name}>Mittagessenabzug</FieldLabel>
								<NumberField.Root
									format={{
										minimumFractionDigits: 0,
										maximumFractionDigits: 0,
									}}
									locale={"de-DE"}
									onBlur={field.handleBlur}
									onValueChange={(value) => {
										field.handleChange(value ?? 0);
									}}
									value={field.state.value}
								>
									<NumberField.Group>
										<NumberField.Input
											render={
												<Input
													aria-invalid={isInvalid}
													autoComplete="off"
													className="aria-disabled:opacity-100"
													id={field.name}
													inputMode="numeric"
													name={field.name}
													placeholder="0"
												/>
											}
										/>
									</NumberField.Group>
								</NumberField.Root>
								<FieldDescription>
									Automatisch berechnet: - {settings.lunchDeduction.toFixed(2)} € pro Tag
								</FieldDescription>
								{isInvalid && <FieldError errors={field.state.meta.errors} />}
							</Field>
						);
					}}
					name="lunchDeduction"
				/>
				<form.Field
					children={(field) => {
						const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
						return (
							<Field data-invalid={isInvalid}>
								<FieldLabel htmlFor={field.name}>Abendessenabzug</FieldLabel>
								<NumberField.Root
									format={{
										minimumFractionDigits: 0,
										maximumFractionDigits: 0,
									}}
									locale={"de-DE"}
									onBlur={field.handleBlur}
									onValueChange={(value) => {
										field.handleChange(value ?? 0);
									}}
									value={field.state.value}
								>
									<NumberField.Group>
										<NumberField.Input
											render={
												<Input
													aria-invalid={isInvalid}
													autoComplete="off"
													className="aria-disabled:opacity-100"
													id={field.name}
													inputMode="numeric"
													name={field.name}
													placeholder="0"
												/>
											}
										/>
									</NumberField.Group>
								</NumberField.Root>
								<FieldDescription>
									Automatisch berechnet: - {settings.dinnerDeduction.toFixed(2)} € pro
									Tag
								</FieldDescription>
								{isInvalid && <FieldError errors={field.state.meta.errors} />}
							</Field>
						);
					}}
					name="dinnerDeduction"
				/>
				<form.Field
					children={(field) => {
						const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
						return (
							<Field className="md:col-span-3" data-invalid={isInvalid}>
								<FieldLabel htmlFor={field.name}>Betrag</FieldLabel>
								<NumberField.Root
									disabled
									format={{
										style: "decimal",
										minimumFractionDigits: 2,
										maximumFractionDigits: 2,
									}}
									locale={"de-DE"}
									value={field.state.value}
								>
									<NumberField.Group>
										<InputGroup className="overflow-hidden opacity-100!">
											<NumberField.Input
												render={
													<InputGroupInput
														aria-invalid={isInvalid}
														autoComplete="off"
														className="aria-disabled:opacity-100"
														disabled
														id={field.name}
														inputMode="decimal"
														name={field.name}
														placeholder="0,00"
														readOnly
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
									Automatisch berechnet: {settings.dailyFoodAllowance.toFixed(2)} € pro
									Tag - Abzüge
								</FieldDescription>
								{isInvalid && <FieldError errors={field.state.meta.errors} />}
							</Field>
						);
					}}
					name="amount"
				/>
			</FieldGroup>
			<FieldGroup>
				<Button
					disabled={createTravel.isPending}
					form="form-create-travel-expense"
					type="submit"
				>
					Erstellen
				</Button>
			</FieldGroup>
		</form>
	);
}
