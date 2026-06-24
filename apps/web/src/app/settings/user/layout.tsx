import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { ROUTES } from "@/lib/routes";
import { auth } from "@/server/better-auth";

export default async function ServerLayout({
	children,
}: {
	children: ReactNode;
}) {
	const requestHeaders = await headers();
	const session = await auth.api.getSession({
		headers: requestHeaders,
	});

	if (!session?.user) {
		redirect(ROUTES.AUTH());
	}

	return children;
}
