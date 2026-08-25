"use client";

import { useForm } from "@tanstack/react-form";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
	Field,
	FieldContent,
	FieldError,
	FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { selfServeRefusalOf } from "@/lib/organization";
import { ROUTES } from "@/lib/routes";
import { cn } from "@/lib/utils";
import { api } from "@/trpc/react";

const CREATE_ORG_FORM_ID = "onboarding-create-organization-form";

const formSchema = z.object({
	name: z.string().trim().min(1).max(100),
});

/**
 * Creating an organization and becoming its owner.
 *
 * The name is all that is asked for. A slug is derived server-side, the owner
 * member is written by Better Auth, and a card-less trial starts if billing
 * has a price tagged for one (ADR-0009) — none of which is this form's
 * business, and all of which would be a worse experience as four more fields.
 *
 * Shared by the onboarding step and `/onboarding/no-org`, which is the same
 * offer made to somebody who has been here before.
 */
function OnboardingCreateOrganizationForm({
	className,
	userEmail,
	...props
}: React.ComponentProps<"form"> & { userEmail: string }) {
	const t = useTranslations("modules.onboarding.create");

	const createOrg = api.organization.createSelfServe.useMutation({
		onSuccess: () => {
			// A full load rather than a push: the active organization is decided
			// when the session is read, and this shell was rendered for somebody
			// who belonged to nothing.
			window.location.assign(ROUTES.USER_DASHBOARD());
		},
		onError: (error) => {
			// The procedure answers with a marker rather than a sentence, so the
			// interface can tell this refusal from every other and say what would
			// fix it.
			const description = selfServeRefusalOf(error)
				? t("needsVerification", { email: userEmail })
				: error.message;

			toast.error(t("createFailed"), { description });
		},
	});

	const form = useForm({
		defaultValues: { name: "" },
		validators: {
			onSubmit: formSchema,
		},
		onSubmit: async ({ value }) => {
			await createOrg.mutateAsync({ name: value.name.trim() });
		},
	});

	return (
		<form
			className={cn("flex flex-col gap-3", className)}
			id={CREATE_ORG_FORM_ID}
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
								<FieldLabel htmlFor={field.name}>{t("nameLabel")}</FieldLabel>
								<Input
									aria-invalid={isInvalid}
									autoFocus
									id={field.name}
									maxLength={100}
									name={field.name}
									onBlur={field.handleBlur}
									onChange={(e) => field.handleChange(e.target.value)}
									placeholder={t("namePlaceholder")}
									value={state.value}
								/>
								{isInvalid && <FieldError>{t("nameRequired")}</FieldError>}
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
						form={CREATE_ORG_FORM_ID}
						type="submit"
					>
						{t("submit")}
					</Button>
				)}
			</form.Subscribe>
		</form>
	);
}

export { OnboardingCreateOrganizationForm };
