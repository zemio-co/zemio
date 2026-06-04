"use client";

import { useForm } from "@tanstack/react-form";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { toast } from "sonner";
import { ROUTES } from "@/lib/consts";
import { createReportSchema } from "@/lib/validators";
import { api } from "@/trpc/react";
import { Button } from "../ui/button";
import {
	Field,
	FieldDescription,
	FieldError,
	FieldGroup,
	FieldLabel,
} from "../ui/field";
import { Input } from "../ui/input";
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectLabel,
	SelectTrigger,
	SelectValue,
} from "../ui/select";
import { Textarea } from "../ui/textarea";

export function CreateReportForm({ ...props }: React.ComponentProps<"form">) {
	const [costUnitsGroups] = api.costUnit.listGroupsWithUnits.useSuspenseQuery();
	const [bankingDetails] = api.bankingDetails.list.useSuspenseQuery();

	const allCostUnits = useMemo(() => {
		return costUnitsGroups.flatMap((group) =>
			group.costUnits.map((costUnit) => ({
				label: costUnit.title,
				value: costUnit.id,
				examples: costUnit.examples,
				tag: costUnit.tag,
			})),
		);
	}, [costUnitsGroups]);

	// Create a Map for O(1) cost unit lookups by ID
	const costUnitMap = useMemo(() => {
		const map = new Map<
			string,
			{ id: string; tag: string; title: string; examples: string[] }
		>();
		for (const costUnit of allCostUnits) {
			map.set(costUnit.value, {
				id: costUnit.value,
				tag: costUnit.tag,
				title: costUnit.label,
				examples: costUnit.examples,
			});
		}
		return map;
	}, [allCostUnits]);

	const router = useRouter();

	const createReport = api.report.create.useMutation({
		onSuccess(data) {
			toast.success("Report erfolgreich erstellt");
			router.push(ROUTES.REPORT_DETAIL(data.id));
		},
		onError(error) {
			toast.error("Fehler beim Erstellen des Reports", {
				description: error.message ?? "Ein unerwarteter Fehler ist aufgetreten",
			});
		},
	});

	const form = useForm({
		defaultValues: {
			title: "",
			description: "",
			costUnitId: "",
			bankingDetailsId: "",
		},
		validators: {
			onSubmit: createReportSchema,
		},
		onSubmit: async ({ value }) => {
			createReport.mutate({
				...value,
			});
		},
	});

	return (
		<form
			id="form-create-report"
			onSubmit={(e) => {
				e.preventDefault();
				form.handleSubmit();
			}}
			{...props}
		>
			<FieldGroup className="grid gap-4">
				<form.Field
					children={(field) => {
						const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
						return (
							<Field data-invalid={isInvalid}>
								<FieldLabel htmlFor={field.name}>Titel</FieldLabel>
								<Input
									aria-invalid={isInvalid}
									autoComplete="off"
									id={field.name}
									name={field.name}
									onBlur={field.handleBlur}
									onChange={(e) => field.handleChange(e.target.value)}
									placeholder="Verpflegung Weihnachtsfeier"
									value={field.state.value}
								/>
								{isInvalid && <FieldError errors={field.state.meta.errors} />}
							</Field>
						);
					}}
					name="title"
				/>
				<form.Field
					children={(field) => {
						const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
						return (
							<Field data-invalid={isInvalid}>
								<FieldLabel htmlFor={field.name}>Beschreibung</FieldLabel>
								<Textarea
									aria-invalid={isInvalid}
									autoComplete="off"
									id={field.name}
									name={field.name}
									onBlur={field.handleBlur}
									onChange={(e) => field.handleChange(e.target.value)}
									placeholder="Beschreibung des Reports"
									value={field.state.value}
								/>
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
								<FieldLabel htmlFor={field.name}>Bankverbindung</FieldLabel>
								<Select
									items={bankingDetails.map((detail) => ({
										label: detail.title,
										value: detail.id,
									}))}
									onValueChange={(value) => field.handleChange(value ?? "")}
									value={field.state.value}
								>
									<SelectTrigger aria-invalid={isInvalid} data-invalid={isInvalid}>
										<SelectValue placeholder="Bankverbindung auswählen" />
									</SelectTrigger>
									<SelectContent>
										<SelectGroup>
											{bankingDetails.map((detail) => (
												<SelectItem key={detail.id} value={detail.id}>
													<span>{detail.title}</span>
												</SelectItem>
											))}
										</SelectGroup>
									</SelectContent>
								</Select>

								<FieldDescription>
									Um Zahlungen zu erhalten, muss eine Bankverbindung hinterlegt haben. Du
									kannst deine Bankverbindung in den{" "}
									<Link
										className="font-medium text-primary no-underline"
										href={"/preferences"}
									>
										Einstellungen
									</Link>{" "}
									hinterlegen.
								</FieldDescription>
								{isInvalid && <FieldError errors={field.state.meta.errors} />}
							</Field>
						);
					}}
					name="bankingDetailsId"
				/>

				<form.Field
					children={(field) => {
						const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
						return (
							<Field data-invalid={isInvalid}>
								<FieldLabel htmlFor={field.name}>Kostenstelle</FieldLabel>
								<Select
									items={allCostUnits}
									onValueChange={(value) => field.handleChange(value ?? "")}
									value={field.state.value}
								>
									<SelectTrigger aria-invalid={isInvalid} data-invalid={isInvalid}>
										<SelectValue placeholder="Kostenstelle auswählen" />
									</SelectTrigger>
									<SelectContent>
										{costUnitsGroups.map((group) => (
											<SelectGroup key={group.id}>
												<SelectLabel>{group.title}</SelectLabel>
												{group.costUnits.length > 0 &&
													group.costUnits.map((costUnit) => (
														<SelectItem key={costUnit.id} value={costUnit.id}>
															<span>{costUnit.title}</span>
														</SelectItem>
													))}
											</SelectGroup>
										))}
									</SelectContent>
								</Select>

								{(() => {
									const selectedCostUnit = costUnitMap.get(field.state.value);

									if (
										selectedCostUnit?.examples &&
										selectedCostUnit.examples.length > 0
									) {
										return (
											<div className="mt-1 rounded-lg border bg-muted/40 p-4 text-muted-foreground text-sm">
												<p className="mb-2">
													Zu der ausgewählten Kostenstelle gehören die folgenden Anliegen:
												</p>
												<ul className="list-inside list-disc">
													{selectedCostUnit.examples.map((example) => (
														<li key={example}>{example}</li>
													))}
												</ul>
											</div>
										);
									}
									return null;
								})()}
								{isInvalid && <FieldError errors={field.state.meta.errors} />}
							</Field>
						);
					}}
					name="costUnitId"
				/>
				<Button
					disabled={createReport.isPending}
					form="form-create-report"
					type="submit"
				>
					Erstellen
				</Button>
			</FieldGroup>
		</form>
	);
}
