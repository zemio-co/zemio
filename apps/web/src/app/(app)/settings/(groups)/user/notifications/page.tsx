import { UserSettingsNotifications } from "@/modules/settings";
import { api, HydrateClient } from "@/trpc/server";

export default async function ServerPage() {
	await Promise.all([api.preferences.getOwn.prefetch()]);

	return (
		<HydrateClient>
			<UserSettingsNotifications />
		</HydrateClient>
	);
}
