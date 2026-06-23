"use client";

import { NumberField } from "@base-ui/react";
import { useForm, useStore } from "@tanstack/react-form";
import { formatDate } from "date-fns";
import { useRouter } from "next/navigation";
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
} from "@/components/ui/input-group";
import { Textarea } from "@/components/ui/textarea";
import { ROUTES } from "@/lib/consts";
import { createTravelExpenseSchema } from "@/lib/validators";
import { api } from "@/trpc/react";

export function CreateTravelExpenseForm({
	reportId,
	...props
}: React.ComponentProps<"form"> & {
	reportId: string;
}) {
	const [settings] = api.settings.get.useSuspenseQuery();

	const utils = api.useUtils();
	const router = useRouter();
	const createTravel = api.expense.createTravel.useMutation({
		onSuccess: () => {
			toast.success("Ausgabe erfolgreich erstellt");
			utils.expense.invalidate();
			router.push(ROUTES.REPORT_DETAIL(reportId));
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
			from: "",
			to: "",
			distance: 0,
		},
		validators: {
			onSubmit: createTravelExpenseSchema,
		},
		onSubmit: ({ value }) => {
			createTravel.mutate({
				amount: value.amount,
				description: value.description,
				startDate: value.startDate,
				endDate: value.endDate,
				type: "TRAVEL",
				reportId,
				from: value.from,
				to: value.to,
				distance: value.distance,
			});
		},
	});

	const { distance } = useStore(form.store, (state) => ({
		distance: state.values.distance,
	}));

	React.useEffect(() => {
		const amount = distance * settings.kilometerRate;
		form.setFieldValue("amount", amount);
	}, [distance, settings.kilometerRate, form]);

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
			<FieldGroup className="grid gap-4 md:grid-cols-2">
				<form.Field
					children={(field) => {
						const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
						return (
							<Field className="md:col-span-2" data-invalid={isInvalid}>
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
								<FieldLabel htmlFor={field.name}>Startpunkt</FieldLabel>
								<Input
									aria-invalid={isInvalid}
									autoComplete="off"
									id={field.name}
									name={field.name}
									onBlur={field.handleBlur}
									onChange={(e) => field.handleChange(e.target.value)}
									placeholder="Münster"
									value={field.state.value}
								/>
								{isInvalid && <FieldError errors={field.state.meta.errors} />}
							</Field>
						);
					}}
					name="from"
				/>
				<form.Field
					children={(field) => {
						const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
						return (
							<Field data-invalid={isInvalid}>
								<FieldLabel htmlFor={field.name}>Endpunkt</FieldLabel>
								<Input
									aria-invalid={isInvalid}
									autoComplete="off"
									id={field.name}
									name={field.name}
									onBlur={field.handleBlur}
									onChange={(e) => field.handleChange(e.target.value)}
									placeholder="Berlin"
									value={field.state.value}
								/>
								{isInvalid && <FieldError errors={field.state.meta.errors} />}
							</Field>
						);
					}}
					name="to"
				/>
				<form.Field
					children={(field) => {
						const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
						return (
							<Field className="md:col-span-2" data-invalid={isInvalid}>
								<FieldLabel htmlFor={field.name}>Strecke</FieldLabel>
								<NumberField.Root
									format={{
										style: "decimal",
										minimumFractionDigits: 0,
										maximumFractionDigits: 2,
									}}
									locale={"de-DE"}
									onValueChange={(value) => field.handleChange(value ?? 0)}
									value={field.state.value}
								>
									<NumberField.Group>
										<InputGroup className="overflow-hidden">
											<NumberField.Input
												render={
													<InputGroupInput
														aria-invalid={isInvalid}
														autoComplete="off"
														id={field.name}
														inputMode="decimal"
														name={field.name}
														onBlur={field.handleBlur}
														placeholder="123,00"
													/>
												}
											/>
											<InputGroupAddon align={"inline-end"}>km</InputGroupAddon>
										</InputGroup>
									</NumberField.Group>
								</NumberField.Root>
								<FieldDescription>Abgelegte Strecke in km</FieldDescription>
								{isInvalid && <FieldError errors={field.state.meta.errors} />}
							</Field>
						);
					}}
					name="distance"
				/>
				<form.Field
					children={(field) => {
						const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
						return (
							<Field className="md:col-span-2" data-invalid={isInvalid}>
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
									Automatisch berechnet: {settings.kilometerRate.toFixed(2)} € pro
									Kilometer
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
