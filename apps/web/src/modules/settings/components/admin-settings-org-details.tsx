"use client";

import { useForm } from "@tanstack/react-form";
import { ArrowLeftIcon } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import type React from "react";
import { toast } from "sonner";
import z from "zod";
import { Button } from "@/components/ui/button";
import {
	FieldDescription,
	FieldError,
	FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ROUTES } from "@/lib/routes";
import { cn } from "@/lib/utils";
import { api } from "@/trpc/react";

const _updateOrganizationSchema = z.object({
	name: z.string().trim().min(1, "Name is required").max(100),
	slug: z
		.string()
		.trim()
		.min(1, "Slug is required")
		.max(100)
		.regex(
			/^[a-z0-9]+(?:-[a-z0-9]+)*$/,
			'Use lowercase letters, numbers, and "-" only',
		),
	logo: z.union([z.literal(""), z.url("Enter a valid logo URL")]),
	metadata: z.string().max(5000, "Metadata must be at most 5000 characters"),
	microsoftTenantId: z.union([
		z.literal(""),
		z.uuid("Microsoft Tenant ID must be a valid UUID"),
	]),
});

function AdminOrgDetails({ organizationId }: { organizationId: string }) {
	const t = useTranslations("modules.settings.adminOrgs.details");
	const {
		data: organization,
		isPending,
		error,
	} = api.platformAdmin.getOrganizationDetails.useQuery({ organizationId });

	if (isPending) {
		return <Skeleton className="h-48" />;
	}

	if (!organization || error) {
		return <p>{t("loadErrorFallback")}</p>;
	}

	const admins = organization.members.filter(
		(member) => member.role === "admin" || member.role === "owner",
	);

	return (
		<div>
			<div>
				<Link
					className="inline-flex items-center gap-2 font-medium text-sm text-zinc-600 transition-colors hover:text-zinc-900"
					href={ROUTES.SETTINGS_ADMIN_ORGS()}
				>
					<ArrowLeftIcon className="size-4" />
					{t("backLink")}
				</Link>
				<OrganizationDetailsHeader className="mt-8" name={organization.name} />

				<OrganizationDetailsMetrics
					adminCount={admins.length}
					className="mt-6"
					inviteCount={organization._count.invitations}
					memberCount={organization._count.members}
					reportCount={organization._count.reports}
				/>

				<OrganizationDetailsGeneralForm
					className="mt-12"
					initialData={{
						id: organization.id,
						name: organization.name,
						slug: organization.slug,
						logoUrl: organization.logo,
						microsoftTenantId: organization.microsoftTenantId,
						metadata: organization.metadata,
					}}
				/>

				<p className="mt-12 font-medium text-xs text-zinc-600">
					{t("adminsSectionTitle")}
				</p>
				<OrganizationDetailsAdmins
					admins={admins.map(({ user }) => {
						return {
							id: user.id,
							email: user.email,
							image: user.image,
							name: user.name,
						};
					})}
					className="mt-3"
				/>
			</div>
		</div>
	);
}

function OrganizationDetailsHeader({
	className,
	name,
	...props
}: React.ComponentProps<"header"> & { name: string }) {
	const t = useTranslations("modules.settings.adminOrgs.details");

	return (
		<header
			className={cn("flex items-start justify-start gap-4", className)}
			{...props}
		>
			<div className="mt-1 flex size-8 items-center justify-center rounded-md bg-zinc-800 font-medium text-white">
				{name.charAt(0).toUpperCase()}
			</div>
			<div className="space-y-1">
				<h1 className="font-semibold text-lg text-zinc-800">{name}</h1>
				<p className="text-sm text-zinc-500">{t("description")}</p>
			</div>
		</header>
	);
}

function OrganizationDetailsMetrics({
	className,
	memberCount,
	reportCount,
	adminCount,
	inviteCount,
	...props
}: React.ComponentProps<"div"> & {
	memberCount: number;
	reportCount: number;
	adminCount: number;
	inviteCount: number;
}) {
	const t = useTranslations("modules.settings.adminOrgs.details.metrics");

	return (
		<div className={cn("grid grid-cols-4 gap-6", className)} {...props}>
			<div className="space-y-2 rounded-lg border border-zinc-200 p-4 pb-3">
				<p className="font-medium text-xs text-zinc-500">{t("members")}</p>
				<p className="font-semibold text-2xl text-zinc-800">{memberCount}</p>
			</div>
			<div className="space-y-2 rounded-lg border border-zinc-200 p-4 pb-3">
				<p className="font-medium text-xs text-zinc-500">{t("reports")}</p>
				<p className="font-semibold text-2xl text-zinc-800">{reportCount}</p>
			</div>
			<div className="space-y-2 rounded-lg border border-zinc-200 p-4 pb-3">
				<p className="font-medium text-xs text-zinc-500">{t("admins")}</p>
				<p className="font-semibold text-2xl text-zinc-800">{adminCount}</p>
			</div>
			<div className="space-y-2 rounded-lg border border-zinc-200 p-4 pb-3">
				<p className="font-medium text-xs text-zinc-500">{t("invitations")}</p>
				<p className="font-semibold text-2xl text-zinc-800">{inviteCount}</p>
			</div>
		</div>
	);
}

