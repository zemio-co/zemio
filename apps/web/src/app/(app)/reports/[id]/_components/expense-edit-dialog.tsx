"use client";

import { NumberField } from "@base-ui/react";
import { useForm, useStore } from "@tanstack/react-form";
import type { Attachment } from "@zemio/db";
import { differenceInDays, formatDate, isValid, parse } from "date-fns";
import React from "react";
import { toast } from "sonner";
import { DatePicker } from "@/components/date-picker";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	Field,
	FieldDescription,
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
import type { ClientExpense } from "@/lib/types";
import { translateExpenseType } from "@/lib/utils";
import {
	foodExpenseMetaSchema,
	travelExpenseMetaSchema,
} from "@/lib/validators";
import { api } from "@/trpc/react";

type EditableExpense = ClientExpense & { attachments: Partial<Attachment>[] };

export function ExpenseEditDialog({
	expense,
	open,
	onOpenChange,
}: {
	expense: EditableExpense;
	open: boolean;
	onOpenChange: (open: boolean) => void;
}) {
	return (
		<Dialog onOpenChange={onOpenChange} open={open}>
			<DialogContent className="max-w-xl sm:max-w-2xl">
				<DialogHeader>
					<DialogTitle>{translateExpenseType(expense.type)} bearbeiten</DialogTitle>
				</DialogHeader>
				{expense.type === "RECEIPT" && (
					<ReceiptEditForm expense={expense} onSuccess={() => onOpenChange(false)} />
				)}
				{expense.type === "TRAVEL" && (
					<TravelEditForm expense={expense} onSuccess={() => onOpenChange(false)} />
				)}
				{expense.type === "FOOD" && (
					<FoodEditForm expense={expense} onSuccess={() => onOpenChange(false)} />
				)}
			</DialogContent>
		</Dialog>
	);
}

function ReceiptEditForm({
	expense,
	onSuccess,
}: {
	expense: EditableExpense;
	onSuccess: () => void;
}) {
	const utils = api.useUtils();
	const updateExpense = api.expense.update.useMutation({
		onSuccess: () => {
			utils.expense.list.invalidate({ reportId: expense.reportId });
			toast.success("Ausgabe erfolgreich aktualisiert");
			onSuccess();
		},
		onError: (error) => {
			toast.error("Fehler beim Aktualisieren der Ausgabe", {
				description: error.message ?? "Ein unerwarteter Fehler ist aufgetreten",
			});
		},
	});

	const form = useForm({
		defaultValues: {
			description: expense.description ?? "",
			amount: expense.amount,
			startDate: formatDate(expense.startDate, "dd.MM.yyyy"),
			endDate: formatDate(expense.endDate, "dd.MM.yyyy"),
		},
		onSubmit: ({ value }) => {
			const startDate = parse(value.startDate, "dd.MM.yyyy", new Date());
			const endDate = parse(value.endDate, "dd.MM.yyyy", new Date());

			updateExpense.mutate({
				id: expense.id,
				description: value.description,
				amount: value.amount,
				startDate: isValid(startDate) ? startDate : undefined,
				endDate: isValid(endDate) ? endDate : undefined,
			});
		},
	});

	return (
		<form
			className="grid gap-4"
			onSubmit={(e) => {
				e.preventDefault();
				form.handleSubmit();
			}}
		>
			<FieldGroup className="grid gap-4 md:grid-cols-2">
				<form.Field name="description">
					{(field) => (
						<Field className="md:col-span-2">
							<FieldLabel htmlFor={field.name}>Beschreibung</FieldLabel>
							<Textarea
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
						</Field>
					)}
				</form.Field>

				<form.Field name="startDate">
					{(field) => (
						<Field>
							<FieldLabel htmlFor={field.name}>Startdatum</FieldLabel>
							<DatePicker
								id={field.name}
								name={field.name}
								onBlur={field.handleBlur}
								onChange={(date) => field.handleChange(date.target.value)}
								placeholder="01.01.2026"
								value={field.state.value}
							/>
						</Field>
					)}
				</form.Field>

				<form.Field name="endDate">
					{(field) => (
						<Field>
							<FieldLabel htmlFor={field.name}>Enddatum</FieldLabel>
							<DatePicker
								id={field.name}
								name={field.name}
								onBlur={field.handleBlur}
								onChange={(date) => field.handleChange(date.target.value)}
								placeholder="01.01.2026"
								value={field.state.value}
							/>
						</Field>
					)}
				</form.Field>

				<form.Field name="amount">
					{(field) => (
						<Field className="md:col-span-2">
							<FieldLabel htmlFor={field.name}>Betrag</FieldLabel>
							<NumberField.Root
								format={{
									style: "decimal",
									minimumFractionDigits: 2,
									maximumFractionDigits: 2,
								}}
								locale="de-DE"
								onValueChange={(value) => field.handleChange(value ?? 0)}
								value={field.state.value}
							>
								<NumberField.Group>
									<InputGroup className="overflow-hidden opacity-100!">
										<NumberField.Input
											render={
												<InputGroupInput
													autoComplete="off"
													id={field.name}
													inputMode="decimal"
													name={field.name}
													placeholder="0,00"
												/>
											}
										/>
										<InputGroupAddon
											align="inline-end"
											className="flex w-8 items-center justify-center overflow-hidden border-l bg-muted p-2"
										>
											<span>€</span>
										</InputGroupAddon>
									</InputGroup>
								</NumberField.Group>
							</NumberField.Root>
						</Field>
					)}
				</form.Field>
			</FieldGroup>
			<DialogFooter>
				<Button disabled={updateExpense.isPending} type="submit">
					{updateExpense.isPending ? "Wird gespeichert..." : "Speichern"}
				</Button>
			</DialogFooter>
		</form>
	);
}

