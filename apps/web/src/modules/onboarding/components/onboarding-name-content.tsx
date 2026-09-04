"use client";

import { useForm } from "@tanstack/react-form";
import { Button, Field, FieldContent, FieldError, Input } from "@zemio/ui";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { z } from "zod";
import { ROUTES } from "@/lib/routes";
import { cn } from "@/lib/utils";
import { api } from "@/trpc/react";
import { OnboardingBox, OnboardingBoxHeader } from "./primtives/onboarding-box";
import { OnboardingDesc, OnboardingTitle } from "./primtives/onboarding-text";

const NAME_FORM_ID = "onboarding-name-form";

/**
 * The name everything else addresses this person by.
 *
 * Prefilled for a Microsoft sign-in, where the provider supplied one, and
 * empty for a magic link, where nothing did. The step is shown either way —
 * a name worth using is one its owner has looked at — but only an empty one
 * is enforced by the step resolver.
 */
function OnboardingNameContent({
	className,
	defaultName,
	...props
}: React.ComponentProps<typeof OnboardingBox> & { defaultName: string }) {
	const t = useTranslations("modules.onboarding.name");
	return (
		<OnboardingBox
			className={cn("max-w-sm", className)}
			data-slot="onboarding-name-content"
			{...props}
		>
			<OnboardingBoxHeader>
				<OnboardingTitle>{t("title")}</OnboardingTitle>
				<OnboardingDesc>{t("subtitle")}</OnboardingDesc>
			</OnboardingBoxHeader>
			<OnboardingNameForm defaultName={defaultName} />
		</OnboardingBox>
	);
}

const formSchema = z.object({
	name: z.string().trim().min(1).max(100),
});

function OnboardingNameForm({
	className,
	defaultName = "",
	...props
}: React.ComponentProps<"form"> & {
	defaultName?: string;
}) {
	const t = useTranslations("modules.onboarding.name");
	const router = useRouter();

	const updateName = api.user.updateName.useMutation({
		onSuccess: () => {
			router.push(ROUTES.ONBOARDING_ORGANIZATION());
			// The step this person is on is decided on the server, and the page
			// they are leaving was rendered for the previous answer.
			router.refresh();
		},
		onError: (error) => {
			toast.error(t("saveFailed"), { description: error.message });
		},
	});

	const form = useForm({
		defaultValues: { name: defaultName },
		validators: {
			onSubmit: formSchema,
		},
		onSubmit: async ({ value }) => {
			await updateName.mutateAsync({ name: value.name.trim() });
		},
	});

	return (
		<form
			className={cn("flex flex-col gap-3", className)}
			data-slot="onboarding-name-form"
			id={NAME_FORM_ID}
			onSubmit={(e) => {
				e.preventDefault();
				form.handleSubmit();
			}}
			{...props}
		>
			<form.Field name={"name"}>
				{({ state, ...field }) => {
					const isInvalid = !state.meta.isValid && state.meta.isTouched;

					return (
						<Field data-invalid={isInvalid}>
							<FieldContent>
								<Input
									aria-invalid={isInvalid}
									autoComplete="name"
									autoFocus
									className={"bg-white"}
									id={field.name}
									maxLength={100}
									name={field.name}
									onBlur={field.handleBlur}
									onChange={(e) => field.handleChange(e.target.value)}
									placeholder={t("placeholder")}
									value={state.value}
								/>
								{isInvalid && <FieldError>{t("required")}</FieldError>}
							</FieldContent>
						</Field>
					);
				}}
			</form.Field>

			<form.Subscribe
				selector={(state) => [state.isSubmitting, state.values.name] as const}
			>
				{([isSubmitting, name]) => (
					<Button
						disabled={isSubmitting || String(name).trim() === ""}
						form={NAME_FORM_ID}
						type="submit"
					>
						{t("submit")}
					</Button>
				)}
			</form.Subscribe>
		</form>
	);
}

export { OnboardingNameContent };
