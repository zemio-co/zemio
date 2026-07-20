"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/consts";
import { authClient } from "@/server/better-auth/client";

export function AcceptInvitationPageContent({
	invitationId,
}: {
	invitationId: string;
}) {
	const t = useTranslations("modules.acceptInvitation");
	const router = useRouter();

	const handleAccept = async () => {
		const result = await authClient.organization.acceptInvitation({
			invitationId,
		});

		if (result.error) {
			toast.error(t("acceptError"), {
				description: result.error.message ?? t("unexpectedError"),
			});
			return;
		}

		router.push(ROUTES.USER_DASHBOARD);
		router.refresh();
	};

	return (
		<div className="container flex min-h-svh max-w-md items-center">
			<div className="w-full rounded-2xl border bg-card p-8 shadow-sm">
				<h1 className="font-semibold text-2xl">{t("title")}</h1>
				<p className="mt-2 text-muted-foreground text-sm">{t("description")}</p>
				<Button className="mt-8 w-full" onClick={handleAccept}>
					{t("acceptButton")}
				</Button>
			</div>
		</div>
	);
}