function TravelEditForm({
	expense,
	onSuccess,
}: {
	expense: EditableExpense;
	onSuccess: () => void;
}) {
	const [settings] = api.settings.get.useSuspenseQuery();
	const utils = api.useUtils();
	const updateExpense = api.expense.update.useMutation({
		onSuccess: () => {
			utils.expense.list.invalidate({ reportId: expense.reportId });
			toast.success("Ausgabe erfolgreich aktualisiert");
			onSuccess();
		},
		onError: (error) => {
			toast.error("Fehler beim Aktualisieren der Ausgabe", {
				description: error.message ?? "Ein unerwarteter Fehler ist aufgetreten",
			});
		},
	});

	const currentMeta = travelExpenseMetaSchema.safeParse(expense.meta);
	const metaData = currentMeta.success
		? currentMeta.data
		: { from: "", to: "", distance: 0 };

	const form = useForm({
		defaultValues: {
			description: expense.description ?? "",
			startDate: formatDate(expense.startDate, "dd.MM.yyyy"),
			endDate: formatDate(expense.endDate, "dd.MM.yyyy"),
			from: metaData.from,
			to: metaData.to,
			distance: metaData.distance,
			amount: expense.amount,
		},
		onSubmit: ({ value }) => {
			if (!value.from.trim() || !value.to.trim() || value.distance < 1) return;

			const startDate = parse(value.startDate, "dd.MM.yyyy", new Date());
			const endDate = parse(value.endDate, "dd.MM.yyyy", new Date());

			updateExpense.mutate({
				id: expense.id,
				description: value.description,
				startDate: isValid(startDate) ? startDate : undefined,
				endDate: isValid(endDate) ? endDate : undefined,
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
		form.setFieldValue("amount", distance * settings.kilometerRate);
	}, [distance, settings.kilometerRate, form]);

	return (
		<form
			className="grid gap-4"
			onSubmit={(e) => {
				e.preventDefault();
				form.handleSubmit();
			}}
		>
			<FieldGroup className="grid gap-4 md:grid-cols-2">
				<form.Field name="description">
					{(field) => (
						<Field className="md:col-span-2">
							<FieldLabel htmlFor={field.name}>Beschreibung</FieldLabel>
							<Textarea
								autoComplete="off"
								id={field.name}
								name={field.name}
								onBlur={field.handleBlur}
								onChange={(e) => field.handleChange(e.target.value)}
								placeholder="Dienstreise nach Berlin"
								value={field.state.value}
							/>
							<FieldDescription>
								Beschreibung der Ausgabe oder Kommentar
							</FieldDescription>
						</Field>
					)}
				</form.Field>

				<form.Field name="startDate">
					{(field) => (
						<Field>
							<FieldLabel htmlFor={field.name}>Startdatum</FieldLabel>
							<DatePicker
								id={field.name}
								name={field.name}
								onBlur={field.handleBlur}
								onChange={(date) => field.handleChange(date.target.value)}
								placeholder="01.01.2026"
								value={field.state.value}
							/>
						</Field>
					)}
				</form.Field>

				<form.Field name="endDate">
					{(field) => (
						<Field>
							<FieldLabel htmlFor={field.name}>Enddatum</FieldLabel>
							<DatePicker
								id={field.name}
								name={field.name}
								onBlur={field.handleBlur}
								onChange={(date) => field.handleChange(date.target.value)}
								placeholder="01.01.2026"
								value={field.state.value}
							/>
						</Field>
					)}
				</form.Field>

				<form.Field name="from">
					{(field) => (
						<Field>
							<FieldLabel htmlFor={field.name}>Startpunkt</FieldLabel>
							<Input
								autoComplete="off"
								id={field.name}
								name={field.name}
								onBlur={field.handleBlur}
								onChange={(e) => field.handleChange(e.target.value)}
								placeholder="Münster"
								value={field.state.value}
							/>
						</Field>
					)}
				</form.Field>

				<form.Field name="to">
					{(field) => (
						<Field>
							<FieldLabel htmlFor={field.name}>Endpunkt</FieldLabel>
							<Input
								autoComplete="off"
								id={field.name}
								name={field.name}
								onBlur={field.handleBlur}
								onChange={(e) => field.handleChange(e.target.value)}
								placeholder="Berlin"
								value={field.state.value}
							/>
						</Field>
					)}
				</form.Field>

				<form.Field name="distance">
					{(field) => (
						<Field className="md:col-span-2">
							<FieldLabel htmlFor={field.name}>Strecke</FieldLabel>
							<NumberField.Root
								format={{
									style: "decimal",
									minimumFractionDigits: 0,
									maximumFractionDigits: 2,
								}}
								locale="de-DE"
								onValueChange={(value) => field.handleChange(value ?? 0)}
								value={field.state.value}
							>
								<NumberField.Group>
									<InputGroup className="overflow-hidden">
										<NumberField.Input
											render={
												<InputGroupInput
													autoComplete="off"
													id={field.name}
													inputMode="decimal"
													name={field.name}
													onBlur={field.handleBlur}
													placeholder="123,00"
												/>
											}
										/>
										<InputGroupAddon align="inline-end">km</InputGroupAddon>
									</InputGroup>
								</NumberField.Group>
							</NumberField.Root>
							<FieldDescription>Abgelegte Strecke in km</FieldDescription>
						</Field>
					)}
				</form.Field>

				<form.Field name="amount">
					{(field) => (
						<Field className="md:col-span-2">
							<FieldLabel htmlFor={field.name}>Betrag</FieldLabel>
							<NumberField.Root
								disabled
								format={{
									style: "decimal",
									minimumFractionDigits: 2,
									maximumFractionDigits: 2,
								}}
								locale="de-DE"
								value={field.state.value}
							>
								<NumberField.Group>
									<InputGroup className="overflow-hidden opacity-100!">
										<NumberField.Input
											render={
												<InputGroupInput
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
											align="inline-end"
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
						</Field>
					)}
				</form.Field>
			</FieldGroup>
			<DialogFooter>
				<Button disabled={updateExpense.isPending} type="submit">
					{updateExpense.isPending ? "Wird gespeichert..." : "Speichern"}
				</Button>
			</DialogFooter>
		</form>
	);
}

function FoodEditForm({
	expense,
	onSuccess,
}: {
	expense: EditableExpense;
	onSuccess: () => void;
}) {
	const [settings] = api.settings.get.useSuspenseQuery();
	const utils = api.useUtils();
	const updateExpense = api.expense.update.useMutation({
		onSuccess: () => {
			utils.expense.list.invalidate({ reportId: expense.reportId });
			toast.success("Ausgabe erfolgreich aktualisiert");
			onSuccess();
		},
		onError: (error) => {
			toast.error("Fehler beim Aktualisieren der Ausgabe", {
				description: error.message ?? "Ein unerwarteter Fehler ist aufgetreten",
			});
		},
	});

	const currentMeta = foodExpenseMetaSchema.safeParse(expense.meta);
	const metaData = currentMeta.success
		? currentMeta.data
		: { days: 1, breakfastDeduction: 0, lunchDeduction: 0, dinnerDeduction: 0 };

	const form = useForm({
		defaultValues: {
			description: expense.description ?? "",
			startDate: formatDate(expense.startDate, "dd.MM.yyyy"),
			endDate: formatDate(expense.endDate, "dd.MM.yyyy"),
			days: metaData.days,
			breakfastDeduction: metaData.breakfastDeduction,
			lunchDeduction: metaData.lunchDeduction,
			dinnerDeduction: metaData.dinnerDeduction,
			amount: expense.amount,
		},
		onSubmit: ({ value }) => {
			const startDate = parse(value.startDate, "dd.MM.yyyy", new Date());
			const endDate = parse(value.endDate, "dd.MM.yyyy", new Date());

			updateExpense.mutate({
				id: expense.id,
				description: value.description,
				startDate: isValid(startDate) ? startDate : undefined,
				endDate: isValid(endDate) ? endDate : undefined,
				days: value.days,
				breakfastDeduction: value.breakfastDeduction,
				lunchDeduction: value.lunchDeduction,
				dinnerDeduction: value.dinnerDeduction,
				amount: value.amount,
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

		const d = differenceInDays(end, start) + 1;
		if (d < 1) return;
		form.setFieldValue("days", d);
	}, [startDate, endDate, form]);

	React.useEffect(() => {
		const amount = Math.max(
			0,
			settings.dailyFoodAllowance * days -
				(breakfastDeduction * settings.breakfastDeduction +
					lunchDeduction * settings.lunchDeduction +
					dinnerDeduction * settings.dinnerDeduction),
		);
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
			onSubmit={(e) => {
				e.preventDefault();
				form.handleSubmit();
			}}
		>
			<FieldGroup className="grid gap-4 md:grid-cols-3">
				<form.Field name="description">
					{(field) => (
						<Field className="md:col-span-3">
							<FieldLabel htmlFor={field.name}>Beschreibung</FieldLabel>
							<Textarea
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
						</Field>
					)}
				</form.Field>

				<form.Field name="startDate">
					{(field) => (
						<Field>
							<FieldLabel htmlFor={field.name}>Startdatum</FieldLabel>
							<DatePicker
								id={field.name}
								name={field.name}
								onBlur={field.handleBlur}
								onChange={(date) => field.handleChange(date.target.value)}
								placeholder="01.01.2026"
								value={field.state.value}
							/>
						</Field>
					)}
				</form.Field>

				<form.Field name="endDate">
					{(field) => (
						<Field>
							<FieldLabel htmlFor={field.name}>Enddatum</FieldLabel>
							<DatePicker
								id={field.name}
								name={field.name}
								onBlur={field.handleBlur}
								onChange={(date) => field.handleChange(date.target.value)}
								placeholder="01.01.2026"
								value={field.state.value}
							/>
						</Field>
					)}
				</form.Field>

				<form.Field name="days">
					{(field) => (
						<Field>
							<FieldLabel htmlFor={field.name}>Dauer</FieldLabel>
							<NumberField.Root
								disabled
								format={{ minimumFractionDigits: 0, maximumFractionDigits: 0 }}
								locale="de-DE"
								value={field.state.value}
							>
								<NumberField.Group>
									<InputGroup className="overflow-hidden opacity-100!">
										<NumberField.Input
											render={
												<InputGroupInput
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
										<InputGroupAddon align="inline-end">
											<InputGroupText>Tage</InputGroupText>
										</InputGroupAddon>
									</InputGroup>
								</NumberField.Group>
							</NumberField.Root>
						</Field>
					)}
				</form.Field>

				<form.Field name="breakfastDeduction">
					{(field) => (
						<Field>
							<FieldLabel htmlFor={field.name}>Frühstücksabzug</FieldLabel>
							<NumberField.Root
								format={{ minimumFractionDigits: 0, maximumFractionDigits: 0 }}
								locale="de-DE"
								onBlur={field.handleBlur}
								onValueChange={(value) => field.handleChange(value ?? 0)}
								value={field.state.value}
							>
								<NumberField.Group>
									<NumberField.Input
										render={
											<Input
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
								- {settings.breakfastDeduction.toFixed(2)} € pro Tag
							</FieldDescription>
						</Field>
					)}
				</form.Field>

				<form.Field name="lunchDeduction">
					{(field) => (
						<Field>
							<FieldLabel htmlFor={field.name}>Mittagessenabzug</FieldLabel>
							<NumberField.Root
								format={{ minimumFractionDigits: 0, maximumFractionDigits: 0 }}
								locale="de-DE"
								onBlur={field.handleBlur}
								onValueChange={(value) => field.handleChange(value ?? 0)}
								value={field.state.value}
							>
								<NumberField.Group>
									<NumberField.Input
										render={
											<Input
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
								- {settings.lunchDeduction.toFixed(2)} € pro Tag
							</FieldDescription>
						</Field>
					)}
				</form.Field>

				<form.Field name="dinnerDeduction">
					{(field) => (
						<Field>
							<FieldLabel htmlFor={field.name}>Abendessenabzug</FieldLabel>
							<NumberField.Root
								format={{ minimumFractionDigits: 0, maximumFractionDigits: 0 }}
								locale="de-DE"
								onBlur={field.handleBlur}
								onValueChange={(value) => field.handleChange(value ?? 0)}
								value={field.state.value}
							>
								<NumberField.Group>
									<NumberField.Input
										render={
											<Input
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
								- {settings.dinnerDeduction.toFixed(2)} € pro Tag
							</FieldDescription>
						</Field>
					)}
				</form.Field>

				<form.Field name="amount">
					{(field) => (
						<Field className="md:col-span-3">
							<FieldLabel htmlFor={field.name}>Betrag</FieldLabel>
							<NumberField.Root
								disabled
								format={{
									style: "decimal",
									minimumFractionDigits: 2,
									maximumFractionDigits: 2,
								}}
								locale="de-DE"
								value={field.state.value}
							>
								<NumberField.Group>
									<InputGroup className="overflow-hidden opacity-100!">
										<NumberField.Input
											render={
												<InputGroupInput
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
											align="inline-end"
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
						</Field>
					)}
				</form.Field>
			</FieldGroup>
			<DialogFooter>
				<Button disabled={updateExpense.isPending} type="submit">
					{updateExpense.isPending ? "Wird gespeichert..." : "Speichern"}
				</Button>
			</DialogFooter>
		</form>
	);
}
