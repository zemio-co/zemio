"use client";

import { NumberField } from "@base-ui/react";
import { useForm } from "@tanstack/react-form";
import { toast } from "sonner";
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
} from "@/components/ui/input-group";
import { updateTravelAllowancesSchema } from "@/lib/validators";
import { api } from "@/trpc/react";

export function TravelAllowanceForm({
	...props
}: React.ComponentProps<"form">) {
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
		<form
			id="form-travel-allowance"
			onSubmit={(e) => {
				e.preventDefault();
				form.handleSubmit();
			}}
			{...props}
		>
			<FieldGroup className="grid gap-8">
				<form.Field name="kilometerRate">
					{(field) => {
						const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
						return (
							<Field className="md:col-span-2" data-invalid={isInvalid}>
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
									Dieser Betrag wird pro Kilometer für Reise-Ausgaben berechnet.
								</FieldDescription>
								{isInvalid && <FieldError errors={field.state.meta.errors} />}
							</Field>
						);
					}}
				</form.Field>

				<div className="flex justify-end">
					<Button
						disabled={updateTravelAllowances.isPending}
						form="form-travel-allowance"
						type="submit"
					>
						Speichern
					</Button>
				</div>
			</FieldGroup>
		</form>
	);
}
