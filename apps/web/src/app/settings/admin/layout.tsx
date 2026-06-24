import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/server/better-auth";

export default async function ServerLayout(
	props: LayoutProps<"/settings/admin">,
) {
	const { children } = props;

	const requestHeaders = await headers();
	const session = await auth.api.getSession({
		headers: requestHeaders,
	});

	if (!session?.user) {
		redirect("/auth");
	}

	const hasPermission = await auth.api.userHasPermission({
		headers: requestHeaders,
		body: {
			userId: session.user.id,
			permissions: {
				app: ["update"],
			},
		},
	});

	if (!hasPermission.success) {
		redirect("/");
	}

	return children;
}
