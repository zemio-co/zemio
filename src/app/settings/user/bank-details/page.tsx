import { UserSettingsBankDetails } from "@/modules/settings";
import { api, HydrateClient } from "@/trpc/server";

export default async function ServerPage() {
	await Promise.all([api.bankingDetails.list.prefetch()]);

	return (
		<HydrateClient>
			<UserSettingsBankDetails />
		</HydrateClient>
	);
}
