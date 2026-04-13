import { createLoader, parseAsString } from "nuqs/server";
import { OrgSettingsCostUnits } from "@/modules/settings";
import { api, HydrateClient } from "@/trpc/server";

const loadSearchParams = createLoader({
	search: parseAsString,
});

export default async function ServerPage(
	props: PageProps<"/settings/org/cost-units">,
) {
	const searchParams = await props.searchParams;
	const params = loadSearchParams(searchParams);

	await api.costUnit.listCostUnits.prefetchInfinite({
		pageSize: 20,
		search: params.search ?? undefined,
	});

	return (
		<HydrateClient>
			<OrgSettingsCostUnits />
		</HydrateClient>
	);
}
