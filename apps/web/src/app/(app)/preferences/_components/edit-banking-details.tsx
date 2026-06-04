"use client";

import { useForm } from "@tanstack/react-form";
import { Loader2 } from "lucide-react";
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

export function EditBankingDetailsForm({
	detailsId,
	...props
}: React.ComponentProps<typeof Button> & { detailsId: string }) {
	const [open, setOpen] = useState(false);

	return (
		<Dialog onOpenChange={setOpen} open={open}>
			<DialogTrigger render={<Button {...props} />} />
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Bankverbindung bearbeiten</DialogTitle>
					<DialogDescription>
						Bearbeite deine Bankverbindung um Zahlungen zu erhalten.
					</DialogDescription>
				</DialogHeader>
				{/* Only render (and fetch data) when dialog is open */}
				{open && (
					<EditBankingDetailsFormContent
						detailsId={detailsId}
						onClose={() => setOpen(false)}
					/>
				)}
			</DialogContent>
		</Dialog>
	);
}

function EditBankingDetailsFormContent({
	detailsId,
	onClose,
}: {
	detailsId: string;
	onClose: () => void;
}) {
	const { data, isPending, isError } = api.bankingDetails.get.useQuery({
		id: detailsId,
	});

	if (isPending) {
		return (
			<div className="flex items-center justify-center py-8">
				<Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
			</div>
		);
	}

	if (isError || !data) {
		return (
			<div className="py-4 text-center text-destructive">
				Fehler beim Laden der Bankverbindung
			</div>
		);
	}

	return <EditBankingDetailsFormInner data={data} onClose={onClose} />;
}

function EditBankingDetailsFormInner({
	data,
	onClose,
}: {
	data: {
		id: string;
		title: string;
		iban: string;
		fullName: string;
	};
	onClose: () => void;
}) {
	const utils = api.useUtils();

	const updateBankingDetails = api.bankingDetails.update.useMutation({
		onSuccess: () => {
			toast.success("Bankverbindung erfolgreich aktualisiert");
			utils.bankingDetails.list.invalidate();
			utils.bankingDetails.get.invalidate({ id: data.id });
			onClose();
		},
		onError: (error) => {
			toast.error("Fehler beim Aktualisieren der Bankverbindung", {
				description: error.message ?? "Ein unerwarteter Fehler ist aufgetreten",
			});
		},
	});

	const form = useForm({
		defaultValues: {
			title: data.title,
			iban: data.iban,
			fullName: data.fullName,
		},
		validators: {
			onSubmit: formSchema,
		},
		onSubmit: (value) => {
			updateBankingDetails.mutate({
				id: data.id,
				...value.value,
			});
		},
	});

	return (
		<div>
			<form
				id="form-edit-banking-details"
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
						disabled={updateBankingDetails.isPending}
						form="form-edit-banking-details"
						type="submit"
					>
						{updateBankingDetails.isPending ? "Speichern..." : "Speichern"}
					</Button>
				</FieldGroup>
			</form>
		</div>
	);
}