const organizationDetailsGeneralFormSchema = z.object({
	name: z.string().trim().min(1, "Name is required").max(100),
	slug: z
		.string()
		.trim()
		.min(1, "Slug is required")
		.max(100)
		.regex(
			/^[a-z0-9]+(?:-[a-z0-9]+)*$/,
			'Use lowercase letters, numbers, and "-" only',
		),
	microsoftTenantId: z.union([
		z.literal(""),
		z.uuid("Microsoft Tenant ID must be a valid UUID"),
	]),
	logoUrl: z.union([z.literal(""), z.url("Enter a valid logo URL")]),
});

function OrganizationDetailsGeneralForm({
	initialData,
	className,
	...props
}: React.ComponentProps<"form"> & {
	initialData: {
		id: string;
		name: string;
		slug: string;
		microsoftTenantId?: string | null;
		logoUrl?: string | null;
		metadata: string | null;
	};
}) {
	const t = useTranslations("modules.settings.adminOrgs.details.generalForm");
	const tDetails = useTranslations("modules.settings.adminOrgs.details");
	const tActions = useTranslations("modules.settings.actions");
	const utils = api.useUtils();
	const updateOrganization = api.platformAdmin.updateOrganization.useMutation({
		onSuccess: async () => {
			toast.success(t("savedToast"));
			await Promise.all([
				utils.platformAdmin.getOrganizationDetails.invalidate({
					organizationId: initialData.id,
				}),
				utils.platformAdmin.listOrganizations.invalidate(),
			]);
		},
		onError: (error) => {
			toast.error(error.message);
		},
	});

	const form = useForm({
		validators: {
			onSubmit: organizationDetailsGeneralFormSchema,
		},
		defaultValues: {
			name: initialData.name,
			slug: initialData.slug,
			microsoftTenantId: initialData.microsoftTenantId ?? "",
			logoUrl: initialData.logoUrl ?? "",
		},
		onSubmit: ({ value }) =>
			updateOrganization.mutate({
				name: value.name,
				slug: value.slug,
				logo: emptyToNull(value.logoUrl),
				microsoftTenantId: value.microsoftTenantId,
				metadata: initialData.metadata,
				organizationId: initialData.id,
			}),
	});

	return (
		<form
			className={cn("space-y-3", className)}
			id="org-details-general-form"
			onSubmit={(e) => {
				e.preventDefault();
				form.handleSubmit();
			}}
			{...props}
		>
			<p className="font-medium text-xs text-zinc-600">
				{tDetails("generalSectionTitle")}
			</p>
			<div className="rounded-lg bg-white shadow-xs ring-1 ring-zinc-700/10">
				<form.Field name="name">
					{({ state, ...field }) => {
						const isInvalid = state.meta.isTouched && !state.meta.isValid;
						return (
							<div className="px-5" data-invalid={isInvalid} data-slot="field">
								<div className="grid grid-cols-2 gap-8 border-zinc-200 border-b py-5">
									<div className="space-y-0.5">
										<FieldLabel
											className="font-medium text-sm text-zinc-800"
											htmlFor={field.name}
										>
											{t("nameLabel")}
										</FieldLabel>
										<FieldDescription className="mt-0.5 text-stone-500 text-xs">
											{t("nameDescription")}
										</FieldDescription>
									</div>
									<div>
										<Input
											aria-invalid={isInvalid}
											autoComplete="off"
											id={field.name}
											name={field.name}
											onBlur={field.handleBlur}
											onChange={(e) => field.handleChange(e.target.value)}
											placeholder={t("namePlaceholder")}
											value={state.value}
										/>
										{isInvalid && <FieldError errors={state.meta.errors} />}
									</div>
								</div>
							</div>
						);
					}}
				</form.Field>
				<form.Field name="slug">
					{({ state, ...field }) => {
						const isInvalid = state.meta.isTouched && !state.meta.isValid;
						return (
							<div className="px-5" data-invalid={isInvalid} data-slot="field">
								<div className="grid grid-cols-2 gap-8 border-zinc-200 border-b py-5">
									<div className="space-y-0.5">
										<FieldLabel
											className="font-medium text-sm text-zinc-800"
											htmlFor={field.name}
										>
											{t("slugLabel")}
										</FieldLabel>
										<FieldDescription className="mt-0.5 text-stone-500 text-xs">
											{t("slugDescription")}
										</FieldDescription>
									</div>
									<div>
										<Input
											aria-invalid={isInvalid}
											autoComplete="off"
											id={field.name}
											name={field.name}
											onBlur={field.handleBlur}
											onChange={(e) => field.handleChange(e.target.value)}
											placeholder={t("slugPlaceholder")}
											value={state.value}
										/>
										{isInvalid && <FieldError errors={state.meta.errors} />}
									</div>
								</div>
							</div>
						);
					}}
				</form.Field>
				<form.Field name="microsoftTenantId">
					{({ state, ...field }) => {
						const isInvalid = state.meta.isTouched && !state.meta.isValid;
						return (
							<div className="px-5" data-invalid={isInvalid} data-slot="field">
								<div className="grid grid-cols-2 gap-8 border-zinc-200 border-b py-5">
									<div className="space-y-0.5">
										<FieldLabel
											className="font-medium text-sm text-zinc-800"
											htmlFor={field.name}
										>
											{t("tenantIdLabel")}
										</FieldLabel>
										<FieldDescription className="mt-0.5 text-stone-500 text-xs">
											{t("tenantIdDescription")}
										</FieldDescription>
									</div>
									<div>
										<Input
											aria-invalid={isInvalid}
											autoComplete="off"
											id={field.name}
											name={field.name}
											onBlur={field.handleBlur}
											onChange={(e) => field.handleChange(e.target.value)}
											placeholder={t("tenantIdPlaceholder")}
											value={state.value}
										/>
										{isInvalid && <FieldError errors={state.meta.errors} />}
									</div>
								</div>
							</div>
						);
					}}
				</form.Field>
				<form.Field name="logoUrl">
					{({ state, ...field }) => {
						const isInvalid = state.meta.isTouched && !state.meta.isValid;
						return (
							<div className="px-5" data-invalid={isInvalid} data-slot="field">
								<div className="grid grid-cols-2 gap-8 py-5">
									<div className="space-y-0.5">
										<FieldLabel
											className="font-medium text-sm text-zinc-800"
											htmlFor={field.name}
										>
											{t("logoUrlLabel")}
										</FieldLabel>
										<FieldDescription className="mt-0.5 text-stone-500 text-xs">
											{t("logoUrlDescription")}
										</FieldDescription>
									</div>
									<div>
										<Input
											aria-invalid={isInvalid}
											autoComplete="off"
											id={field.name}
											name={field.name}
											onBlur={field.handleBlur}
											onChange={(e) => field.handleChange(e.target.value)}
											placeholder={t("logoUrlPlaceholder")}
											value={state.value}
										/>
										{isInvalid && <FieldError errors={state.meta.errors} />}
									</div>
								</div>
							</div>
						);
					}}
				</form.Field>
			</div>
			<div className="flex w-full items-center justify-end">
				<Button
					disabled={updateOrganization.isPending}
					form="org-details-general-form"
					type="submit"
					variant={"outline"}
				>
					{tActions("save")}
				</Button>
			</div>
		</form>
	);
}

