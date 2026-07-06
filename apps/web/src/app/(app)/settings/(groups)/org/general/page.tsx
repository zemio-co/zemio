import { OrgSettingsGeneral } from "@/modules/settings/components";
import { api, HydrateClient } from "@/trpc/server";

export default async function ServerPage(
	_props: PageProps<"/settings/org/general">,
) {
	await Promise.all([
		api.settings.getOrg.prefetch(),
		api.settings.get.prefetch(),
	]);

	return (
		<HydrateClient>
			<OrgSettingsGeneral />
		</HydrateClient>
	);
}
