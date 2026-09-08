"use client";

import { NumberField } from "@base-ui/react";
import { useForm } from "@tanstack/react-form";
import {
	Field,
	FieldContent,
	FieldDescription,
	FieldError,
	FieldLabel,
	InputGroup,
	InputGroupInput,
	Skeleton,
	Switch,
} from "@zemio/ui";
import { formatDate } from "date-fns";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { DatePicker } from "@/components/date-picker";
import { useSaveBar } from "@/components/save-bar";
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { updateDatevSettingsSchema } from "@/lib/validators";
import { api } from "@/trpc/react";
import {
	SettingsCard,
	SettingsCardContent,
	SettingsCardLabel,
} from "../settings-card";
import { SettingsError } from "../settings-error";
import { SettingsSubtitle, SettingsTitle } from "../settings-typography";

/**
 * The DATEV export configuration (DEV-21).
 *
 * None of these values can be guessed: five are dictated by the Kanzlei and
 * four are the account mapping it signs off. The page says so rather than
 * offering defaults, because a made-up Sachkonto reaches the Kanzlei looking
 * like a deliberate one — and the export exists to remove manual rework, not
 * to relocate it.
 *
 * Every field can be left empty and saved. The values arrive from the Kanzlei a
 * few at a time, and the export's preflight names whatever is still missing, so
 * a half-filled form is a normal state rather than an error.
 */
function OrgSettingsDatev({
	className,
	...props
}: React.ComponentProps<"main">) {
	const t = useTranslations("modules.settings.datev");

	return (
		<main
			className={cn("py-16", className)}
			data-slot="org-settings-datev"
			{...props}
		>
			<div className="container max-w-4xl space-y-1">
				<SettingsTitle>{t("title")}</SettingsTitle>
				<SettingsSubtitle>{t("description")}</SettingsSubtitle>
			</div>
			<div className="container mt-12 max-w-4xl">
				<DatevSection />
			</div>
		</main>
	);
}

/** `dd.MM.yyyy` for the picker; empty when nothing is configured yet. */
const toDateInput = (value: Date | null) =>
	value ? formatDate(value, "dd.MM.yyyy") : "";

type DatevFormValues = {
	datevBeraternummer: number | null;
	datevMandantennummer: number | null;
	/** `dd.MM.yyyy` as the picker writes it; "" means not set. */
	datevWirtschaftsjahrBeginn: string;
	datevSachkontenlaenge: number | null;
	datevKontenrahmen: "03" | "04" | null;
	datevExpenseAccountReceipt: string | null;
	datevExpenseAccountTravel: string | null;
	datevExpenseAccountFood: string | null;
	datevContraAccount: string | null;
	datevFestschreibung: boolean;
};

function toFormValues(data: {
	datevBeraternummer: number | null;
	datevMandantennummer: number | null;
	datevWirtschaftsjahrBeginn: Date | null;
	datevSachkontenlaenge: number | null;
	datevKontenrahmen: "03" | "04" | null;
	datevExpenseAccountReceipt: string | null;
	datevExpenseAccountTravel: string | null;
	datevExpenseAccountFood: string | null;
	datevContraAccount: string | null;
	datevFestschreibung: boolean;
}): DatevFormValues {
	return {
		datevBeraternummer: data.datevBeraternummer,
		datevMandantennummer: data.datevMandantennummer,
		datevWirtschaftsjahrBeginn: toDateInput(data.datevWirtschaftsjahrBeginn),
		datevSachkontenlaenge: data.datevSachkontenlaenge,
		datevKontenrahmen: data.datevKontenrahmen,
		datevExpenseAccountReceipt: data.datevExpenseAccountReceipt,
		datevExpenseAccountTravel: data.datevExpenseAccountTravel,
		datevExpenseAccountFood: data.datevExpenseAccountFood,
		datevContraAccount: data.datevContraAccount,
		datevFestschreibung: data.datevFestschreibung,
	};
}

function DatevSection({ className, ...props }: React.ComponentProps<"div">) {
	const t = useTranslations("modules.settings.datev");
	const tShared = useTranslations("modules.settings.shared");
	const query = api.settings.get.useQuery();

	if (query.isPending) {
		return <Skeleton className={cn("h-96 w-full", className)} {...props} />;
	}

	if (query.error) {
		const { error } = query;

		return (
			<SettingsError
				description={error.data?.code ?? tShared("unknownError")}
				message={error.message}
			/>
		);
	}

	return (
		<div className={cn(className)} {...props}>
			<SettingsCard data-slot="org-settings-datev-mandant">
				<SettingsCardLabel>{t("sections.mandant")}</SettingsCardLabel>
				<SettingsCardContent>
					<DatevForm defaultValues={toFormValues(query.data)} />
				</SettingsCardContent>
			</SettingsCard>
		</div>
	);
}

const DATEV_FORM_ID = "org-update-datev-settings-form";

