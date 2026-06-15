"use client";

import { useForm } from "@tanstack/react-form";
import { PlusIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	Field,
	FieldDescription,
	FieldError,
	FieldGroup,
	FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectLabel,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	Sheet,
	SheetBody,
	SheetContent,
	SheetFooter,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { ROUTES } from "@/lib/routes";
import { cn } from "@/lib/utils";
import { createReportSchema } from "@/lib/validators";
import { api, type RouterOutputs } from "@/trpc/react";

function CreateReport({ ...props }: React.ComponentProps<typeof Sheet>) {
	const formId = useId();
	const [isFormPending, setIsFormPending] = useState(false);

	return (
		<Sheet data-slot="create-report" {...props}>
			<SheetContent>
				<SheetHeader>
					<SheetTitle>Neuer Antrag</SheetTitle>
				</SheetHeader>
				<CreateReportBody formId={formId} onPendingChange={setIsFormPending} />
				<SheetFooter className="flex-row justify-end">
					<Button
						className={"w-fit"}
						disabled={isFormPending}
						form={formId}
						size={"sm"}
						type="submit"
					>
						<PlusIcon /> Antrag erstellen
					</Button>
				</SheetFooter>
			</SheetContent>
		</Sheet>
	);
}

function CreateReportBody({
	className,
	formId,
	onPendingChange,
	...props
}: React.ComponentProps<typeof SheetBody> & {
	formId: string;
	onPendingChange: (isPending: boolean) => void;
}) {
	const costUnitsQuery = api.costUnit.listGroupsWithUnits.useQuery();
	const bankingDetailsQuery = api.bankingDetails.list.useQuery();

	if (costUnitsQuery.isPending || bankingDetailsQuery.isPending) {
		return (
			<SheetBody
				className={cn("grid h-fit grow-0 gap-12", className)}
				data-slot="create-report-body"
				{...props}
			>
				<div>
					<Skeleton className="h-6 max-w-32" />
					<Skeleton className="mt-2 h-8" />
				</div>
				<div>
					<Skeleton className="h-6 max-w-32" />
					<Skeleton className="mt-2 h-8" />
				</div>
				<div>
					<Skeleton className="h-6 max-w-32" />
					<Skeleton className="mt-2 h-8" />
				</div>
			</SheetBody>
		);
	}

	if (costUnitsQuery.isError) {
		return (
			<SheetBody
				className={cn("", className)}
				data-slot="create-report-body"
				{...props}
			>
				<CreateReportErrorState
					code={costUnitsQuery.error.data?.code ?? "UNKNOWN"}
					description="Die Kostenstellen konnten nicht geladen werden."
					title="Fehler beim Laden der Kostenstellen."
				/>
			</SheetBody>
		);
	}

	if (bankingDetailsQuery.isError) {
		return (
			<SheetBody
				className={cn("", className)}
				data-slot="create-report-body"
				{...props}
			>
				<CreateReportErrorState
					code={bankingDetailsQuery.error.data?.code ?? "UNKNOWN"}
					description="Die Bankverbindungen konnten nicht geladen werden."
					title="Fehler beim Laden der Bankverbindungen."
				/>
			</SheetBody>
		);
	}

	if (!costUnitsQuery.data || !bankingDetailsQuery.data) {
		return null;
	}

	if (bankingDetailsQuery.data.length === 0) {
		return (
			<SheetBody
				className={cn("", className)}
				data-slot="create-report-body"
				{...props}
			>
				<div className="flex w-full flex-col items-center justify-center border border-slate-200 border-dashed p-8 px-8 py-10 text-center">
					<p className="font-medium text-slate-800">
						Keine Bankverbindung vorhanden
					</p>
					<p className="mt-1 text-slate-500 text-xs">
						Um einen Antrag zu erstellen, musst du zuerst eine{" "}
						<Link
							className="no-underline! font-semibold text-violet-600 transition-colors hover:text-violet-400"
							href={ROUTES.SETTINGS_USER_BANK_DETAILS()}
						>
							Bankverbindung hinterlegen
						</Link>
						.
					</p>
				</div>
			</SheetBody>
		);
	}

	return (
		<SheetBody
			className={cn("grid h-fit grow-0 gap-12", className)}
			data-slot="create-report-body"
			{...props}
		>
			<CreateReportForm
				bankingDetails={bankingDetailsQuery.data}
				costUnitsGroups={costUnitsQuery.data}
				formId={formId}
				onPendingChange={onPendingChange}
			/>
		</SheetBody>
	);
}

function CreateReportErrorState({
	className,
	title,
	code,
	description,
	...props
}: Omit<React.ComponentProps<"div">, "title"> & {
	title: string;
	description: string;
	code: string;
}) {
	return (
		<div
			className={cn(
				"flex w-full flex-col items-center justify-center border border-slate-200 border-dashed p-8 px-8 py-10 text-center",
				className,
			)}
			data-slot="create-report-error-state"
			{...props}
		>
			<p className="font-medium text-destructive">{title}</p>
			<p className="mt-1 text-slate-500 text-xs">
				{description} Code: {code}
			</p>
		</div>
	);
}

function CreateReportForm({
	costUnitsGroups,
	bankingDetails,
	formId,
	onPendingChange,
	...props
}: React.ComponentProps<"form"> & {
	costUnitsGroups: RouterOutputs["costUnit"]["listGroupsWithUnits"];
	bankingDetails: RouterOutputs["bankingDetails"]["list"];
	formId: string;
	onPendingChange?: (isPending: boolean) => void;
}) {
	const costUnitMap = useMemo(() => {
		const map = new Map<
			string,
			{ id: string; tag: string; title: string; examples: string[] }
		>();
		for (const group of costUnitsGroups) {
			for (const costUnit of group.costUnits) {
				map.set(costUnit.id, {
					id: costUnit.id,
					tag: costUnit.tag,
					title: costUnit.title,
					examples: costUnit.examples,
				});
			}
		}
		return map;
	}, [costUnitsGroups]);

	const router = useRouter();

	const createReport = api.report.create.useMutation({
		onSuccess(data) {
			toast.success("Report erfolgreich erstellt");
			router.push(ROUTES.USER_REPORT_DETAILS(data.id));
		},
		onError(error) {
			toast.error("Fehler beim Erstellen des Reports", {
				description: error.message ?? "Ein unerwarteter Fehler ist aufgetreten",
			});
		},
	});

	useEffect(() => {
		onPendingChange?.(createReport.isPending);
	}, [createReport.isPending, onPendingChange]);

	const form = useForm({
		defaultValues: {
			title: "",
			description: "",
			costUnitId: "",
			bankingDetailsId: "",
		},
		validators: {
			onSubmit: createReportSchema,
		},
		onSubmit: async ({ value }) => {
			createReport.mutate({
				...value,
			});
		},
	});

	return (
		<form
			aria-disabled={createReport.isPending}
			className={cn(createReport.isPending && "pointer-events-none opacity-50")}
			data-disabled={createReport.isPending}
			id={formId}
			onSubmit={(e) => {
				e.preventDefault();
				form.handleSubmit();
			}}
			{...props}
		>
			<FieldGroup className="grid gap-12">
				<form.Field
					children={(field) => {
						const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
						return (
							<Field data-invalid={isInvalid}>
								<FieldLabel
									className="mb-1 font-semibold text-base text-slate-800"
									htmlFor={field.name}
								>
									Titel
								</FieldLabel>
								<Input
									aria-invalid={isInvalid}
									autoComplete="off"
									id={field.name}
									name={field.name}
									onBlur={field.handleBlur}
									onChange={(e) => field.handleChange(e.target.value)}
									placeholder="Verpflegung Weihnachtsfeier"
									value={field.state.value}
								/>
								{isInvalid && <FieldError errors={field.state.meta.errors} />}
							</Field>
						);
					}}
					name="title"
				/>
				<form.Field
					children={(field) => {
						const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
						return (
							<Field data-invalid={isInvalid}>
								<FieldLabel
									className="mb-1 font-semibold text-base text-slate-800"
									htmlFor={field.name}
								>
									Beschreibung
								</FieldLabel>
								<Textarea
									aria-invalid={isInvalid}
									autoComplete="off"
									id={field.name}
									name={field.name}
									onBlur={field.handleBlur}
									onChange={(e) => field.handleChange(e.target.value)}
									placeholder="Beschreibung des Reports"
									value={field.state.value}
								/>
								<FieldDescription>
									Wird deinem Antrag als erste Notiz hinzugefügt.
								</FieldDescription>
								{isInvalid && <FieldError errors={field.state.meta.errors} />}
							</Field>
						);
					}}
					name="description"
				/>

				<form.Field
					children={(field) => {
						const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
						return (
							<Field data-invalid={isInvalid}>
								<FieldLabel
									className="mb-1 font-semibold text-base text-slate-800"
									htmlFor={field.name}
								>
									Bankverbindung
								</FieldLabel>
								<Select
									onValueChange={(value) => field.handleChange(value ?? "")}
									value={field.state.value}
								>
									<SelectTrigger aria-invalid={isInvalid} data-invalid={isInvalid}>
										<SelectValue placeholder="Bankverbindung auswählen" />
									</SelectTrigger>
									<SelectContent>
										<SelectGroup>
											{bankingDetails.map((detail) => (
												<SelectItem key={detail.id} value={detail.id}>
													<span>{detail.title}</span>
												</SelectItem>
											))}
										</SelectGroup>
									</SelectContent>
								</Select>

								<FieldDescription className="max-w-prose font-normal text-slate-500 text-sm/relaxed">
									Um Zahlungen zu erhalten, muss eine Bankverbindung hinterlegt haben. Du
									kannst deine Bankverbindung in den{" "}
									<Link
										className="no-underline! font-semibold text-violet-600 transition-colors hover:text-violet-400"
										href={ROUTES.SETTINGS_USER_BANK_DETAILS()}
									>
										Einstellungen
									</Link>{" "}
									verwalten.
								</FieldDescription>
								{isInvalid && <FieldError errors={field.state.meta.errors} />}
							</Field>
						);
					}}
					name="bankingDetailsId"
				/>

				<form.Field
					children={(field) => {
						const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
						const selectedCostUnit = costUnitMap.get(field.state.value);
						const costUnitExamples =
							selectedCostUnit?.examples && selectedCostUnit.examples.length > 0
								? selectedCostUnit.examples
								: null;

						return (
							<Field className="gap-3" data-invalid={isInvalid}>
								<FieldLabel
									className="font-semibold text-base text-slate-800"
									htmlFor={field.name}
								>
									Kostenstelle
								</FieldLabel>
								<Select
									onValueChange={(value) => field.handleChange(value ?? "")}
									value={field.state.value}
								>
									<SelectTrigger aria-invalid={isInvalid} data-invalid={isInvalid}>
										<SelectValue placeholder="Kostenstelle auswählen" />
									</SelectTrigger>
									<SelectContent>
										{costUnitsGroups.map((group) => (
											<SelectGroup key={group.id}>
												<SelectLabel>{group.title}</SelectLabel>
												{group.costUnits.length > 0 &&
													group.costUnits.map((costUnit) => (
														<SelectItem key={costUnit.id} value={costUnit.id}>
															<span>{costUnit.title}</span>
														</SelectItem>
													))}
											</SelectGroup>
										))}
									</SelectContent>
								</Select>

								{costUnitExamples && (
									<div className="mt-1 rounded-lg border border-slate-300 p-4 text-muted-foreground text-sm">
										<p className="mb-2">
											Zu der ausgewählten Kostenstelle gehören die folgenden Anliegen:
										</p>
										<ul className="list-inside list-disc font-medium text-slate-800 marker:text-slate-500">
											{costUnitExamples.map((example) => (
												<li key={example}>{example}</li>
											))}
										</ul>
									</div>
								)}
								{isInvalid && <FieldError errors={field.state.meta.errors} />}
							</Field>
						);
					}}
					name="costUnitId"
				/>
			</FieldGroup>
		</form>
	);
}

export { CreateReport };
