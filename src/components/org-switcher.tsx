"use client";

import { Building2Icon } from "lucide-react";
import { toast } from "sonner";
import { authClient } from "@/server/better-auth/client";
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "./ui/select";

export function OrgSwitcher() {
	const organizations = authClient.useListOrganizations();
	const activeOrganization = authClient.useActiveOrganization();

	if (
		organizations.isPending ||
		!organizations.data ||
		organizations.data.length === 0
	) {
		return null;
	}

	const activeOrganizationId = activeOrganization.data?.id ?? "";

	const handleValueChange = (organizationId: string | null) => {
		if (!organizationId) {
			return;
		}

		void (async () => {
			const result = await authClient.organization.setActive({
				organizationId,
			});

			if (result.error) {
				toast.error("Organisation konnte nicht gewechselt werden", {
					description:
						result.error.message ?? "Ein unerwarteter Fehler ist aufgetreten",
				});
				return;
			}

			window.location.reload();
		})();
	};

	return (
		<div className="px-2 pt-2">
			<Select
				itemToStringLabel={(value) =>
					organizations.data?.find((org) => org.id === value)?.name ??
					"No Organization found"
				}
				onValueChange={handleValueChange}
				value={activeOrganizationId}
			>
				<SelectTrigger className="w-full justify-start">
					<Building2Icon className="size-4 text-muted-foreground" />
					<SelectValue placeholder="Organisation auswählen" />
				</SelectTrigger>
				<SelectContent>
					<SelectGroup>
						{organizations.data.map((organization) => (
							<SelectItem key={organization.id} value={organization.id}>
								{organization.name}
							</SelectItem>
						))}
					</SelectGroup>
				</SelectContent>
			</Select>
		</div>
	);
}
