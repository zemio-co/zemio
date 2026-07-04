import { createLoader, parseAsInteger, parseAsString } from "nuqs/server";
import { OrgSettingsMembers } from "@/modules/settings";
import { api, HydrateClient } from "@/trpc/server";

const loadSearchParams = createLoader({
	page: parseAsInteger,
	pageSize: parseAsInteger,
	search: parseAsString,
});

export default async function ServerPage(
	props: PageProps<"/settings/org/members">,
) {
	const searchParams = await props.searchParams;
	const params = loadSearchParams(searchParams);

	await Promise.all([
		api.settings.listMembers.prefetch({
			page: params.page ?? 1,
			pageSize: params.pageSize ?? 20,
			search: params.search ?? "",
		}),
	]);

	return (
		<HydrateClient>
			<OrgSettingsMembers />
		</HydrateClient>
	);
}