function OrganizationDetailsAdmins({
	className,
	admins,
	...props
}: React.ComponentProps<"div"> & {
	admins: { id: string; name: string; email: string; image: string | null }[];
}) {
	const t = useTranslations("modules.settings.adminOrgs.details");

	return (
		<div
			className={cn(
				"rounded-lg bg-white shadow-xs ring-1 ring-zinc-700/10",
				className,
			)}
			{...props}
		>
			{admins.length === 0 && (
				<div className="flex w-full flex-col items-center justify-center p-5 text-center">
					<p className="font-medium text-sm text-zinc-800">
						{t("adminsEmptyTitle")}
					</p>
					<p className="text-xs text-zinc-500">{t("adminsEmptyDescription")}</p>
				</div>
			)}
			{admins.map((admin) => (
				<div className="group/list-item px-5" key={admin.id}>
					<div className="flex items-center justify-start gap-4 border-b py-5 group-last/list-item:border-b-0">
						<div className="flex size-6 items-center justify-center rounded-md bg-zinc-800 font-medium text-white text-xs">
							{admin.name.charAt(0).toUpperCase()}
						</div>
						<div className="flex items-center justify-start gap-3">
							<p className="font-medium text-sm text-zinc-800">{admin.name}</p>
							<p className="text-xs text-zinc-500">{admin.email}</p>
						</div>
					</div>
				</div>
			))}
		</div>
	);
}

function emptyToNull(value: string) {
	const trimmed = value.trim();
	return trimmed.length > 0 ? trimmed : null;
}

export { AdminOrgDetails };
