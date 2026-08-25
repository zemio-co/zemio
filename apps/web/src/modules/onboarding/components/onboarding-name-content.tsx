"use client";

import { useForm } from "@tanstack/react-form";
import { UserIcon } from "lucide-react";
import { useRouter } from "next/navigation";
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
import { ROUTES } from "@/lib/routes";
import { cn } from "@/lib/utils";
import { api } from "@/trpc/react";

const NAME_FORM_ID = "onboarding-name-form";

const formSchema = z.object({
	name: z.string().trim().min(1).max(100),
});

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
}: React.ComponentProps<"div"> & { defaultName: string }) {
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
		<div className={cn(className)} data-slot="onboarding-name-content" {...props}>
			<div className="mb-8 w-fit rounded-md bg-zinc-50 p-2 shadow-sm ring-1 ring-zinc-700/10">
				<UserIcon className="size-5 text-zinc-600" />
			</div>
			<h1 className="font-semibold text-lg text-zinc-800">{t("title")}</h1>
			<p className="mt-1.5 max-w-prose text-sm text-zinc-500">{t("subtitle")}</p>

			<form
				className="mt-8 flex flex-col gap-3"
				id={NAME_FORM_ID}
				onSubmit={(e) => {
					e.preventDefault();
					form.handleSubmit();
				}}
			>
				<form.Field name={"name"}>
					{({ state, ...field }) => {
						const isInvalid = !state.meta.isValid && state.meta.isTouched;

						return (
							<Field data-invalid={isInvalid}>
								<FieldContent>
									<FieldLabel htmlFor={field.name}>{t("label")}</FieldLabel>
									<Input
										aria-invalid={isInvalid}
										autoComplete="name"
										autoFocus
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
		</div>
	);
}

export { OnboardingNameContent };
