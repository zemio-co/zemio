"use client";

import type { Report, User } from "@zemio/db";
import { format } from "date-fns";
import { CheckIcon, ShieldUserIcon, Trash2Icon } from "lucide-react";
import { useRouter } from "next/navigation";
import React from "react";
import { toast } from "sonner";
import { PageDescription, PageTitle } from "@/components/page-title";
import { ReportStatusBadge } from "@/components/report-status-badge";
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
import { Kbd, KbdGroup } from "@/components/ui/kbd";
import { ROUTES } from "@/lib/consts";
import { ADMINS_UPDATE_OWN_REPORT } from "@/lib/flags";
import { isOrganizationAdminRole } from "@/lib/organization";
import { cn } from "@/lib/utils";
import { authClient } from "@/server/better-auth/client";
import { api } from "@/trpc/react";
import { ReportAdministration } from "./report-administration";

export function ReportHeader({
	className,
	report,
	...props
}: React.ComponentProps<"header"> & {
	report: Report & { owner: Pick<User, "id" | "name" | "email"> };
}) {
	const utils = api.useUtils();
	const router = useRouter();
	const { data, isPending } = authClient.useSession();
	const { data: activeMemberRole, isPending: isRolePending } =
		authClient.useActiveMemberRole();

	const handleDelete = api.report.delete.useMutation({
		onSuccess: () => {
			toast.success("Antrag erfolgreich gelöscht");
			router.push(ROUTES.USER_DASHBOARD);
		},
		onError: ({ message }) => {
			toast.error("Fehler beim Löschen des Antrags", {
				description: message ?? "Ein unerwarteter Fehler ist aufgetreten",
			});
		},
	});

	const handleSubmit = api.report.submit.useMutation({
		onSuccess: () => {
			toast.success("Report eingereicht");
			utils.report.getById.invalidate({ id: report.id });
		},
		onError: ({ message }) => {
			toast.error("Fehler beim Einreichen des Reports", {
				description: message ?? "Ein unerwarteter Fehler ist aufgetreten",
			});
		},
	});

	const canAdministrate = React.useMemo(() => {
		if (isPending || isRolePending) return false;

		// Drafts cannot be administrated
		if (report.status === "DRAFT") return false;

		const isOwner = data?.user?.id === report.ownerId;
		const isAdmin = isOrganizationAdminRole(activeMemberRole?.role);

		// Check if admins can update their own reports
		if (ADMINS_UPDATE_OWN_REPORT && isAdmin && isOwner) return true;

		// Admins can update other reports
		if (isAdmin && !isOwner) return true;

		// Users cannot update other reports
		if (!isAdmin && !isOwner) return false;

		return false;
	}, [activeMemberRole?.role, data, isPending, isRolePending, report]);

	return (
		<header
			className={cn(
				"flex flex-col flex-wrap items-start justify-start gap-6 sm:flex-row",
				className,
			)}
			data-slot="report-header"
			{...props}
		>
			<div className="me-auto">
				<div className="flex flex-wrap-reverse items-center justify-start gap-4">
					<PageTitle>
						<span className="me-2 text-muted-foreground">#{report.tag}</span>
						{report.title}
					</PageTitle>
					<ReportStatusBadge status={report.status} />
				</div>
				<PageDescription className="mt-2">
					Erstellt am {format(report.createdAt, "dd.MM.yyyy")} um{" "}
					{format(report.createdAt, "HH:mm")} Uhr von{" "}
					<span className="font-medium text-foreground">{report.owner.name}</span>
				</PageDescription>
			</div>

			<div className="flex w-full flex-wrap items-center justify-start gap-4 sm:w-fit">
				{canAdministrate && (
					<ReportAdministration
						className="w-full sm:w-fit"
						report={report}
						variant={"outline"}
					>
						<ShieldUserIcon /> Administrieren
						<KbdGroup className="hidden sm:inline-flex">
							<Kbd>⌘</Kbd>+ <Kbd>B</Kbd>
						</KbdGroup>
					</ReportAdministration>
				)}

				{(report.status === "DRAFT" || report.status === "NEEDS_REVISION") && (
					<AlertDialog>
						<AlertDialogTrigger
							render={
								<Button
									className={"w-full sm:w-fit"}
									disabled={handleDelete.isPending}
									variant={"destructive"}
								/>
							}
						>
							<Trash2Icon />
							{handleDelete.isPending ? "Wird gelöscht..." : "Löschen"}
						</AlertDialogTrigger>
						<AlertDialogContent>
							<AlertDialogHeader>
								<AlertDialogTitle>Antrag löschen?</AlertDialogTitle>
								<AlertDialogDescription>
									Möchtest du den Antrag &ldquo;{report.title}&rdquo; wirklich löschen?
									Diese Aktion kann nicht rückgängig gemacht werden.
								</AlertDialogDescription>
							</AlertDialogHeader>
							<AlertDialogFooter>
								<AlertDialogCancel>Abbrechen</AlertDialogCancel>
								<AlertDialogAction
									disabled={handleDelete.isPending}
									onClick={() => handleDelete.mutate({ id: report.id })}
									variant={"destructive"}
								>
									<Trash2Icon /> Endgültig löschen
								</AlertDialogAction>
							</AlertDialogFooter>
						</AlertDialogContent>
					</AlertDialog>
				)}

				<Button
					className={"w-full sm:w-fit"}
					disabled={
						handleSubmit.isPending ||
						(report.status !== "DRAFT" && report.status !== "NEEDS_REVISION")
					}
					onClick={() => handleSubmit.mutate({ id: report.id })}
					variant={"default"}
				>
					{handleSubmit.isPending ? (
						"Wird eingereicht..."
					) : (
						<>
							Einreichen
							<CheckIcon />
						</>
					)}
				</Button>
			</div>
		</header>
	);
}
