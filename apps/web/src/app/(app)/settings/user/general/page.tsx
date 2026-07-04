import { UserSettingsGeneral } from "@/modules/settings";
import { api, HydrateClient } from "@/trpc/server";

export default async function ServerPage() {
	await Promise.all([api.user.getOwn.prefetch()]);

	return (
		<HydrateClient>
			<UserSettingsGeneral />
		</HydrateClient>
	);
}
