import { notFound } from "next/navigation";
import { AdminOrgDetails } from "@/modules/admin";
import { api } from "@/trpc/server";

export default async function ServerPage({
	params,
}: PageProps<"/platform-admin/organizations/[id]">) {
	const { id } = await params;
	const organization = await api.platformAdmin.getOrganizationDetails({
		organizationId: id,
	});

	if (!organization) {
		notFound();
	}

	return <AdminOrgDetails initialOrganization={organization} />;
}