function DatevForm({
	defaultValues,
	...props
}: React.ComponentProps<"form"> & { defaultValues: DatevFormValues }) {
	const t = useTranslations("modules.settings.datev");
	const utils = api.useUtils();

	const updateMutation = api.settings.updateDatevSettings.useMutation({
		onSuccess: (updated) => {
			utils.settings.get.setData(undefined, updated);
			void utils.settings.get.invalidate();
		},
		onError: (error) => {
			toast.error(t("saveErrorTitle"), {
				description: error.message ?? t("saveErrorFallback"),
			});
		},
	});

	const form = useForm({
		defaultValues,
		validators: { onSubmit: updateDatevSettingsSchema },
		onSubmit: async ({ value }) => {
			try {
				const updated = await updateMutation.mutateAsync(value);
				// Re-baseline so the form goes clean and the save bar can complete.
				form.reset(toFormValues(updated));
			} catch {
				// error toast handled by the mutation's onError; form stays dirty
			}
		},
	});

	useSaveBar(DATEV_FORM_ID, form);

	return (
		<form
			className="space-y-8"
			data-slot="datev-settings-form"
			id={DATEV_FORM_ID}
			onSubmit={(e) => {
				e.preventDefault();
				form.handleSubmit();
			}}
			{...props}
		>
			<form.Field name="datevBeraternummer">
				{({ state, ...field }) => (
					<NumberSetting
						description={t("consultant.description")}
						errors={state.meta.errors}
						isInvalid={!state.meta.isValid && state.meta.isTouched}
						label={t("consultant.label")}
						name={field.name}
						onChange={field.handleChange}
						value={state.value}
					/>
				)}
			</form.Field>

			<form.Field name="datevMandantennummer">
				{({ state, ...field }) => (
					<NumberSetting
						description={t("client.description")}
						errors={state.meta.errors}
						isInvalid={!state.meta.isValid && state.meta.isTouched}
						label={t("client.label")}
						name={field.name}
						onChange={field.handleChange}
						value={state.value}
					/>
				)}
			</form.Field>

			<form.Field name="datevWirtschaftsjahrBeginn">
				{({ state, ...field }) => {
					const isInvalid = !state.meta.isValid && state.meta.isTouched;

					return (
						<Field data-invalid={isInvalid}>
							<FieldContent>
								<FieldLabel htmlFor={field.name}>{t("fiscalYear.label")}</FieldLabel>
								<FieldDescription>{t("fiscalYear.description")}</FieldDescription>
							</FieldContent>
							<div className="space-y-2">
								<DatePicker
									aria-invalid={isInvalid}
									id={field.name}
									name={field.name}
									onBlur={field.handleBlur}
									onChange={(event) => field.handleChange(event.target.value)}
									value={state.value}
								/>
								{isInvalid && <FieldError errors={state.meta.errors} />}
							</div>
						</Field>
					);
				}}
			</form.Field>

			<form.Field name="datevSachkontenlaenge">
				{({ state, ...field }) => (
					<NumberSetting
						description={t("accountLength.description")}
						errors={state.meta.errors}
						isInvalid={!state.meta.isValid && state.meta.isTouched}
						label={t("accountLength.label")}
						max={8}
						min={4}
						name={field.name}
						onChange={field.handleChange}
						value={state.value}
					/>
				)}
			</form.Field>

			<form.Field name="datevKontenrahmen">
				{({ state, ...field }) => {
					const isInvalid = !state.meta.isValid && state.meta.isTouched;
					const options = [
						{ value: "03" as const, label: t("chartOfAccounts.skr03") },
						{ value: "04" as const, label: t("chartOfAccounts.skr04") },
					];

					return (
						<Field data-invalid={isInvalid}>
							<FieldContent>
								<FieldLabel htmlFor={field.name}>
									{t("chartOfAccounts.label")}
								</FieldLabel>
								<FieldDescription>{t("chartOfAccounts.description")}</FieldDescription>
							</FieldContent>
							<div className="space-y-2">
								<Select
									items={options}
									onValueChange={(value) =>
										field.handleChange((value as "03" | "04" | null) ?? null)
									}
									value={state.value ?? ""}
								>
									<SelectTrigger
										aria-invalid={isInvalid}
										data-invalid={isInvalid}
										id={field.name}
									>
										<SelectValue placeholder={t("chartOfAccounts.placeholder")} />
									</SelectTrigger>
									<SelectContent>
										<SelectGroup>
											{options.map((option) => (
												<SelectItem key={option.value} value={option.value}>
													<span>{option.label}</span>
												</SelectItem>
											))}
										</SelectGroup>
									</SelectContent>
								</Select>
								{isInvalid && <FieldError errors={state.meta.errors} />}
							</div>
						</Field>
					);
				}}
			</form.Field>

			<form.Field name="datevExpenseAccountReceipt">
				{({ state, ...field }) => (
					<AccountSetting
						description={t("accountReceipt.description")}
						errors={state.meta.errors}
						isInvalid={!state.meta.isValid && state.meta.isTouched}
						label={t("accountReceipt.label")}
						name={field.name}
						onBlur={field.handleBlur}
						onChange={field.handleChange}
						value={state.value}
					/>
				)}
			</form.Field>

			<form.Field name="datevExpenseAccountTravel">
				{({ state, ...field }) => (
					<AccountSetting
						description={t("accountTravel.description")}
						errors={state.meta.errors}
						isInvalid={!state.meta.isValid && state.meta.isTouched}
						label={t("accountTravel.label")}
						name={field.name}
						onBlur={field.handleBlur}
						onChange={field.handleChange}
						value={state.value}
					/>
				)}
			</form.Field>

			<form.Field name="datevExpenseAccountFood">
				{({ state, ...field }) => (
					<AccountSetting
						description={t("accountFood.description")}
						errors={state.meta.errors}
						isInvalid={!state.meta.isValid && state.meta.isTouched}
						label={t("accountFood.label")}
						name={field.name}
						onBlur={field.handleBlur}
						onChange={field.handleChange}
						value={state.value}
					/>
				)}
			</form.Field>

			<form.Field name="datevContraAccount">
				{({ state, ...field }) => (
					<AccountSetting
						description={t("contraAccount.description")}
						errors={state.meta.errors}
						isInvalid={!state.meta.isValid && state.meta.isTouched}
						label={t("contraAccount.label")}
						name={field.name}
						onBlur={field.handleBlur}
						onChange={field.handleChange}
						value={state.value}
					/>
				)}
			</form.Field>

			<form.Field name="datevFestschreibung">
				{({ state, ...field }) => (
					<Field>
						<FieldContent>
							<FieldLabel htmlFor={field.name}>{t("festschreibung.label")}</FieldLabel>
							<FieldDescription>{t("festschreibung.description")}</FieldDescription>
						</FieldContent>
						<Switch
							checked={state.value}
							id={field.name}
							onCheckedChange={(checked) => field.handleChange(checked)}
						/>
					</Field>
				)}
			</form.Field>
		</form>
	);
}

