import { AdminOrgsContent } from "@/modules/admin";
import { api } from "@/trpc/server";

export default async function PlatformAdminOrganizationsPage() {
	const organizations = await api.platformAdmin.listOrganizations();

	return <AdminOrgsContent organizations={organizations} />;
}
