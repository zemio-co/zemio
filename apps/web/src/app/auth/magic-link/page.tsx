import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ROUTES } from "@/lib/routes";
import { AuthMagicLinkConfirm } from "@/modules/auth";
import { MAGIC_LINK_PARAMS } from "@/server/better-auth/magic-link-landing";

// The URL carries a sign-in token: never indexed, and never sent on as a
// referrer from this page.
export const metadata: Metadata = {
	robots: { index: false, follow: false },
	referrer: "no-referrer",
};

export default async function ServerPage(props: PageProps<"/auth/magic-link">) {
	const query = await props.searchParams;

	// Only the parameters Better Auth wrote, each taken once.
	const params = Object.fromEntries(
		MAGIC_LINK_PARAMS.flatMap((name) => {
			const value = query[name];
			return typeof value === "string" ? [[name, value]] : [];
		}),
	);

	// A link without a token signs nobody in; sign-in is where to start over.
	if (!params.token) redirect(ROUTES.AUTH());

	return <AuthMagicLinkConfirm params={params} />;
}
