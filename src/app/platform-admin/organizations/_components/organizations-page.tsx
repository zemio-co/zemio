"use client";

import { BuildingIcon, PlusIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { api } from "@/trpc/react";

interface Organization {
	id: string;
	name: string;
	slug: string;
	microsoftTenantId: string | null;
	createdAt: Date;
	_count: { members: number };
}

interface OrganizationsPageContentProps {
	organizations: Organization[];
}

export function OrganizationsPageContent({
	organizations: initialOrgs,
}: OrganizationsPageContentProps) {
	const [isDialogOpen, setIsDialogOpen] = useState(false);
	const [name, setName] = useState("");
	const [tenantId, setTenantId] = useState("");

	const utils = api.useUtils();
	const { data: organizations = initialOrgs } =
		api.platformAdmin.listOrganizations.useQuery(undefined, {
			initialData: initialOrgs,
		});

	const createOrg = api.platformAdmin.createOrganization.useMutation({
		onSuccess: async () => {
			toast.success("Organisation erfolgreich erstellt.");
			setIsDialogOpen(false);
			setName("");
			setTenantId("");
			await utils.platformAdmin.listOrganizations.invalidate();
		},
		onError: (error) => {
			toast.error(error.message);
		},
	});

	function handleCreate() {
		if (!name.trim() || !tenantId.trim()) return;
		createOrg.mutate({ name: name.trim(), microsoftTenantId: tenantId.trim() });
	}

	return (
		<div className="min-h-screen bg-background">
			<div className="mx-auto max-w-5xl px-6 py-10">
				<div className="mb-8 flex items-center justify-between">
					<div>
						<h1 className="font-semibold text-2xl tracking-tight">Organisationen</h1>
						<p className="mt-1 text-muted-foreground text-sm">
							Verwalten Sie Organisationen und deren Microsoft-Tenant-Zuordnung.
						</p>
					</div>

					<Dialog onOpenChange={setIsDialogOpen} open={isDialogOpen}>
						<DialogTrigger render={<Button />}>
							<PlusIcon />
							Organisation erstellen
						</DialogTrigger>

						<DialogContent>
							<DialogHeader>
								<DialogTitle>Neue Organisation erstellen</DialogTitle>
							</DialogHeader>

							<div className="flex flex-col gap-4">
								<div className="flex flex-col gap-1.5">
									<Label htmlFor="org-name">Name</Label>
									<Input
										id="org-name"
										onChange={(e) => setName(e.target.value)}
										placeholder="Meine Organisation"
										value={name}
									/>
								</div>

								<div className="flex flex-col gap-1.5">
									<Label htmlFor="tenant-id">Microsoft Tenant ID</Label>
									<Input
										id="tenant-id"
										onChange={(e) => setTenantId(e.target.value)}
										placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
										value={tenantId}
									/>
									<p className="text-muted-foreground text-xs">
										Die Tenant-ID aus dem Microsoft Entra ID (Azure Active Directory).
										Alle Benutzer aus diesem Tenant werden dieser Organisation automatisch
										zugeordnet.
									</p>
								</div>
							</div>

							<DialogFooter>
								<Button onClick={() => setIsDialogOpen(false)} variant="outline">
									Abbrechen
								</Button>
								<Button
									disabled={!name.trim() || !tenantId.trim() || createOrg.isPending}
									onClick={handleCreate}
								>
									{createOrg.isPending ? "Wird erstellt…" : "Erstellen"}
								</Button>
							</DialogFooter>
						</DialogContent>
					</Dialog>
				</div>

				{organizations.length === 0 ? (
					<div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
						<BuildingIcon className="mb-4 h-10 w-10 text-muted-foreground" />
						<p className="font-medium text-sm">Noch keine Organisationen</p>
						<p className="mt-1 text-muted-foreground text-sm">
							Erstellen Sie eine Organisation, um Benutzer automatisch zuzuordnen.
						</p>
					</div>
				) : (
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Name</TableHead>
								<TableHead>Microsoft Tenant ID</TableHead>
								<TableHead>Mitglieder</TableHead>
								<TableHead>Erstellt</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{organizations.map((org) => (
								<TableRow key={org.id}>
									<TableCell className="font-medium">{org.name}</TableCell>
									<TableCell>
										{org.microsoftTenantId ? (
											<code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
												{org.microsoftTenantId}
											</code>
										) : (
											<Badge className="text-muted-foreground" variant="outline">
												Nicht konfiguriert
											</Badge>
										)}
									</TableCell>
									<TableCell>{org._count.members}</TableCell>
									<TableCell className="text-muted-foreground">
										{org.createdAt.toLocaleDateString("de-DE")}
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				)}
			</div>
		</div>
	);
}
