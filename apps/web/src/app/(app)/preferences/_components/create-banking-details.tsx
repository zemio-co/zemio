"use client";

import { useForm } from "@tanstack/react-form";
import { useTranslations } from "next-intl";
import type React from "react";
import { useState } from "react";
import { toast } from "sonner";
import z from "zod";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import {
	Field,
	FieldDescription,
	FieldError,
	FieldGroup,
	FieldLabel,
} from "@/components/ui/field";
import { IbanInput } from "@/components/ui/iban-input";
import { Input } from "@/components/ui/input";
import { ibanSchema } from "@/lib/validators";
import { api } from "@/trpc/react";

const formSchema = z.object({
	title: z.string().min(1),
	iban: ibanSchema,
	fullName: z.string().min(1),
});

export function CreateBankingDetailsForm({
	...props
}: React.ComponentProps<typeof Button>) {
	const t = useTranslations("modules.preferences.createBankingDetails");
	const tFields = useTranslations("modules.preferences.bankingDetailsForm");
	const tActions = useTranslations("modules.settings.actions");
	const utils = api.useUtils();
	const [open, setOpen] = useState(false);

	const createBankingDetails = api.bankingDetails.create.useMutation({
		onSuccess: () => {
			toast.success(t("createSuccess"));
			utils.bankingDetails.list.invalidate();
			setOpen(false);
			form.reset();
		},
		onError: (error) => {
			toast.error(t("createError"), {
				description: error.message ?? t("unexpectedError"),
			});
		},
	});

	const form = useForm({
		defaultValues: {
			title: "",
			iban: "",
			fullName: "",
		},
		validators: {
			onSubmit: formSchema,
		},
		onSubmit: (value) => {
			createBankingDetails.mutate(value.value);
		},
	});

	return (
		<Dialog onOpenChange={setOpen} open={open}>
			<DialogTrigger render={<Button {...props} />} />
			<DialogContent>
				<DialogHeader>
					<DialogTitle>{t("dialogTitle")}</DialogTitle>
					<DialogDescription>{t("dialogDescription")}</DialogDescription>
				</DialogHeader>
				<div>
					<form
						id="form-create-banking-details"
						onSubmit={(e) => {
							e.preventDefault();
							form.handleSubmit();
						}}
					>
						<FieldGroup className="grid gap-4">
							<form.Field name="title">
								{(field) => {
									const isInvalid =
										field.state.meta.isTouched && !field.state.meta.isValid;
									return (
										<Field data-invalid={isInvalid}>
											<FieldLabel htmlFor={field.name}>{tFields("titleLabel")}</FieldLabel>
											<Input
												aria-invalid={isInvalid}
												id={field.name}
												name={field.name}
												onBlur={field.handleBlur}
												onChange={(e) => field.handleChange(e.target.value)}
												value={field.state.value}
											/>
											<FieldDescription>{tFields("titleHint")}</FieldDescription>
											{isInvalid && <FieldError errors={field.state.meta.errors} />}
										</Field>
									);
								}}
							</form.Field>
							<form.Field name="iban">
								{(field) => {
									const isInvalid =
										field.state.meta.isTouched && !field.state.meta.isValid;
									return (
										<Field data-invalid={isInvalid}>
											<FieldLabel htmlFor={field.name}>{tFields("ibanLabel")}</FieldLabel>
											<IbanInput
												aria-invalid={isInvalid}
												id={field.name}
												name={field.name}
												onBlur={field.handleBlur}
												onChange={(value) => field.handleChange(value)}
												value={field.state.value}
											/>
											{isInvalid && <FieldError errors={field.state.meta.errors} />}
										</Field>
									);
								}}
							</form.Field>
							<form.Field name="fullName">
								{(field) => {
									const isInvalid =
										field.state.meta.isTouched && !field.state.meta.isValid;
									return (
										<Field data-invalid={isInvalid}>
											<FieldLabel htmlFor={field.name}>{tFields("nameLabel")}</FieldLabel>
											<Input
												aria-invalid={isInvalid}
												id={field.name}
												name={field.name}
												onBlur={field.handleBlur}
												onChange={(e) => field.handleChange(e.target.value)}
												value={field.state.value}
											/>
											<FieldDescription>{tFields("nameHint")}</FieldDescription>
											{isInvalid && <FieldError errors={field.state.meta.errors} />}
										</Field>
									);
								}}
							</form.Field>
							<Button
								disabled={createBankingDetails.isPending}
								form="form-create-banking-details"
								type="submit"
							>
								{createBankingDetails.isPending ? t("creating") : tActions("create")}
							</Button>
						</FieldGroup>
					</form>
				</div>
			</DialogContent>
		</Dialog>
	);
}
