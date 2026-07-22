"use client";
import { useForm } from "@tanstack/react-form";
import { format } from "date-fns";
import { PlusIcon } from "lucide-react";
import { useTranslations } from "next-intl";
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
	const t = useTranslations("modules.settings.banking");

	return (
		<main>
			<div className="space-y-1">
				<SettingsTitle>{t("title")}</SettingsTitle>
				<SettingsSubtitle>{t("description")}</SettingsSubtitle>
			</div>
			<div className="mt-12">
				<div className="flex flex-wrap items-center justify-between gap-4">
					<p className="font-medium text-xs text-zinc-600">{t("listHeading")}</p>
					<CreateBankingDetails
						className={"text-blue-500"}
						size={"sm"}
						variant={"ghost"}
					>
						{t("createButton")} <PlusIcon />
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
	const t = useTranslations("modules.settings.banking");
	const { data: details, isPending } = api.bankingDetails.list.useQuery();

	if (isPending) {
		return <Skeleton className="min-h-32 w-full" />;
	}

	if (!details) {
		return <p>{t("loadErrorFallback")}</p>;
	}

	if (details.length === 0) {
		return (
			<Box>
				<BoxItem className="min-h-24">
					<BoxItemContent className="flex w-full flex-col items-center justify-center text-center">
						<BoxItemTitle>{t("emptyTitle")}</BoxItemTitle>
						<BoxItemDescription>{t("emptyDescription")}</BoxItemDescription>
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
							{t("createdOn", {
								date: format(detail.createdAt, "dd.MM.yyyy"),
								time: format(detail.createdAt, "HH:mm"),
							})}
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
	const t = useTranslations("modules.settings.banking.createDialog");
	const utils = api.useUtils();
	const [open, setOpen] = useState(false);

	const createBankingDetails = api.bankingDetails.create.useMutation({
		onSuccess: () => {
			toast.success(t("savedToast"));
			utils.bankingDetails.list.invalidate();
			setOpen(false);
			form.reset();
		},
		onError: (error) => {
			toast.error(t("saveErrorTitle"), {
				description: error.message ?? t("saveErrorFallback"),
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
					<DialogTitle>{t("title")}</DialogTitle>
					<DialogDescription>{t("description")}</DialogDescription>
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
											<FieldLabel htmlFor={field.name}>{t("titleLabel")}</FieldLabel>
											<Input
												aria-invalid={isInvalid}
												id={field.name}
												name={field.name}
												onBlur={field.handleBlur}
												onChange={(e) => field.handleChange(e.target.value)}
												value={field.state.value}
											/>
											<FieldDescription>{t("titleDescription")}</FieldDescription>
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
											<FieldLabel htmlFor={field.name}>{t("ibanLabel")}</FieldLabel>
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
											<FieldLabel htmlFor={field.name}>{t("nameLabel")}</FieldLabel>
											<Input
												aria-invalid={isInvalid}
												id={field.name}
												name={field.name}
												onBlur={field.handleBlur}
												onChange={(e) => field.handleChange(e.target.value)}
												value={field.state.value}
											/>
											<FieldDescription>{t("nameDescription")}</FieldDescription>
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
								{createBankingDetails.isPending ? t("submitCreating") : t("submitIdle")}
							</Button>
						</FieldGroup>
					</form>
				</div>
			</DialogContent>
		</Dialog>
	);
}

export { UserSettingsBankDetails };
