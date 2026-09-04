"use client";

import { useForm } from "@tanstack/react-form";
import { Button, Field, FieldError, Input } from "@zemio/ui";
import { PlusIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { z } from "zod";
import { ROUTES } from "@/lib/routes";
import { cn } from "@/lib/utils";
import { authClient } from "@/server/better-auth/client";
import { OnboardingBox, OnboardingBoxHeader } from "./primtives/onboarding-box";
import { OnboardingDesc, OnboardingTitle } from "./primtives/onboarding-text";

const INVITE_FORM_ID = "onboarding-invite-form";

/**
 * The first thing a new organization has no way to be useful without: someone
 * else in it.
 *
 * Skippable, and says so. An initiative's treasurer signing up on a Sunday
 * evening may not have their colleagues' addresses to hand, and refusing to
 * let them into the application over it would be holding the product hostage
 * to a step that can be taken from settings at any time.
 *
 * Invitations go through Better Auth directly rather than a procedure of our
 * own, which is the same exception `/accept-invitation` and the invitation
 * list already are: the plugin writes the row, addresses the grant to the
 * email, and calls the `sendInvitationEmail` hook that owns the message.
 */
function OnboardingInviteContent({
	className,
	organizationId,
	organizationName,
	...props
}: React.ComponentProps<typeof OnboardingBox> & {
	organizationId: string;
	organizationName: string;
}) {
	const t = useTranslations("modules.onboarding.invite");

	return (
		<OnboardingBox
			className={cn(className)}
			data-slot="onboarding-invite-content"
			{...props}
		>
			<OnboardingBoxHeader>
				<OnboardingTitle>{t("title")}</OnboardingTitle>
				<OnboardingDesc>{t("subtitle", { organizationName })}</OnboardingDesc>
			</OnboardingBoxHeader>

			<OnboardingInviteForm organizationId={organizationId} />
		</OnboardingBox>
	);
}

const formSchema = z.object({
	emails: z.array(z.object({ value: z.string().trim().email() })).min(1),
});

function OnboardingInviteForm({
	className,
	organizationId,
	...props
}: React.ComponentProps<"form"> & { organizationId: string }) {
	const t = useTranslations("modules.onboarding.invite");
	const router = useRouter();

	function goToTrial() {
		router.push(ROUTES.ONBOARDING_TRIAL());
		// The step this person is on is decided on the server, and the page they
		// are leaving was rendered for the previous answer.
		router.refresh();
	}

	const form = useForm({
		defaultValues: { emails: [{ value: "" }] },
		validators: { onSubmit: formSchema },
		onSubmit: async ({ value }) => {
			const emails = value.emails
				.map((entry) => entry.value.trim())
				.filter((email) => email !== "");

			// Sent one at a time rather than as a batch because the plugin invites
			// one address per call. `allSettled`, so one refusal — an address that
			// is already a member, a duplicate pending invitation — does not
			// discard the invitations that did go out.
			const results = await Promise.allSettled(
				emails.map((email) =>
					authClient.organization.inviteMember({
						email,
						organizationId,
						role: "member",
					}),
				),
			);

			const sent = results.filter(
				(result) => result.status === "fulfilled" && !result.value.error,
			).length;

			if (sent > 0) toast.success(t("inviteSent", { count: sent }));

			if (sent < emails.length) {
				const firstRefusal = results.find(
					(result) => result.status === "rejected" || result.value.error,
				);
				const description =
					firstRefusal?.status === "rejected"
						? firstRefusal.reason instanceof Error
							? firstRefusal.reason.message
							: undefined
						: firstRefusal?.value.error?.message;

				toast.error(t("inviteFailed"), { description });

				// Held on the step so the addresses that failed can be corrected,
				// rather than advancing and losing them.
				if (sent === 0) return;
			}

			goToTrial();
		},
	});

	return (
		<form
			className={cn("flex flex-col", className)}
			data-slot="onboarding-invite-form"
			id={INVITE_FORM_ID}
			onSubmit={(e) => {
				e.preventDefault();
				form.handleSubmit();
			}}
			{...props}
		>
			<form.Field mode="array" name={"emails"}>
				{(arrayField) => (
					<div className="flex flex-col gap-2">
						{arrayField.state.value.map((_, index) => (
							<form.Field
								// biome-ignore lint/suspicious/noArrayIndexKey: the row's identity is its position — addresses are not entities yet, and rows are only ever appended.
								key={index}
								name={`emails[${index}].value`}
							>
								{({ state, ...field }) => {
									const isInvalid = !state.meta.isValid && state.meta.isTouched;

									return (
										<Field data-invalid={isInvalid}>
											<Input
												aria-invalid={isInvalid}
												autoComplete="off"
												autoFocus={index === 0}
												className={"bg-white"}
												id={field.name}
												name={field.name}
												onBlur={field.handleBlur}
												onChange={(e) => field.handleChange(e.target.value)}
												placeholder={t("emailPlaceholder")}
												type="email"
												value={state.value}
											/>
											{isInvalid && <FieldError>{t("invalidEmail")}</FieldError>}
										</Field>
									);
								}}
							</form.Field>
						))}

						<Button
							className="self-start"
							onClick={() => arrayField.pushValue({ value: "" })}
							size={"sm"}
							type="button"
							variant={"ghost"}
						>
							<PlusIcon /> {t("addAnother")}
						</Button>
					</div>
				)}
			</form.Field>

			<form.Subscribe selector={(state) => state.isSubmitting}>
				{(isSubmitting) => (
					<div className="mt-8 flex flex-col gap-2">
						<Button disabled={isSubmitting} form={INVITE_FORM_ID} type="submit">
							{t("submit")}
						</Button>
						<Button
							disabled={isSubmitting}
							onClick={goToTrial}
							type="button"
							variant={"ghost"}
						>
							{t("skip")}
						</Button>
					</div>
				)}
			</form.Subscribe>
		</form>
	);
}

export { OnboardingInviteContent };
