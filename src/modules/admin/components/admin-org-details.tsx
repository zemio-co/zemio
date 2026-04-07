"use client";

import { useForm } from "@tanstack/react-form";
import { ArrowLeftIcon } from "lucide-react";
import Link from "next/link";
import type React from "react";
import type { ReactNode } from "react";
import { toast } from "sonner";
import z from "zod";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
	FieldDescription,
	FieldError,
	FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { api, type RouterOutputs } from "@/trpc/react";

type OrganizationDetails = NonNullable<
	RouterOutputs["platformAdmin"]["getOrganizationDetails"]
>;

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

function AdminOrgDetails({
	initialOrganization,
}: {
	initialOrganization: OrganizationDetails;
}) {
	const organizationId = initialOrganization.id;
	const { data: organizationData } =
		api.platformAdmin.getOrganizationDetails.useQuery(
			{ organizationId },
			{ initialData: initialOrganization },
		);
	const organization = organizationData ?? initialOrganization;

	const admins = organization.members.filter(
		(member) => member.role === "admin" || member.role === "owner",
	);

	return (
		<div>
			<div>
				<Link
					className="inline-flex items-center gap-2 font-medium text-sm text-zinc-600 transition-colors hover:text-zinc-900"
					href="/platform-admin/organizations"
				>
					<ArrowLeftIcon className="size-4" />
					Go back
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

				<p className="mt-12 font-medium text-xs text-zinc-600">Admins</p>
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

			{/* <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
				<div className="space-y-6">
					<Card>
						<CardHeader>
							<CardTitle>Administrators</CardTitle>
							<CardDescription>
								Members with elevated organization access.
							</CardDescription>
						</CardHeader>
						<CardContent className="space-y-4">
							{admins.length > 0 ? (
								admins.map((member) => (
									<UserRow
										description={
											member.user.microsoftTenantId
												? `Tenant ${member.user.microsoftTenantId}`
												: "No Microsoft tenant linked"
										}
										email={member.user.email}
										key={member.id}
										name={member.user.name}
										rightContent={
											<div className="flex flex-wrap items-center gap-2">
												<Badge variant="outline">{member.role}</Badge>
												<Badge variant="outline">Platform role: {member.user.role}</Badge>
											</div>
										}
										src={member.user.image}
									/>
								))
							) : (
								<EmptyState>No organization admins found.</EmptyState>
							)}
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle>Pending Invitations</CardTitle>
							<CardDescription>
								Open invitations into this organization.
							</CardDescription>
						</CardHeader>
						<CardContent className="space-y-4">
							{pendingInvitations.length > 0 ? (
								pendingInvitations.map((invitation) => (
									<div
										className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-zinc-200 p-4"
										key={invitation.id}
									>
										<div className="space-y-1">
											<p className="font-medium text-sm text-zinc-900">
												{invitation.email}
											</p>
											<p className="text-sm text-zinc-600">
												Invited by {invitation.inviter.name} ({invitation.inviter.email})
											</p>
											<p className="text-xs text-zinc-500">
												Created {formatDate(invitation.createdAt)}. Expires{" "}
												{formatDate(invitation.expiresAt)}.
											</p>
										</div>
										<div className="flex gap-2">
											<Badge variant="outline">{invitation.role ?? "member"}</Badge>
											<Badge variant="outline">{invitation.status}</Badge>
										</div>
									</div>
								))
							) : (
								<EmptyState>No pending invitations.</EmptyState>
							)}
						</CardContent>
					</Card>
				</div>

				<div className="space-y-6">
					<Card>
						<CardHeader>
							<CardTitle>Overview</CardTitle>
							<CardDescription>
								Key identifiers and current operational status.
							</CardDescription>
						</CardHeader>
						<CardContent className="space-y-3">
							<InfoRow
								icon={<Building2Icon className="size-4" />}
								label="Organization ID"
								value={organization.id}
							/>
							<InfoRow
								icon={<CalendarIcon className="size-4" />}
								label="Created"
								value={formatDate(organization.createdAt)}
							/>
							<InfoRow
								icon={<ShieldCheckIcon className="size-4" />}
								label="Tenant mapping"
								value={organization.microsoftTenantId ?? "Not configured"}
							/>
							<InfoRow
								icon={<LinkIcon className="size-4" />}
								label="Logo URL"
								value={organization.logo ?? "Not configured"}
							/>
							<InfoRow
								icon={<Settings2Icon className="size-4" />}
								label="Org settings"
								value={organization.settings ? "Configured" : "Missing"}
							/>
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle>Counts</CardTitle>
							<CardDescription>
								Useful for support, migrations, and tenant audits.
							</CardDescription>
						</CardHeader>
						<CardContent className="grid grid-cols-2 gap-3">
							<StatTile label="Members" value={organization._count.members} />
							<StatTile label="Admins" value={admins.length} />
							<StatTile label="Invitations" value={organization._count.invitations} />
							<StatTile label="Reports" value={organization._count.reports} />
							<StatTile label="Cost units" value={organization._count.costUnits} />
							<StatTile label="Groups" value={organization._count.costUnitGroups} />
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle>Organization Settings Snapshot</CardTitle>
							<CardDescription>
								Read-only summary of the current in-tenant configuration.
							</CardDescription>
						</CardHeader>
						<CardContent className="space-y-3">
							<InfoRow
								icon={<MailIcon className="size-4" />}
								label="Reviewer email"
								value={organization.settings?.reviewerEmail ?? "Not configured"}
							/>
							<InfoRow
								icon={<UsersIcon className="size-4" />}
								label="Kilometer rate"
								value={
									organization.settings
										? `${organization.settings.kilometerRate.toString()} EUR`
										: "Not configured"
								}
							/>
							<InfoRow
								icon={<UsersIcon className="size-4" />}
								label="Food allowance"
								value={
									organization.settings
										? `${organization.settings.dailyFoodAllowance.toString()} EUR`
										: "Not configured"
								}
							/>
							<InfoRow
								icon={<LinkIcon className="size-4" />}
								label="Cost unit info URL"
								value={organization.settings?.costUnitInfoUrl ?? "Not configured"}
							/>
							<InfoRow
								icon={<CalendarIcon className="size-4" />}
								label="Settings updated"
								value={
									organization.settings
										? formatDate(organization.settings.updatedAt)
										: "Not configured"
								}
							/>
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle>All Members</CardTitle>
							<CardDescription>
								Complete membership list for audit and support work.
							</CardDescription>
						</CardHeader>
						<CardContent className="space-y-4">
							{organization.members.length > 0 ? (
								organization.members.map((member) => (
									<UserRow
										description={`Joined ${formatDate(member.createdAt)}`}
										email={member.user.email}
										key={member.id}
										name={member.user.name}
										rightContent={<Badge variant="outline">{member.role}</Badge>}
										src={member.user.image}
									/>
								))
							) : (
								<EmptyState>No members found.</EmptyState>
							)}
						</CardContent>
					</Card>
				</div>
			</div> */}
		</div>
	);
}

