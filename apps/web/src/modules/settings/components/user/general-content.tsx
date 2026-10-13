"use client";

import { useForm } from "@tanstack/react-form";
import {
	Avatar,
	AvatarFallback,
	AvatarImage,
	Field,
	FieldContent,
	FieldDescription,
	FieldError,
	FieldLabel,
	Input,
	Skeleton,
} from "@zemio/ui";
import { useTranslations } from "next-intl";
import type React from "react";
import { toast } from "sonner";
import type z from "zod";
import { useSaveBar } from "@/components/save-bar";
import { cn } from "@/lib/utils";
import { updateUserProfileSchema } from "@/lib/validators";
import { api } from "@/trpc/react";
import {
	SettingsCard,
	SettingsCardContent,
	SettingsCardLabel,
} from "../settings-card";
import { SettingsError } from "../settings-error";
import { SettingsSubtitle, SettingsTitle } from "../settings-typography";

function UserSettingsGeneral({
	className,
	...props
}: React.ComponentProps<"main">) {
	const t = useTranslations("modules.settings.preferences.general");

	return (
		<main className={cn("py-16", className)} {...props}>
			<div className="container max-w-4xl space-y-1">
				<SettingsTitle>{t("title")}</SettingsTitle>
				<SettingsSubtitle>{t("description")}</SettingsSubtitle>
			</div>
			<div className="container mt-12 max-w-4xl">
				<ProfileSection />
			</div>
		</main>
	);
}

// ======= PRORFILE ===========================================================================

function ProfileSection({ className, ...props }: React.ComponentProps<"div">) {
	const t = useTranslations("modules.settings.preferences.general");
	const tShared = useTranslations("modules.settings.shared");
	const query = api.user.get.useQuery();

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

	const { data: user } = query;

	return (
		<SettingsCard
			className={cn(className)}
			data-slot="user-settings-profile-section"
			{...props}
		>
			<SettingsCardLabel>{t("sectionProfile")}</SettingsCardLabel>
			<SettingsCardContent>
				<ProfileForm
					defaultValues={{
						name: user.name,
						email: user.email,
						image: user.image,
					}}
				/>
			</SettingsCardContent>
		</SettingsCard>
	);
}

const PROFILE_FORM_ID = "profile-form";

type ProfileFormValues = z.infer<typeof updateUserProfileSchema>;
interface ProfileFormProps extends React.ComponentProps<"form"> {
	defaultValues: ProfileFormValues;
}

function ProfileForm({ defaultValues, ...props }: ProfileFormProps) {
	const t = useTranslations("modules.settings.preferences.general");
	const utils = api.useUtils();

	const updateProfile = api.user.updateName.useMutation({
		onSuccess: (updated) => {
			// Seed the cache with the authoritative response *before* the form is
			// reset, so `defaultValues` never rewinds to the pre-save value.
			utils.user.get.setData(undefined, updated);
			void utils.user.get.invalidate();
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
			onSubmit: updateUserProfileSchema,
		},
		onSubmit: async ({ value }) => {
			const name = value.name.trim();
			if (!name) return;
			try {
				const updated = await updateProfile.mutateAsync({ name });
				// Re-baseline so the form goes clean and the save bar can complete.
				form.reset({
					name: updated.name,
					email: updated.email,
					image: updated.image,
				});
			} catch {
				// error toast handled by the mutation's onError; form stays dirty
			}
		},
	});

	useSaveBar(PROFILE_FORM_ID, form);

	return (
		<form
			id={PROFILE_FORM_ID}
			onSubmit={(e) => {
				e.preventDefault();
				form.handleSubmit();
			}}
			{...props}
		>
			<form.Field name="image">
				{({ state }) => {
					const isInvalid = !state.meta.isValid && state.meta.isTouched;

					return (
						<Field
							aria-invalid={isInvalid}
							className="grid grid-cols-2 gap-8 px-4 py-6"
						>
							<FieldContent>
								{/* No htmlFor: the avatar is read-only here (it is managed via
								    Microsoft), so there is no control to associate the label with. */}
								<FieldLabel>{t("avatarLabel")}</FieldLabel>
								<FieldDescription>{t("avatarDescription")}</FieldDescription>
							</FieldContent>
							<div className="space-y-2">
								<Avatar className={"size-12 after:rounded-md"}>
									<AvatarImage
										alt={t("avatarAriaLabel")}
										className={"rounded-md"}
										src={state.value ?? undefined}
									/>
									<AvatarFallback>
										{defaultValues.name.charAt(0).toUpperCase()}
									</AvatarFallback>
								</Avatar>
								{isInvalid && <FieldError errors={state.meta.errors} />}
							</div>
						</Field>
					);
				}}
			</form.Field>
			<form.Field name="name">
				{({ state, ...field }) => {
					const isInvalid = !state.meta.isValid && state.meta.isTouched;

					return (
						<Field
							aria-invalid={isInvalid}
							className="grid grid-cols-2 gap-8 px-4 py-6"
						>
							<FieldContent>
								<FieldLabel htmlFor={field.name}>{t("nameAriaLabel")}</FieldLabel>
								<FieldDescription>{t("nameDescription")}</FieldDescription>
							</FieldContent>
							<div className="space-y-2">
								<Input
									aria-invalid={isInvalid}
									id={field.name}
									name={field.name}
									onBlur={field.handleBlur}
									onChange={(e) => field.handleChange(e.target.value)}
									placeholder={t("nameLabel")}
									value={state.value}
								/>
								{isInvalid && <FieldError errors={state.meta.errors} />}
							</div>
						</Field>
					);
				}}
			</form.Field>
			<form.Field name="email">
				{({ state, ...field }) => {
					const isInvalid = !state.meta.isValid && state.meta.isTouched;

					return (
						<Field
							aria-invalid={isInvalid}
							className="grid grid-cols-2 gap-8 px-4 py-6"
						>
							<FieldContent>
								<FieldLabel htmlFor={field.name}>{t("emailLabel")}</FieldLabel>
								<FieldDescription>{t("emailDescription")}</FieldDescription>
							</FieldContent>
							<div className="space-y-2">
								<Input
									aria-invalid={isInvalid}
									disabled
									id={field.name}
									name={field.name}
									onBlur={field.handleBlur}
									onChange={(e) => field.handleChange(e.target.value)}
									placeholder={t("emailLabel")}
									value={state.value}
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

export { UserSettingsGeneral };
