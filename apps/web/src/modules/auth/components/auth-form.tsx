"use client";

import { useForm } from "@tanstack/react-form";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { useState } from "react";
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
import { authClient } from "@/server/better-auth/client";
import MicrosoftLogo from "../../../../public/assets/microsoft-logo.svg";

const MAGIC_LINK_FORM_ID = "auth-magic-link-form";

const formSchema = z.object({
	email: z.email(),
});

export function AuthForm({ className, ...props }: React.ComponentProps<"div">) {
	const t = useTranslations("modules.auth.form");

	// The address the link went to, once it has. A toast is the wrong shape for
	// this: the next thing to do is leave for an inbox, and an instruction that
	// disappears after four seconds is one somebody reads on the way out.
	const [sentTo, setSentTo] = useState<string | null>(null);

	const signInWithMicrosoft = async () => {
		const res = await authClient.signIn.social({
			provider: "microsoft",
			callbackURL: ROUTES.USER_DASHBOARD(),
		});

		if (res.error) {
			toast.error(res.error.message ?? t("signInError"));
			return;
		}

		toast.success(t("signInSuccessTitle"), {
			description: t("signInSuccessDescription"),
		});
	};

	const form = useForm({
		defaultValues: { email: "" },
		validators: {
			onSubmit: formSchema,
		},
		onSubmit: async ({ value }) => {
			const email = value.email.trim().toLowerCase();

			const res = await authClient.signIn.magicLink({
				email,
				// Where the link lands. Somebody signing in for the first time has
				// an onboarding flow to walk through; everybody else is returning
				// to the application, and the guard sends them onwards from there
				// if they never finished it.
				callbackURL: ROUTES.USER_DASHBOARD(),
				newUserCallbackURL: ROUTES.ONBOARDING(),
				errorCallbackURL: ROUTES.AUTH(),
			});

			if (res.error) {
				toast.error(t("magicLinkError"), { description: res.error.message });
				return;
			}

			setSentTo(email);
		},
	});

	if (sentTo !== null) {
		return (
			<div className={cn("flex flex-col gap-3", className)} {...props}>
				<p className="text-center text-slate-600 text-sm">
					{t("magicLinkSent", { email: sentTo })}
				</p>
				<Button
					onClick={() => setSentTo(null)}
					size={"lg"}
					type="button"
					variant={"outline"}
				>
					{t("useAnotherAddress")}
				</Button>
			</div>
		);
	}

	return (
		<div className={cn("flex flex-col gap-6", className)} {...props}>
			<Button
				className={"w-full"}
				onClick={signInWithMicrosoft}
				size={"lg"}
				type="button"
				variant={"outline"}
			>
				<Image alt="Microsoft Logo" className="mr-1 size-3.5" src={MicrosoftLogo} />
				{t("continueWithMicrosoft")}
			</Button>

			<div className="flex items-center gap-3">
				<span className="h-px grow bg-slate-200" />
				<span className="text-slate-400 text-xs uppercase">{t("orSeparator")}</span>
				<span className="h-px grow bg-slate-200" />
			</div>

			<form
				className="flex flex-col gap-3"
				id={MAGIC_LINK_FORM_ID}
				onSubmit={(e) => {
					e.preventDefault();
					form.handleSubmit();
				}}
			>
				<form.Field name={"email"}>
					{({ state, ...field }) => {
						const isInvalid = !state.meta.isValid && state.meta.isTouched;

						return (
							<Field data-invalid={isInvalid}>
								<FieldContent>
									<FieldLabel htmlFor={field.name}>{t("emailLabel")}</FieldLabel>
									<Input
										aria-invalid={isInvalid}
										autoComplete="email"
										id={field.name}
										name={field.name}
										onBlur={field.handleBlur}
										onChange={(e) => field.handleChange(e.target.value)}
										placeholder={t("emailPlaceholder")}
										type="email"
										value={state.value}
									/>
									{isInvalid && <FieldError>{t("emailRequired")}</FieldError>}
								</FieldContent>
							</Field>
						);
					}}
				</form.Field>

				<form.Subscribe selector={(state) => state.isSubmitting}>
					{(isSubmitting) => (
						<Button
							className={"w-full"}
							disabled={isSubmitting}
							form={MAGIC_LINK_FORM_ID}
							size={"lg"}
							type="submit"
						>
							{t("continueWithEmail")}
						</Button>
					)}
				</form.Subscribe>
			</form>
		</div>
	);
}
