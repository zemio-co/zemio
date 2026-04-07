"use client";

import { useForm } from "@tanstack/react-form";
import { ChevronRightIcon, PlusIcon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import z from "zod";
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
import { api } from "@/trpc/react";

interface Organization {
	id: string;
	name: string;
	slug: string;
	microsoftTenantId: string | null;
	createdAt: Date;
	_count: { members: number };
}

function AdminOrgsContent({
	organizations: initialOrgs,
}: {
	organizations: Organization[];
}) {
	const { data: organizations = initialOrgs } =
		api.platformAdmin.listOrganizations.useQuery(undefined, {
			initialData: initialOrgs,
		});

	return (
		<div>
			<div className="space-y-1">
				<h1 className="font-semibold text-lg text-zinc-800">Organisationen</h1>
				<p className="text-sm text-zinc-600">
					Verwalten Sie Organisationen und deren Microsoft-Tenant-Zuordnung.
				</p>
			</div>

			<div className="mt-12 rounded-lg bg-white shadow-xs ring-1 ring-zinc-700/10">
				<div className="flex items-center justify-between gap-6 p-5">
					<div>
						<p className="font-medium text-sm text-zinc-800">Neue Organisation</p>
						<p className="mt-0.5 text-stone-500 text-xs">
							Erstelle eine neue Organisation um zu kollaborieren
						</p>
					</div>
					<CreateOrganization />
				</div>
			</div>

			<div className="mt-12">
				<div className="flex flex-wrap items-end justify-between gap-4">
					<p className="font-medium text-xs text-zinc-600">Organisationen</p>
				</div>
				<div className="mt-3 rounded-lg bg-white shadow-xs ring-1 ring-zinc-700/10">
					{organizations.map((org) => (
						<div className="group/org-item relative isolate px-5" key={org.id}>
							<div className="flex items-center justify-start gap-4 border-zinc-200 border-b py-5 group-last/org-item:border-b-0">
								<div className="flex size-6 items-center justify-center rounded-md bg-zinc-800 font-medium text-white text-xs">
									{org.name.charAt(0).toUpperCase()}
								</div>

								<Link
									className="inset-0 font-medium text-sm text-stone-800"
									href={`/platform-admin/organizations/${org.id}`}
								>
									<span className="absolute inset-0 top-1 left-1 -z-10 h-[calc(100%-0.5rem)] w-[calc(100%-0.5rem)] rounded-md bg-zinc-100 opacity-0 transition-opacity group-hover/org-item:opacity-100" />

									{org.name}
								</Link>
								<ChevronRightIcon className="ml-auto size-4 text-zinc-500" />
							</div>
						</div>
					))}
				</div>
			</div>
		</div>
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

export { AdminOrgsContent };
