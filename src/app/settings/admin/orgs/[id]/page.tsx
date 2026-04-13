import { AdminOrgDetails } from "@/modules/settings/";
import { api, HydrateClient } from "@/trpc/server";

export default async function ServerPage(
	props: PageProps<"/platform-admin/organizations/[id]">,
) {
	const { id } = await props.params;

	await Promise.all([
		api.platformAdmin.getOrganizationDetails.prefetch({ organizationId: id }),
	]);

	return (
		<HydrateClient>
			<AdminOrgDetails organizationId={id} />
		</HydrateClient>
	);
}
