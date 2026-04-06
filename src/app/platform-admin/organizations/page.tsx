import { api } from "@/trpc/server";
import { OrganizationsPageContent } from "./_components/organizations-page";

export default async function PlatformAdminOrganizationsPage() {
	const organizations = await api.platformAdmin.listOrganizations();

	return <OrganizationsPageContent organizations={organizations} />;
}
