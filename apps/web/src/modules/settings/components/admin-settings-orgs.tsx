"use client";

import { useForm } from "@tanstack/react-form";
import { ChevronRightIcon, PlusIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import z from "zod";
import {
	Box,
	BoxItem,
	BoxItemContent,
	BoxItemDescription,
	BoxItemIcon,
	BoxItemLink,
	BoxItemTitle,
} from "@/components/box";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import {
	Field,
	FieldDescription,
	FieldGroup,
	FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ROUTES } from "@/lib/routes";
import { api } from "@/trpc/react";

interface _Organization {
	id: string;
	name: string;
	slug: string;
	microsoftTenantId: string | null;
	createdAt: Date;
	_count: { members: number };
}

function AdminSettingsOrgs() {
	return (
		<div>
			<div className="space-y-1">
				<h1 className="font-semibold text-lg text-zinc-800">Organisationen</h1>
				<p className="text-sm text-zinc-600">
					Verwalten Sie Organisationen und deren Microsoft-Tenant-Zuordnung.
				</p>
			</div>

			<Box className="mt-12">
				<BoxItem>
					<BoxItemContent className="mr-auto">
						<BoxItemTitle>Neue Organisation</BoxItemTitle>
						<BoxItemDescription>
							Erstelle eine neue Organisation um zu kollaborieren
						</BoxItemDescription>
					</BoxItemContent>
					<CreateOrganization />
				</BoxItem>
			</Box>

			<div className="mt-12">
				<div className="flex flex-wrap items-end justify-between gap-4">
					<p className="font-medium text-xs text-zinc-600">Organisationen</p>
				</div>
				<div className="mt-3">
					<OrgsList />
				</div>
			</div>
		</div>
	);
}

function OrgsList() {
	const {
		data: organizations,
		error,
		isPending,
	} = api.platformAdmin.listOrganizations.useQuery();

	if (isPending) {
		return <Skeleton className="min-h-32 w-full" />;
	}

	if (!organizations || error) {
		return <p>Error fetching orgs</p>;
	}

	if (organizations.length === 0) {
		return (
			<Box>
				<BoxItem className="min-h-24">
					<BoxItemContent className="flex w-full flex-col items-center justify-center text-center">
						<BoxItemTitle>Noch keine Organisationen hinterlegt</BoxItemTitle>
						<BoxItemDescription>
							Hinterlege eine neue Organisation um Mitglieder zu verwalten
						</BoxItemDescription>
					</BoxItemContent>
				</BoxItem>
			</Box>
		);
	}

	return (
		<Box>
			{organizations.map((org) => (
				<BoxItem key={org.id} variant="clickable">
					<BoxItemIcon size="sm">
						<span className="flex size-3 items-center justify-center font-medium text-white text-xs">
							{org.name.charAt(0)?.toUpperCase() ?? "X"}
						</span>
					</BoxItemIcon>
					<BoxItemContent>
						<BoxItemTitle>{org.name}</BoxItemTitle>
					</BoxItemContent>
					<BoxItemLink href={ROUTES.SETTINGS_ADMIN_ORG_DETAILS(org.id)}>
						<ChevronRightIcon className="size-4" />
					</BoxItemLink>
				</BoxItem>
			))}
		</Box>
	);
}

const createOrgFormSchema = z.object({
	name: z.string().min(1),
	microsoftTenantId: z.uuid(),
});

function CreateOrganization() {
	const [isDialogOpen, setIsDialogOpen] = useState(false);

	const utils = api.useUtils();

	const createOrg = api.platformAdmin.createOrganization.useMutation({
		onSuccess: async () => {
			toast.success("Organisation erfolgreich erstellt.");
			setIsDialogOpen(false);
			await utils.platformAdmin.listOrganizations.invalidate();
		},
		onError: (error) => {
			toast.error(error.message);
		},
	});

	const form = useForm({
		defaultValues: {
			name: "",
			microsoftTenantId: "",
		},
		validators: {
			onSubmit: createOrgFormSchema,
		},
		onSubmit: ({ value }) => createOrg.mutate(value),
	});
	return (
		<Dialog onOpenChange={setIsDialogOpen} open={isDialogOpen}>
			<DialogTrigger
				render={
					<Button size={"sm"} variant={"outline"}>
						<PlusIcon />
						Organisation erstellen
					</Button>
				}
			/>

			<DialogContent>
				<DialogHeader>
					<DialogTitle>Neue Organisation erstellen</DialogTitle>
				</DialogHeader>
				<form
					id="create-org-form"
					onSubmit={(e) => {
						e.preventDefault();
						form.handleSubmit();
					}}
				>
					<FieldGroup>
						<form.Field name="name">
							{({ state, ...field }) => {
								const isInvalid = state.meta.isTouched && !state.meta.isValid;

								return (
									<Field data-invalid={isInvalid}>
										<FieldLabel>Name</FieldLabel>
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
									</Field>
								);
							}}
						</form.Field>
						<form.Field name="microsoftTenantId">
							{({ state, ...field }) => {
								const isInvalid = state.meta.isTouched && !state.meta.isValid;

								return (
									<Field data-invalid={isInvalid}>
										<FieldLabel>Microsoft Tenant ID</FieldLabel>
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
										<FieldDescription>
											Die Tenant-ID aus dem Microsoft Entra ID (Azure Active Directory).
											Alle Benutzer aus diesem Tenant werden dieser Organisation
											automatisch zugeordnet.
										</FieldDescription>
									</Field>
								);
							}}
						</form.Field>
					</FieldGroup>

					<DialogFooter className="mt-6">
						<Button
							onClick={() => {
								form.reset();
								setIsDialogOpen(false);
							}}
							variant="outline"
						>
							Abbrechen
						</Button>
						<Button
							disabled={createOrg.isPending}
							form="create-org-form"
							type="submit"
						>
							{createOrg.isPending ? "Wird erstellt…" : "Erstellen"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}

export { AdminSettingsOrgs };
