"use client";
import { useForm } from "@tanstack/react-form";
import { format } from "date-fns";
import { PlusIcon } from "lucide-react";
import type React from "react";
import { useState } from "react";
import { toast } from "sonner";
import z from "zod";
import {
	Box,
	BoxItem,
	BoxItemContent,
	BoxItemDescription,
	BoxItemTitle,
} from "@/components/box";
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
import { Skeleton } from "@/components/ui/skeleton";
import { ibanSchema } from "@/lib/validators";
import { api } from "@/trpc/react";
import { SettingsSubtitle, SettingsTitle } from "./settings-typography";

function UserSettingsBankDetails() {
	return (
		<main>
			<div className="space-y-1">
				<SettingsTitle>Bankverbindungen</SettingsTitle>
				<SettingsSubtitle>
					Um Zahlungen an dein Konto zu erhalten, musst du mindestens eine
					Bankverbindung anlegen.
				</SettingsSubtitle>
			</div>
			<div className="mt-12">
				<div className="flex flex-wrap items-center justify-between gap-4">
					<p className="font-medium text-xs text-zinc-600">Deine Bankdaten</p>
					<CreateBankingDetails
						className={"text-blue-500"}
						size={"sm"}
						variant={"ghost"}
					>
						Erstellen <PlusIcon />
					</CreateBankingDetails>
				</div>
				<div className="mt-1">
					<DetailsList />
				</div>
			</div>
		</main>
	);
}

function DetailsList() {
	const { data: details, isPending } = api.bankingDetails.list.useQuery();

	if (isPending) {
		return <Skeleton className="min-h-32 w-full" />;
	}

	if (!details) {
		return <p>No details found - error</p>;
	}

	if (details.length === 0) {
		return (
			<Box>
				<BoxItem className="min-h-24">
					<BoxItemContent className="flex w-full flex-col items-center justify-center text-center">
						<BoxItemTitle>Noch keine Bankverbindung hinterlegt</BoxItemTitle>
						<BoxItemDescription>
							Hinterlege eine Bankverbindung um Zahlungen zu erhalten
						</BoxItemDescription>
					</BoxItemContent>
				</BoxItem>
			</Box>
		);
	}

	return (
		<Box>
			{details.map((detail) => (
				<BoxItem key={detail.id}>
					<BoxItemContent>
						<BoxItemTitle>{detail.title}</BoxItemTitle>
						<BoxItemDescription>
							Erstellt am {format(detail.createdAt, "dd.MM.yyyy")} um{" "}
							{format(detail.createdAt, "HH:MM")}
						</BoxItemDescription>
					</BoxItemContent>
				</BoxItem>
			))}
		</Box>
	);
}

const createBankingDetailsSchema = z.object({
	title: z.string().min(1),
	iban: ibanSchema,
	fullName: z.string().min(1),
});

export function CreateBankingDetails({
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
			onSubmit: createBankingDetailsSchema,
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

export { UserSettingsBankDetails };
