"use client";

import { useForm } from "@tanstack/react-form";
import {
	Avatar,
	AvatarImage,
	Field,
	FieldContent,
	FieldDescription,
	FieldError,
	FieldLabel,
	Input,
	Label,
} from "@zemio/ui";
import { useTranslations } from "next-intl";
import type React from "react";
import { toast } from "sonner";
import z from "zod";
import { useSaveBar } from "@/components/save-bar";
import { cn } from "@/lib/utils";
import { api } from "@/trpc/react";
import {
	SettingsCard,
	SettingsCardContent,
	SettingsCardLabel,
} from "../settings-card";
import { SettingsSubtitle, SettingsTitle } from "../settings-typography";

function OrgSettingsGeneral({
	className,
	...props
}: React.ComponentProps<"main">) {
	const t = useTranslations("modules.settings.general");
	return (
		<main
			className={cn("py-16", className)}
			data-slot="org-settings-general"
			{...props}
		>
			<div className="container max-w-4xl space-y-1">
				<SettingsTitle>{t("title")}</SettingsTitle>
				<SettingsSubtitle>{t("description")}</SettingsSubtitle>
			</div>
			<div className="container mt-12 max-w-4xl">
				<SettingsCard>
					<SettingsCardLabel>{t("sections.general")}</SettingsCardLabel>
					<SettingsCardContent>
						<OrgGeneralForm />
					</SettingsCardContent>
				</SettingsCard>
			</div>
			<div className="container mt-12 max-w-4xl">
				<SettingsCard>
					<SettingsCardLabel>{t("sections.reviewer")}</SettingsCardLabel>
					<SettingsCardContent>
						<OrgReviewerForm />
					</SettingsCardContent>
				</SettingsCard>
			</div>
		</main>
	);
}

const updateOrgReviewerSchema = z.object({
	reviewerEmail: z
		.string()
		.refine(
			(val) => val === "" || z.email().safeParse(val).success,
			"Must be a valid E-Mail",
		)
		.transform((val) => (val === "" ? null : val))
		.nullable()
		.optional(),
});
type UpdateOrgReviewerFormValues = z.infer<typeof updateOrgReviewerSchema>;

const UPDATE_REVIEWER_FORM_ID = "org-update-reviewer-form";

function OrgReviewerForm({
	className,
	...props
}: React.ComponentProps<"form">) {
	const [settings] = api.settings.get.useSuspenseQuery();
	const t = useTranslations("modules.settings.general");
	const utils = api.useUtils();

	const updateMutation = api.settings.update.useMutation({
		onSuccess: () => {
			utils.settings.get.invalidate();
		},
		onError: (error) => {
			toast.error(t("reviewerSaveErrorTitle"), {
				description: error.message ?? t("saveErrorFallback"),
			});
		},
	});

	const form = useForm({
		defaultValues: {
			reviewerEmail: settings.reviewerEmail ?? "",
		} as UpdateOrgReviewerFormValues,
		validators: {
			onSubmit: updateOrgReviewerSchema,
		},
		onSubmit: async ({ value }) => {
			if (!value.reviewerEmail) {
				return;
			}

			const reviewerEmail = value.reviewerEmail.trim();

			try {
				await updateMutation.mutateAsync({
					reviewerEmail,
				});
				form.reset({ ...value });
			} catch {}
		},
	});

	useSaveBar(UPDATE_REVIEWER_FORM_ID, form);

	return (
		<form
			className={cn(className)}
			id={UPDATE_REVIEWER_FORM_ID}
			onSubmit={(e) => {
				e.preventDefault();
				form.handleSubmit();
			}}
			{...props}
		>
			<form.Field name={"reviewerEmail"}>
				{({ state, ...field }) => {
					const isInvalid = !state.meta.isValid && state.meta.isTouched;

					return (
						<Field data-invalid={isInvalid}>
							<FieldContent>
								<FieldLabel htmlFor={field.name}>
									{t("reviewerDialog.fieldLabel")}
								</FieldLabel>
								<FieldDescription>
									{t("reviewerDialog.fieldDescription")}
								</FieldDescription>
							</FieldContent>
							<div className="space-y-2">
								<Input
									aria-invalid={isInvalid}
									id={field.name}
									name={field.name}
									onBlur={field.handleBlur}
									onChange={(e) => field.handleChange(e.currentTarget.value)}
									placeholder={t("reviewerDialog.placeholder")}
									value={state.value ?? ""}
								/>
								{isInvalid && <FieldError errors={state.meta.errors} />}
							</div>
						</Field>
					);
				}}
			</form.Field>
		</form>
	);
}

const updateOrgGeneralSchema = z.object({
	name: z.string().min(1),
	logo: z
		.string()
		.refine(
			(val) => val === "" || z.url().safeParse(val).success,
			"Must be a valid URL",
		)
		.transform((val) => (val === "" ? null : val))
		.nullable()
		.optional(),
});
const UPDATE_GENERAL_FORM_ID = "org-update-general-form";

function OrgGeneralForm({ className, ...props }: React.ComponentProps<"form">) {
	const t = useTranslations("modules.settings.general");
	const [org] = api.organization.get.useSuspenseQuery();
	const utils = api.useUtils();

	const updateMutation = api.organization.update.useMutation({
		onSuccess: () => {
			utils.organization.get.invalidate();
		},
		onError: (error) => {
			toast.error(t("saveErrorTitle"), {
				description: error.message ?? t("saveErrorFallback"),
			});
		},
	});

	const form = useForm({
		defaultValues: {
			name: org.name,
		},
		validators: {
			onSubmit: updateOrgGeneralSchema,
		},
		onSubmit: async ({ value }) => {
			try {
				await updateMutation.mutateAsync({
					...value,
				});
				form.reset({ ...value });
			} catch {}
		},
	});

	useSaveBar(UPDATE_GENERAL_FORM_ID, form);

	return (
		<form
			className={cn("", className)}
			data-slot="component"
			id={UPDATE_GENERAL_FORM_ID}
			{...props}
		>
			<form.Field name={"name"}>
				{({ state, ...field }) => {
					const isInvalid = !state.meta.isValid && state.meta.isTouched;

					return (
						<Field data-invalid={isInvalid}>
							<FieldContent>
								<FieldLabel htmlFor={field.name}>
									{t("updateDialog.nameLabel")}
								</FieldLabel>
								<FieldDescription>{t("updateDialog.nameDescription")}</FieldDescription>
							</FieldContent>
							<div className="space-y-2">
								<Input
									aria-invalid={isInvalid}
									id={field.name}
									name={field.name}
									onBlur={field.handleBlur}
									onChange={(e) => field.handleChange(e.currentTarget.value)}
									placeholder={t("updateDialog.namePlaceholder")}
									value={state.value ?? ""}
								/>
								{isInvalid && <FieldError errors={state.meta.errors} />}
							</div>
						</Field>
					);
				}}
			</form.Field>
			<div className="grid grid-cols-2 gap-8 px-4 py-6">
				<div className="space-y-1.5">
					<Label>Logo</Label>
					<p className="text-base-500 text-sm">
						Das Organisationslogo kann derzeit nicht angepasst werden.
					</p>
				</div>
				<div>
					<Avatar className={"size-12 after:rounded-md"}>
						<AvatarImage className={""} src={org.logo ?? undefined} />
					</Avatar>
				</div>
			</div>
		</form>
	);
}

export { OrgSettingsGeneral };