function OrganizationDetailsHeader({
	className,
	name,
	...props
}: React.ComponentProps<"header"> & { name: string }) {
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
				<p className="text-sm text-zinc-500">
					Verwalten Sie Organisationen und deren Microsoft-Tenant-Zuordnung.
				</p>
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
	return (
		<div className={cn("grid grid-cols-4 gap-6", className)} {...props}>
			<div className="space-y-2 rounded-lg border border-zinc-200 p-4 pb-3">
				<p className="font-medium text-xs text-zinc-500">Mitglieder</p>
				<p className="font-semibold text-2xl text-zinc-800">{memberCount}</p>
			</div>
			<div className="space-y-2 rounded-lg border border-zinc-200 p-4 pb-3">
				<p className="font-medium text-xs text-zinc-500">Reports</p>
				<p className="font-semibold text-2xl text-zinc-800">{reportCount}</p>
			</div>
			<div className="space-y-2 rounded-lg border border-zinc-200 p-4 pb-3">
				<p className="font-medium text-xs text-zinc-500">Admins</p>
				<p className="font-semibold text-2xl text-zinc-800">{adminCount}</p>
			</div>
			<div className="space-y-2 rounded-lg border border-zinc-200 p-4 pb-3">
				<p className="font-medium text-xs text-zinc-500">Einladungen</p>
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
	const utils = api.useUtils();
	const updateOrganization = api.platformAdmin.updateOrganization.useMutation({
		onSuccess: async () => {
			toast.success("Organization settings saved.");
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
			<p className="font-medium text-xs text-zinc-600">General</p>
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
											Name
										</FieldLabel>
										<FieldDescription className="mt-0.5 text-stone-500 text-xs">
											Wird Nutzern in der App und E-Mails angezeigt
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
											placeholder="Meine Organisation"
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
											Slug
										</FieldLabel>
										<FieldDescription className="mt-0.5 text-stone-500 text-xs">
											Zur eindeutigen und nutzerfreundlichen Identifikation
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
											placeholder="my-org"
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
											Microsoft Tenant ID
										</FieldLabel>
										<FieldDescription className="mt-0.5 text-stone-500 text-xs">
											Users whose Entra ID tenant matches this UUID can be assigned to this
											organization automatically.
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
											placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
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
											Logo URL
										</FieldLabel>
										<FieldDescription className="mt-0.5 text-stone-500 text-xs">
											URL zum Logo der Organisation
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
											placeholder="https://example.com/logo.png"
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
					Speichern
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
					<p className="font-medium text-sm text-zinc-800">Keine Admins</p>
					<p className="text-xs text-zinc-500">
						In dieser Organisation wurden keine Administratoren gefunden
					</p>
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

function _InfoRow({
	icon,
	label,
	value,
}: {
	icon: ReactNode;
	label: string;
	value: string;
}) {
	return (
		<div className="flex items-start gap-3 rounded-lg border border-zinc-200 p-3">
			<div className="mt-0.5 text-zinc-500">{icon}</div>
			<div className="min-w-0">
				<p className="font-medium text-sm text-zinc-700">{label}</p>
				<p className="break-all text-sm text-zinc-900">{value}</p>
			</div>
		</div>
	);
}

function _StatTile({ label, value }: { label: string; value: number }) {
	return (
		<div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
			<p className="text-xs text-zinc-500 uppercase tracking-wide">{label}</p>
			<p className="mt-2 font-semibold text-2xl text-zinc-900">{value}</p>
		</div>
	);
}

function _UserRow({
	name,
	email,
	description,
	src,
	rightContent,
}: {
	name: string;
	email: string;
	description: string;
	src: string | null;
	rightContent: ReactNode;
}) {
	return (
		<div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-zinc-200 p-4">
			<div className="flex min-w-0 items-center gap-3">
				<Avatar className="size-10">
					<AvatarImage alt={name} src={src ?? undefined} />
					<AvatarFallback>{getInitials(name)}</AvatarFallback>
				</Avatar>
				<div className="min-w-0">
					<p className="truncate font-medium text-sm text-zinc-900">{name}</p>
					<p className="truncate text-sm text-zinc-600">{email}</p>
					<p className="truncate text-xs text-zinc-500">{description}</p>
				</div>
			</div>
			<div>{rightContent}</div>
		</div>
	);
}

function _EmptyState({ children }: { children: ReactNode }) {
	return (
		<div className="rounded-lg border border-zinc-300 border-dashed p-6 text-center text-sm text-zinc-500">
			{children}
		</div>
	);
}

function getInitials(name: string) {
	return name
		.split(" ")
		.filter(Boolean)
		.slice(0, 2)
		.map((part) => part[0]?.toUpperCase() ?? "")
		.join("");
}

function emptyToNull(value: string) {
	const trimmed = value.trim();
	return trimmed.length > 0 ? trimmed : null;
}

function _slugify(value: string) {
	return value
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9\s-]/g, "")
		.replace(/\s+/g, "-")
		.replace(/-+/g, "-")
		.replace(/^[-]+|[-]+$/g, "");
}

function _formatDate(value: Date) {
	return new Intl.DateTimeFormat("en-GB", {
		dateStyle: "medium",
		timeStyle: undefined,
	}).format(value);
}

export { AdminOrgDetails };
