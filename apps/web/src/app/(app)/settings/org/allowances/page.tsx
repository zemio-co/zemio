import { OrgSettingsAllowances } from "@/modules/settings";
import { api, HydrateClient } from "@/trpc/server";

export default async function ServerPage() {
	void (await Promise.all([api.settings.get.prefetch()]));

	return (
		<HydrateClient>
			<OrgSettingsAllowances />
		</HydrateClient>
	);
}
