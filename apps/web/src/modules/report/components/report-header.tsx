"use client";

import { AlertDialog as AlertDialogPrimitive } from "@base-ui/react";
import { useForm } from "@tanstack/react-form";
import type { Report, ReportStatus } from "@zemio/db";
import { cva } from "class-variance-authority";
import { formatDistanceToNow } from "date-fns";
import { de } from "date-fns/locale";
import {
	CalculatorIcon,
	ChevronRightIcon,
	CopyIcon,
	CornerDownRightIcon,
	CreditCardIcon,
	FingerprintIcon,
	TextIcon,
	UserIcon,
} from "lucide-react";
import Link from "next/link";
import React from "react";
import { toast } from "sonner";
import z from "zod";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	Field,
	FieldDescription,
	FieldError,
	FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ROUTES } from "@/lib/routes";
import { cn, translateReportStatus } from "@/lib/utils";
import { api } from "@/trpc/react";

function ReportHeader({
	className,
	reportId,
	...props
}: React.ComponentProps<"header"> & {
	reportId: string;
}) {
	const reportQuery = api.report.byId.useQuery({ id: reportId });

	if (reportQuery.isPending) {
		return <ReportHeaderLoading className={className} {...props} />;
	}

	if (reportQuery.error) {
		return <p>error</p>;
	}

	const { data: report } = reportQuery;

	return (
		<header
			className={cn("container", className)}
			data-slot="report-header"
			{...props}
		>
			<div className="mb-4 flex w-full items-end justify-start gap-1">
				<ReportHeaderBreadcrumb reportShortId={report.tag} />
				<HeaderStatusBadge className="flex md:hidden" status={report.status} />
				<ReportHeaderActions
					className="mt-1 ml-auto hidden md:flex"
					report={report}
				/>
			</div>
			<ReportHeaderTitle reportStatus={report.status} reportTitle={report.title} />
			<ReportSubtitle
				className="mt-4"
				reportCreatedAt={report.createdAt}
				reportOwnerName={report.owner.name}
			/>
			<ReportHeaderActions className="mt-8 flex md:hidden" report={report} />
		</header>
	);
}

function ReportHeaderBreadcrumb({
	className,
	reportShortId,
	...props
}: React.ComponentProps<"div"> & {
	reportShortId: string | number;
}) {
	const handleCopy = React.useCallback(() => {
		navigator.clipboard.writeText(reportShortId.toString());
	}, [reportShortId]);

	return (
		<div
			className={cn("flex items-center justify-start font-medium", className)}
			data-slot="report-header-breadcrumb"
			{...props}
		>
			<Link
				className="font-medium text-slate-500 text-sm"
				href={ROUTES.USER_REPORTS_LIST()}
			>
				Anträge
			</Link>
			<ChevronRightIcon className="me-0 ml-1 size-4 text-slate-400" />
			<Button
				className={
					"flex items-center justify-center gap-2 font-semibold text-sm text-violet-600"
				}
				onClick={handleCopy}
				size={"xs"}
				variant={"ghost"}
			>
				#{reportShortId}
				<CopyIcon className="size-4 opacity-0 transition-opacity group-hover/button:opacity-100" />
			</Button>
		</div>
	);
}

function ReportHeaderLoading({
	className,
	...props
}: React.ComponentProps<"header">) {
	return (
		<header
			className={cn(
				"container flex flex-col items-start justify-between gap-8 lg:flex-row",
				className,
			)}
			data-slot="report-header-loading"
			{...props}
		>
			<div className="">
				<Skeleton className="h-6 w-32" />
				<Skeleton className="my-4 h-10 w-72" />
				<Skeleton className="my-4 h-6 w-64" />
			</div>
			<div className="flex w-full flex-col items-start justify-start gap-4 sm:w-fit sm:flex-row">
				<Skeleton className="h-7 w-full sm:w-24" />
				<Skeleton className="h-7 w-full sm:w-24" />
				<Skeleton className="h-7 w-full sm:w-24" />
			</div>
		</header>
	);
}

function ReportHeaderTitle({
	className,
	reportStatus,
	reportTitle,
	...props
}: React.ComponentProps<"div"> & {
	reportStatus: ReportStatus;
	reportTitle: string;
}) {
	return (
		<div
			className={cn(
				"flex flex-col-reverse items-start justify-start gap-4 md:flex-row",
				className,
			)}
			data-slot="report-header-title"
			{...props}
		>
			<h1 className="font-semibold text-2xl text-slate-800">{reportTitle}</h1>
			<HeaderStatusBadge className="mt-1 hidden md:flex" status={reportStatus} />
		</div>
	);
}

