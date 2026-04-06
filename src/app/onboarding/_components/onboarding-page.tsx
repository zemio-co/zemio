"use client";

import { useForm } from "@tanstack/react-form";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	Field,
	FieldError,
	FieldGroup,
	FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { ROUTES } from "@/lib/consts";
import { createOrganizationSlug } from "@/lib/organization";
import { authClient } from "@/server/better-auth/client";

export function OnboardingPageContent() {
	const router = useRouter();

	const form = useForm({
		defaultValues: {
			name: "",
		},
		onSubmit: async ({ value }) => {
			const result = await authClient.organization.create({
				name: value.name,
				slug: createOrganizationSlug(value.name),
			});

			if (result.error) {
				toast.error("Organisation konnte nicht erstellt werden", {
					description:
						result.error.message ?? "Ein unerwarteter Fehler ist aufgetreten",
				});
				return;
			}

			router.push(ROUTES.USER_DASHBOARD);
			router.refresh();
		},
	});

	return (
		<div className="container flex min-h-svh max-w-md items-center">
			<div className="w-full rounded-2xl border bg-card p-8 shadow-sm">
				<h1 className="font-semibold text-2xl">Organisation erstellen</h1>
				<p className="mt-2 text-muted-foreground text-sm">
					Lege zuerst deine Organisation an, damit Berichte und Einstellungen
					mandantenbezogen gespeichert werden.
				</p>
				<form
					className="mt-8"
					onSubmit={(event) => {
						event.preventDefault();
						void form.handleSubmit();
					}}
				>
					<FieldGroup>
						<form.Field
							name="name"
							validators={{
								onSubmit: ({ value }) =>
									value.trim().length === 0
										? {
												message: "Bitte gib einen Organisationsnamen ein.",
											}
										: undefined,
							}}
						>
							{(field) => (
								<Field data-invalid={!field.state.meta.isValid}>
									<FieldLabel htmlFor={field.name}>Name</FieldLabel>
									<Input
										id={field.name}
										name={field.name}
										onBlur={field.handleBlur}
										onChange={(event) => field.handleChange(event.target.value)}
										placeholder="move e.V."
										value={field.state.value}
									/>
									<FieldError errors={field.state.meta.errors} />
								</Field>
							)}
						</form.Field>
						<Button disabled={form.state.isSubmitting} type="submit">
							Organisation erstellen
						</Button>
					</FieldGroup>
				</form>
			</div>
		</div>
	);
}
