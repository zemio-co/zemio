"use client";

import { useForm } from "@tanstack/react-form";
import type React from "react";
import { useState } from "react";
import { toast } from "sonner";
import z from "zod";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import {
	Field,
	FieldDescription,
	FieldError,
	FieldGroup,
	FieldLabel,
} from "@/components/ui/field";
import { IbanInput } from "@/components/ui/iban-input";
import { Input } from "@/components/ui/input";
import { ibanSchema } from "@/lib/validators";
import { api } from "@/trpc/react";

const formSchema = z.object({
	title: z.string().min(1),
	iban: ibanSchema,
	fullName: z.string().min(1),
});

export function CreateBankingDetailsForm({
	...props
}: React.ComponentProps<typeof Button>) {
	const utils = api.useUtils();
	const [open, setOpen] = useState(false);

	const createBankingDetails = api.bankingDetails.create.useMutation({
		onSuccess: () => {
			toast.success("Bankverbindung erfolgreich erstellt");
			utils.bankingDetails.list.invalidate();
			setOpen(false);
			form.reset();
		},
		onError: (error) => {
			toast.error("Fehler beim Erstellen der Bankverbindung", {
				description: error.message ?? "Ein unerwarteter Fehler ist aufgetreten",
			});
		},
	});

	const form = useForm({
		defaultValues: {
			title: "",
			iban: "",
			fullName: "",
		},
		validators: {
			onSubmit: formSchema,
		},
		onSubmit: (value) => {
			createBankingDetails.mutate(value.value);
		},
	});

	return (
		<Dialog onOpenChange={setOpen} open={open}>
			<DialogTrigger render={<Button {...props} />} />
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Neue Bankverbindung</DialogTitle>
					<DialogDescription>
						Lege eine neue Banverbindung an um Zahlungen zu erhalten.
					</DialogDescription>
				</DialogHeader>
				<div>
					<form
						id="form-create-banking-details"
						onSubmit={(e) => {
							e.preventDefault();
							form.handleSubmit();
						}}
					>
						<FieldGroup className="grid gap-4">
							<form.Field name="title">
								{(field) => {
									const isInvalid =
										field.state.meta.isTouched && !field.state.meta.isValid;
									return (
										<Field data-invalid={isInvalid}>
											<FieldLabel htmlFor={field.name}>Titel</FieldLabel>
											<Input
												aria-invalid={isInvalid}
												id={field.name}
												name={field.name}
												onBlur={field.handleBlur}
												onChange={(e) => field.handleChange(e.target.value)}
												value={field.state.value}
											/>
											<FieldDescription>
												Nutze diesen Titel um die Bankverbindung später einfach
												wiederzufinden.
											</FieldDescription>
											{isInvalid && <FieldError errors={field.state.meta.errors} />}
										</Field>
									);
								}}
							</form.Field>
							<form.Field name="iban">
								{(field) => {
									const isInvalid =
										field.state.meta.isTouched && !field.state.meta.isValid;
									return (
										<Field data-invalid={isInvalid}>
											<FieldLabel htmlFor={field.name}>IBAN</FieldLabel>
											<IbanInput
												aria-invalid={isInvalid}
												id={field.name}
												name={field.name}
												onBlur={field.handleBlur}
												onChange={(value) => field.handleChange(value)}
												value={field.state.value}
											/>
											{isInvalid && <FieldError errors={field.state.meta.errors} />}
										</Field>
									);
								}}
							</form.Field>
							<form.Field name="fullName">
								{(field) => {
									const isInvalid =
										field.state.meta.isTouched && !field.state.meta.isValid;
									return (
										<Field data-invalid={isInvalid}>
											<FieldLabel htmlFor={field.name}>Name</FieldLabel>
											<Input
												aria-invalid={isInvalid}
												id={field.name}
												name={field.name}
												onBlur={field.handleBlur}
												onChange={(e) => field.handleChange(e.target.value)}
												value={field.state.value}
											/>
											<FieldDescription>
												Stelle sicher, dass der Name mit dem bei der Bank angegebenen Namen
												übereinstimmt.
											</FieldDescription>
											{isInvalid && <FieldError errors={field.state.meta.errors} />}
										</Field>
									);
								}}
							</form.Field>
							<Button
								disabled={createBankingDetails.isPending}
								form="form-create-banking-details"
								type="submit"
							>
								{createBankingDetails.isPending ? "Erstellen..." : "Erstellen"}
							</Button>
						</FieldGroup>
					</form>
				</div>
			</DialogContent>
		</Dialog>
	);
}
