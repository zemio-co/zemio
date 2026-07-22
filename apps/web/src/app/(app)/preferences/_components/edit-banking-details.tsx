"use client";

import { useForm } from "@tanstack/react-form";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
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
	const t = useTranslations("modules.preferences.editBankingDetails");
	const [open, setOpen] = useState(false);

	return (
		<Dialog onOpenChange={setOpen} open={open}>
			<DialogTrigger render={<Button {...props} />} />
			<DialogContent>
				<DialogHeader>
					<DialogTitle>{t("dialogTitle")}</DialogTitle>
					<DialogDescription>{t("dialogDescription")}</DialogDescription>
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
	const t = useTranslations("modules.preferences.editBankingDetails");
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
			<div className="py-4 text-center text-destructive">{t("loadError")}</div>
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
	const t = useTranslations("modules.preferences.editBankingDetails");
	const tFields = useTranslations("modules.preferences.bankingDetailsForm");
	const tActions = useTranslations("modules.settings.actions");
	const utils = api.useUtils();

	const updateBankingDetails = api.bankingDetails.update.useMutation({
		onSuccess: () => {
			toast.success(t("updateSuccess"));
			utils.bankingDetails.list.invalidate();
			utils.bankingDetails.get.invalidate({ id: data.id });
			onClose();
		},
		onError: (error) => {
			toast.error(t("updateError"), {
				description: error.message ?? t("unexpectedError"),
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
									<FieldLabel htmlFor={field.name}>{tFields("titleLabel")}</FieldLabel>
									<Input
										aria-invalid={isInvalid}
										id={field.name}
										name={field.name}
										onBlur={field.handleBlur}
										onChange={(e) => field.handleChange(e.target.value)}
										value={field.state.value}
									/>
									<FieldDescription>{tFields("titleHint")}</FieldDescription>
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
									<FieldLabel htmlFor={field.name}>{tFields("ibanLabel")}</FieldLabel>
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
									<FieldLabel htmlFor={field.name}>{tFields("nameLabel")}</FieldLabel>
									<Input
										aria-invalid={isInvalid}
										id={field.name}
										name={field.name}
										onBlur={field.handleBlur}
										onChange={(e) => field.handleChange(e.target.value)}
										value={field.state.value}
									/>
									<FieldDescription>{tFields("nameHint")}</FieldDescription>
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
						{updateBankingDetails.isPending ? t("saving") : tActions("save")}
					</Button>
				</FieldGroup>
			</form>
		</div>
	);
}