const statusBadgeVariants = cva(
	"inline-flex h-5 w-fit shrink-0 items-center justify-center rounded-full border px-2 font-medium text-xs leading-none sm:h-6 sm:text-sm",
	{
		variants: {
			status: {
				DRAFT: "border-slate-300 bg-slate-100 text-slate-700",
				PENDING_APPROVAL: "border-yellow-300 bg-yellow-50 text-yellow-700",
				NEEDS_REVISION: "border-orange-300 bg-orange-50 text-orange-700",
				REJECTED: "border-red-300 bg-red-50 text-red-700",
				ACCEPTED: "border-green-300 bg-green-50 text-green-700",
			},
		},
	},
);

function HeaderStatusBadge({
	className,
	status,
	...props
}: React.ComponentProps<"span"> & {
	status: ReportStatus;
}) {
	return (
		<span
			className={cn(statusBadgeVariants({ status, className }))}
			data-slot="header-status-badge"
			{...props}
		>
			{translateReportStatus(status)}
		</span>
	);
}

function ReportSubtitle({
	className,
	reportOwnerName,
	reportCreatedAt,
	...props
}: React.ComponentProps<"div"> & {
	reportOwnerName: string;
	reportCreatedAt: Date;
}) {
	return (
		<div
			className={cn(
				"flex flex-nowrap items-start justify-start gap-2 text-sm",
				className,
			)}
			data-slot="report-subtitle"
			{...props}
		>
			<CornerDownRightIcon className="mt-0.5 size-3.5 shrink-0 text-slate-400" />
			<div className="flex flex-col items-start justify-start gap-x-2 gap-y-1 sm:flex-row">
				<p className="text-slate-500">
					Antrag eingereicht von{" "}
					<span className="font-semibold text-violet-600">{reportOwnerName}</span>
				</p>
				<p className="hidden shrink-0 text-slate-400 sm:block">•</p>
				<p className="shrink-0 text-slate-500">
					{formatDistanceToNow(reportCreatedAt, {
						addSuffix: true,
						locale: de,
					})}{" "}
					erstellt
				</p>
			</div>
		</div>
	);
}

function ReportHeaderActions({
	className,
	report,
	...props
}: React.ComponentProps<"div"> & {
	report: Report;
}) {
	return (
		<div
			className={cn(
				"flex w-full flex-col flex-nowrap items-center justify-center gap-4 sm:w-fit sm:flex-row",
				className,
			)}
			data-slot="report-header-actions"
			{...props}
		>
			<ReportHeaderCopyAction
				className={"w-full sm:w-fit"}
				report={report}
				variant={"outline"}
			>
				Kopieren
			</ReportHeaderCopyAction>
			<ReportHeaderEditAction
				className={"w-full sm:w-fit"}
				report={report}
				variant={"outline"}
			>
				Bearbeiten
			</ReportHeaderEditAction>

			<ReportHeaderSubmitAction className={"w-full sm:w-fit"} report={report}>
				Einreichen
			</ReportHeaderSubmitAction>
		</div>
	);
}

