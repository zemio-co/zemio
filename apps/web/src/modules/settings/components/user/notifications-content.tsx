"use client";

import { useForm } from "@tanstack/react-form";
import { NotificationPreference } from "@zemio/db/enums";
import {
	Field,
	FieldContent,
	FieldDescription,
	FieldLegend,
	Label,
	RadioGroup,
	RadioGroupItem,
	Skeleton,
} from "@zemio/ui";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import type z from "zod";
import { useSaveBar } from "@/components/save-bar";
import { cn } from "@/lib/utils";
import { updatePreferencesSchema } from "@/lib/validators";
import { api } from "@/trpc/react";
import {
	SettingsCard,
	SettingsCardContent,
	SettingsCardLabel,
} from "../settings-card";
import { SettingsError } from "../settings-error";
import { SettingsSubtitle, SettingsTitle } from "../settings-typography";

function UserSettingsNotifications({
	className,
	...props
}: React.ComponentProps<"main">) {
	const t = useTranslations("modules.settings.preferences.notifications");

	return (
		<main className={cn("py-16", className)} {...props}>
			<div className="container max-w-4xl space-y-1">
				<SettingsTitle>{t("title")}</SettingsTitle>
				<SettingsSubtitle>{t("description")}</SettingsSubtitle>
			</div>
			<div className="container mt-12 max-w-4xl">
				<NotificationsSection />
			</div>
		</main>
	);
}

// ======= NOTIFICATIONS ======================================================================

function NotificationsSection({
	className,
	...props
}: React.ComponentProps<"div">) {
	const t = useTranslations("modules.settings.preferences.notifications");
	const tShared = useTranslations("modules.settings.shared");
	const query = api.preferences.get.useQuery();

	if (query.isPending) {
		return <Skeleton className={cn("h-64 w-full", className)} {...props} />;
	}

	if (query.error) {
		const { error } = query;

		return (
			<SettingsError
				description={error.data?.code ?? tShared("unknownError")}
				message={error.message}
			/>
		);
	}

	const { data } = query;

	return (
		<SettingsCard
			className={cn(className)}
			data-slot="user-settings-notifications-section"
			{...props}
		>
			<SettingsCardLabel>{t("sectionNotifications")}</SettingsCardLabel>
			<SettingsCardContent>
				<NotificationsForm
					defaultValues={{
						notificationPreference: data.notifications,
					}}
				/>
			</SettingsCardContent>
		</SettingsCard>
	);
}

const NOTIFICATIONS_FORM_ID = "notifications-form";

type NotificationsFormValues = z.infer<typeof updatePreferencesSchema>;
interface NotificationsFormProps extends React.ComponentProps<"form"> {
	defaultValues: NotificationsFormValues;
}

function NotificationsForm({
	defaultValues,
	...props
}: NotificationsFormProps) {
	const t = useTranslations("modules.settings.preferences.notifications");
	const utils = api.useUtils();

	const updatePreferences = api.preferences.update.useMutation({
		onSuccess: (updated) => {
			utils.preferences.get.setData(undefined, updated);
			void utils.preferences.get.invalidate();
		},
		onError: (error) => {
			toast.error(t("saveErrorTitle"), {
				description: error.message ?? t("saveErrorFallback"),
			});
		},
	});

	const form = useForm({
		defaultValues,
		validators: {
			onSubmit: updatePreferencesSchema,
		},
		onSubmit: async ({ value }) => {
			try {
				const updated = await updatePreferences.mutateAsync({
					notificationPreference: value.notificationPreference,
				});
				form.reset({ notificationPreference: updated.notifications });
			} catch {
				// error toast handled by the mutation's onError; form stays dirty
			}
		},
	});

	useSaveBar(NOTIFICATIONS_FORM_ID, form);

	return (
		<form
			data-slot="notifications-form"
			id={NOTIFICATIONS_FORM_ID}
			onSubmit={(e) => {
				e.preventDefault();
				form.handleSubmit();
			}}
			{...props}
		>
			<form.Field name="notificationPreference">
				{({ state, ...field }) => {
					const isInvalid = state.meta.isTouched && !state.meta.isValid;
					return (
						<Field
							className="grid gap-4 md:grid-cols-2 md:gap-8"
							data-invalid={isInvalid}
						>
							<FieldContent>
								<FieldLegend className="mb-0" variant="label">
									{t("fieldLabel")}
								</FieldLegend>
								<FieldDescription>{t("fieldDescription")}</FieldDescription>
							</FieldContent>
							<RadioGroup
								className="gap-6"
								onBlur={field.handleBlur}
								onValueChange={field.handleChange}
								value={state.value}
							>
								<div className="flex items-start gap-3">
									<RadioGroupItem id="all" value={NotificationPreference.ALL} />
									<div className="flex flex-col gap-1">
										<Label htmlFor="all">{t("allTitle")}</Label>
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
										<Label htmlFor="status">{t("statusTitle")}</Label>
										<FieldDescription className="max-w-prose">
											{t("statusDescription")}
										</FieldDescription>
									</div>
								</div>
								<div className="flex items-start gap-3">
									<RadioGroupItem id="none" value={NotificationPreference.NONE} />
									<div className="flex flex-col gap-1">
										<Label htmlFor="none">{t("noneTitle")}</Label>
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
		</form>
	);
}

export { UserSettingsNotifications };
