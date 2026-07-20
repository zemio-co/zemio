"use client";

import { NumberField } from "@base-ui/react";
import { useForm } from "@tanstack/react-form";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import z from "zod";
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
	InputGroup,
	InputGroupAddon,
	InputGroupInput,
} from "../ui/input-group";

const formSchema = z.object({
	kilometerRate: z.number().min(0.01, "Kilometerrate muss größer als 0 sein"),
	reviewerEmail: z.email("Ungültige E-Mail-Adresse"),
});

export function AdminSettingsForm({ ...props }: React.ComponentProps<"form">) {
	const t = useTranslations("modules.shared.adminSettingsForm");
	const tActions = useTranslations("modules.settings.actions");
	const utils = api.useUtils();
	const [data] = api.settings.get.useSuspenseQuery();
	const updateSettings = api.settings.update.useMutation({
		onSuccess: () => {
			toast.success(t("saveSuccess"));
			utils.settings.get.invalidate();
		},
		onError: (error) => {
			toast.error(t("saveError"), {
				description: error.message ?? t("saveErrorFallback"),
			});
		},
	});

	const form = useForm({
		defaultValues: {
			kilometerRate: data.kilometerRate,
			reviewerEmail: data.reviewerEmail ?? "",
		},
		validators: {
			onSubmit: formSchema,
		},
		onSubmit: (value) => {
			updateSettings.mutate({
				kilometerRate: value.value.kilometerRate,
				reviewerEmail: value.value.reviewerEmail ?? null,
			});
		},
	});

	return (
		<form
			id="form-admin-settings"
			onSubmit={(e) => {
				e.preventDefault();
				form.handleSubmit();
			}}
			{...props}
		>
			<FieldGroup>
				<form.Field name="kilometerRate">
					{(field) => {
						const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
						return (
							<Field data-invalid={isInvalid}>
								<FieldLabel htmlFor={field.name}>{t("kilometerRateLabel")}</FieldLabel>
								<NumberField.Root
									format={{
										style: "decimal",
										minimumFractionDigits: 2,
										maximumFractionDigits: 2,
									}}
									locale={"de-DE"}
									onBlur={field.handleBlur}
									onValueChange={(value) => {
										field.handleChange(value ?? 0);
									}}
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
								<FieldDescription>{t("kilometerRateDescription")}</FieldDescription>
								{isInvalid && <FieldError errors={field.state.meta.errors} />}
							</Field>
						);
					}}
				</form.Field>
				<form.Field name="reviewerEmail">
					{(field) => {
						const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
						return (
							<Field data-invalid={isInvalid}>
								<FieldLabel htmlFor={field.name}>{t("reviewerEmailLabel")}</FieldLabel>
								<Input
									aria-invalid={isInvalid}
									autoComplete="off"
									id={field.name}
									name={field.name}
									onBlur={field.handleBlur}
									onChange={(e) => field.handleChange(e.target.value)}
									placeholder="bearbeiter@move-ev.de"
									value={field.state.value}
								/>
								<FieldDescription>{t("reviewerEmailDescription")}</FieldDescription>
								{isInvalid && <FieldError errors={field.state.meta.errors} />}
							</Field>
						);
					}}
				</form.Field>

				<Button
					disabled={updateSettings.isPending}
					form="form-admin-settings"
					type="submit"
				>
					{tActions("save")}
				</Button>
			</FieldGroup>
		</form>
	);
}