type SettingFieldProps = {
	description: string;
	errors?: Array<{ message?: string } | undefined>;
	isInvalid: boolean;
	label: string;
	name: string;
};

/**
 * One of the numbers the Kanzlei dictates.
 *
 * An empty field is stored as `null`, never as 0: the preflight reports a
 * missing value and names the field, where a zero would pass silently into the
 * header and have the whole file refused on import.
 */
function NumberSetting({
	description,
	errors,
	isInvalid,
	label,
	max,
	min,
	name,
	onChange,
	value,
}: SettingFieldProps & {
	max?: number;
	min?: number;
	onChange: (value: number | null) => void;
	value: number | null;
}) {
	return (
		<Field data-invalid={isInvalid}>
			<FieldContent>
				<FieldLabel htmlFor={name}>{label}</FieldLabel>
				<FieldDescription>{description}</FieldDescription>
			</FieldContent>
			<div className="space-y-2">
				<NumberField.Root
					max={max}
					min={min}
					onValueChange={(next) => onChange(next ?? null)}
					value={value}
				>
					<NumberField.Group>
						<InputGroup className="overflow-hidden opacity-100!">
							<NumberField.Input
								render={
									<InputGroupInput
										aria-invalid={isInvalid}
										autoComplete="off"
										id={name}
										inputMode="numeric"
										name={name}
									/>
								}
							/>
						</InputGroup>
					</NumberField.Group>
				</NumberField.Root>
				{isInvalid && <FieldError errors={errors} />}
			</div>
		</Field>
	);
}

/**
 * A ledger account number. Empty reads as "not configured yet" rather than as
 * an empty account, so the preflight can name it.
 */
function AccountSetting({
	description,
	errors,
	isInvalid,
	label,
	name,
	onBlur,
	onChange,
	value,
}: SettingFieldProps & {
	onBlur: () => void;
	onChange: (value: string | null) => void;
	value: string | null;
}) {
	return (
		<Field data-invalid={isInvalid}>
			<FieldContent>
				<FieldLabel htmlFor={name}>{label}</FieldLabel>
				<FieldDescription>{description}</FieldDescription>
			</FieldContent>
			<div className="space-y-2">
				<InputGroup className="overflow-hidden opacity-100!">
					<InputGroupInput
						aria-invalid={isInvalid}
						autoComplete="off"
						id={name}
						inputMode="numeric"
						name={name}
						onBlur={onBlur}
						onChange={(event) => onChange(event.target.value || null)}
						value={value ?? ""}
					/>
				</InputGroup>
				{isInvalid && <FieldError errors={errors} />}
			</div>
		</Field>
	);
}

export { OrgSettingsDatev };
