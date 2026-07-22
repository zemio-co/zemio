"use client";

import { useForm } from "@tanstack/react-form";
import { NotificationPreference } from "@zemio/db/enums";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { updatePreferencesSchema } from "@/lib/validators";
import { api } from "@/trpc/react";
import { Button } from "../ui/button";
import {
	Field,
	FieldContent,
	FieldDescription,
	FieldGroup,
	FieldLabel,
} from "../ui/field";
import { Label } from "../ui/label";
import { RadioGroup, RadioGroupItem } from "../ui/radio-group";

export function PreferencesForm() {
	const t = useTranslations("modules.shared.preferencesForm");
	const tActions = useTranslations("modules.settings.actions");
	const utils = api.useUtils();
	const [preferences] = api.preferences.getOwn.useSuspenseQuery();

	const updatePreferences = api.preferences.updateOwn.useMutation({
		onSuccess: () => {
			toast.success(t("saveSuccess"));
			utils.preferences.getOwn.invalidate();
		},
		onError: (error) => {
			toast.error(t("saveError"), {
				description: error.message ?? t("saveErrorFallback"),
			});
		},
	});

	const form = useForm({
		defaultValues: {
			notificationPreference: preferences.notifications,
		},
		validators: {
			onSubmit: updatePreferencesSchema,
		},
		onSubmit: ({ value }) => {
			updatePreferences.mutate({
				notificationPreference: value.notificationPreference,
			});
		},
	});

	return (
		<form
			id="form-preferences"
			onSubmit={(e) => {
				e.preventDefault();
				form.handleSubmit();
			}}
		>
			<FieldGroup className="grid gap-12">
				<form.Field name="notificationPreference">
					{(field) => {
						const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
						return (
							<Field
								className="grid gap-4 md:grid-cols-2 md:gap-8"
								data-invalid={isInvalid}
							>
								<FieldContent>
									<FieldLabel>{t("notificationsLabel")}</FieldLabel>
									<FieldDescription>{t("notificationsDescription")}</FieldDescription>
								</FieldContent>
								<RadioGroup
									className={"gap-6"}
									onBlur={field.handleBlur}
									onValueChange={field.handleChange}
									value={field.state.value}
								>
									<div className="flex items-start gap-3">
										<RadioGroupItem id="all" value={NotificationPreference.ALL} />
										<div className="flex flex-col gap-1">
											<Label htmlFor="all">{t("allLabel")}</Label>
											<FieldDescription className="max-w-prose">
												{t("allDescription")}
											</FieldDescription>
										</div>
									</div>
									<div className="flex items-start gap-3">
										<RadioGroupItem
											id="status"
											value={NotificationPreference.STATUS_CHANGES}
										/>
										<div className="flex flex-col gap-1">
											<Label htmlFor="status">{t("statusLabel")}</Label>
											<FieldDescription className="max-w-prose">
												{t("statusDescription")}
											</FieldDescription>
										</div>
									</div>
									<div className="flex items-start gap-3">
										<RadioGroupItem id="none" value={NotificationPreference.NONE} />
										<div className="flex flex-col gap-1">
											<Label htmlFor="none">{t("noneLabel")}</Label>
											<FieldDescription className="max-w-prose">
												{t("noneDescription")}
											</FieldDescription>
										</div>
									</div>
								</RadioGroup>
							</Field>
						);
					}}
				</form.Field>

				<div className="flex items-center justify-end">
					<Button
						disabled={updatePreferences.isPending}
						form="form-preferences"
						type="submit"
					>
						{tActions("save")}
					</Button>
				</div>
			</FieldGroup>
		</form>
	);
}
