"use client";

import { useForm } from "@tanstack/react-form";
import { toast } from "sonner";
import { NotificationPreference } from "@/generated/prisma/enums";
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
	const utils = api.useUtils();
	const [preferences] = api.preferences.getOwn.useSuspenseQuery();

	const updatePreferences = api.preferences.updateOwn.useMutation({
		onSuccess: () => {
			toast.success("Einstellungen wurden erfolgreich gespeichert");
			utils.preferences.getOwn.invalidate();
		},
		onError: (error) => {
			toast.error("Fehler beim Speichern der Einstellungen", {
				description: error.message ?? "Ein unerwarteter Fehler ist aufgetreten",
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
									<FieldLabel>Benachrichtigungen</FieldLabel>
									<FieldDescription>
										Wähle welche Benachrichtigungen du erhalten möchtest
									</FieldDescription>
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
											<Label htmlFor="all">Alle Benachrichtigungen</Label>
											<FieldDescription className="max-w-prose">
												Du erhälst Benachrichtigungen zu allen Änderungen an deinen Reports.
											</FieldDescription>
										</div>
									</div>
									<div className="flex items-start gap-3">
										<RadioGroupItem
											id="status"
											value={NotificationPreference.STATUS_CHANGES}
										/>
										<div className="flex flex-col gap-1">
											<Label htmlFor="status">Statusänderungen</Label>
											<FieldDescription className="max-w-prose">
												Du erhälst Benachrichtigungen zu Änderungen an den Status deiner
												Reports.
											</FieldDescription>
										</div>
									</div>
									<div className="flex items-start gap-3">
										<RadioGroupItem id="none" value={NotificationPreference.NONE} />
										<div className="flex flex-col gap-1">
											<Label htmlFor="none">Keine Benachrichtigungen</Label>
											<FieldDescription className="max-w-prose">
												Du erhältst keine Benachrichtigungen.
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
						Speichern
					</Button>
				</div>
			</FieldGroup>
		</form>
	);
}