function ReportHeaderCopyAction({
	report,
	...props
}: React.ComponentProps<typeof Button> & {
	report: Report;
}) {
	const financialQuery = api.report.financialSummary.useQuery({
		id: report.id,
	});

	if (financialQuery.isPending) {
		return <Button disabled {...props} />;
	}

	if (financialQuery.error) {
		return <Button disabled {...props} />;
	}

	const { data: financialSummary } = financialQuery;

	const copyActions = [
		{
			id: "id",
			icon: FingerprintIcon,
			title: "ID",
			value: report.id,
		},
		{
			id: "iban",
			icon: CreditCardIcon,
			title: "IBAN",
			value: financialSummary.iban,
		},
		{
			id: "name",
			icon: UserIcon,
			title: "Kontoname",
			value: financialSummary.ownerName,
		},
		{
			id: "sum",
			icon: CalculatorIcon,
			title: "Summe",
			value: financialSummary.totalAmount,
		},
		{
			id: "title",
			icon: TextIcon,
			title: "Titel",
			value: report.title,
		},
	];

	return (
		<DropdownMenu>
			<DropdownMenuTrigger render={<Button disableAnimation {...props} />} />
			<DropdownMenuContent align="center" className="min-w-48">
				<DropdownMenuGroup>
					{copyActions.map(({ icon: Icon, ...action }) => {
						return (
							<DropdownMenuItem
								key={action.id}
								onClick={() => {
									navigator.clipboard.writeText(action.value.toString());
									toast.success(`${action.title} wurde zum Clipboard kopiert`);
								}}
							>
								<Icon /> {action.title} kopieren
							</DropdownMenuItem>
						);
					})}
				</DropdownMenuGroup>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

function ReportHeaderEditAction({
	report,
	disabled,
	...props
}: React.ComponentProps<typeof Button> & {
	report: Report;
}) {
	const editTitleHandle = AlertDialogPrimitive.createHandle();

	const disabledByStatus = React.useMemo(() => {
		return !(report.status === "DRAFT" || report.status === "NEEDS_REVISION");
	}, [report.status]);

	return (
		<>
			<DropdownMenu>
				<DropdownMenuTrigger
					render={
						<Button
							disableAnimation
							disabled={disabled || disabledByStatus}
							{...props}
						/>
					}
				/>
				<DropdownMenuContent align="center" className="min-w-48">
					<DropdownMenuGroup>
						<DropdownMenuItem onClick={() => editTitleHandle.open(null)}>
							<TextIcon /> Titel bearbeiten
						</DropdownMenuItem>
					</DropdownMenuGroup>
				</DropdownMenuContent>
			</DropdownMenu>
			<ReportHeaderEditTitle
				handle={editTitleHandle}
				reportId={report.id}
				reportTitle={report.title}
			/>
		</>
	);
}

const editTitleFormSchema = z.object({
	title: z.string().min(1, "Titel darf nicht leer sein"),
});

function ReportHeaderEditTitle({
	reportId,
	reportTitle,
	...props
}: React.ComponentProps<typeof AlertDialog> & {
	reportId: string;
	reportTitle: string;
}) {
	const utils = api.useUtils();
	const updateMutation = api.report.update.useMutation({
		onSuccess: () => {
			toast.success("Titel wurde erfolgreich aktualisiert.");
			utils.report.byId.invalidate({ id: reportId });
			props.handle?.close();
		},
	});

	const form = useForm({
		defaultValues: {
			title: reportTitle,
		},
		validators: {
			onSubmit: editTitleFormSchema,
		},
		onSubmit: async ({ value }) => {
			updateMutation.mutate({
				id: reportId,
				title: value.title,
			});
		},
	});

	return (
		<AlertDialog data-slot="report-header-edit-title" {...props}>
			<AlertDialogContent className={"data-[size=default]:sm:max-w-md"}>
				<form
					id="update-report-title"
					onSubmit={(e) => {
						e.preventDefault();
						form.handleSubmit(e);
					}}
				>
					<AlertDialogHeader>
						<AlertDialogTitle>Titel bearbeiten</AlertDialogTitle>
						<AlertDialogDescription>
							Bearbeite den öffentlichen Titel deines Antrags.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<div className="pt-8 pb-8">
						<form.Field
							children={(field) => {
								const isInvalid =
									field.state.meta.isTouched && !field.state.meta.isValid;
								return (
									<Field data-invalid={isInvalid}>
										<FieldLabel className="text-slate-800" htmlFor={field.name}>
											Beschreibung
										</FieldLabel>
										<Input
											aria-invalid={isInvalid}
											autoComplete="off"
											id={field.name}
											name={field.name}
											onBlur={field.handleBlur}
											onChange={(e) => field.handleChange(e.target.value)}
											placeholder="Einkauf für die Weihnachtsfeier"
											value={field.state.value}
										/>
										<FieldDescription>
											Der Titel ist für dich und Administratoren sichtbar.
										</FieldDescription>
										{isInvalid && <FieldError errors={field.state.meta.errors} />}
									</Field>
								);
							}}
							name="title"
						/>
					</div>
					<AlertDialogFooter>
						<AlertDialogCancel disabled={updateMutation.isPending}>
							Abbrechen
						</AlertDialogCancel>
						<AlertDialogAction
							disabled={updateMutation.isPending}
							form="update-report-title"
							type="submit"
						>
							Speichern
						</AlertDialogAction>
					</AlertDialogFooter>
				</form>
			</AlertDialogContent>
		</AlertDialog>
	);
}

function ReportHeaderSubmitAction({
	report,
	disabled,
	...props
}: React.ComponentProps<typeof Button> & {
	report: Report;
}) {
	const utils = api.useUtils();
	const handle = React.useMemo(() => {
		return AlertDialogPrimitive.createHandle();
	}, []);

	const disabledByStatus = React.useMemo(() => {
		return !(report.status === "DRAFT" || report.status === "NEEDS_REVISION");
	}, [report.status]);

	const transitionMutation = api.report.transition.useMutation({
		onSuccess() {
			toast.success("Antrag wurde erfolgreich eingereicht");
			utils.report.byId.invalidate({ id: report.id });
			handle.close();
		},
	});

	const handleSubmit = async () => {
		transitionMutation.mutate({
			id: report.id,
			status: "PENDING_APPROVAL",
			notify: true,
		});
	};

	return (
		<AlertDialog data-slot="report-header-submit-action" handle={handle}>
			<AlertDialogTrigger
				render={<Button disabled={disabled || disabledByStatus} {...props} />}
			/>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>
						Willst du deinen Antrag wirklich einreichen?
					</AlertDialogTitle>
					<AlertDialogDescription>
						Du kannst den Antrag nicht mehr bearbeiten, nachdem du ihn eingereicht
						hast.
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel disabled={transitionMutation.isPending}>
						Abbrechen
					</AlertDialogCancel>
					<AlertDialogAction
						disabled={transitionMutation.isPending}
						onClick={handleSubmit}
					>
						Einreichen
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}

export { ReportHeader };
