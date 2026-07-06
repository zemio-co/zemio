import { AdminSettingsOrgs } from "@/modules/settings/";
import { api, HydrateClient } from "@/trpc/server";

export default async function ServerPage() {
	await Promise.all([api.platformAdmin.listOrganizations.prefetch()]);

	return (
		<HydrateClient>
			<AdminSettingsOrgs />
		</HydrateClient>
	);
}
