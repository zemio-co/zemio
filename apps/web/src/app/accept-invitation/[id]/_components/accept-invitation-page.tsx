"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/consts";
import { authClient } from "@/server/better-auth/client";

export function AcceptInvitationPageContent({
	invitationId,
}: {
	invitationId: string;
}) {
	const router = useRouter();

	const handleAccept = async () => {
		const result = await authClient.organization.acceptInvitation({
			invitationId,
		});

		if (result.error) {
			toast.error("Einladung konnte nicht angenommen werden", {
				description:
					result.error.message ?? "Ein unerwarteter Fehler ist aufgetreten",
			});
			return;
		}

		router.push(ROUTES.USER_DASHBOARD);
		router.refresh();
	};

	return (
		<div className="container flex min-h-svh max-w-md items-center">
			<div className="w-full rounded-2xl border bg-card p-8 shadow-sm">
				<h1 className="font-semibold text-2xl">Einladung annehmen</h1>
				<p className="mt-2 text-muted-foreground text-sm">
					Du wurdest zu einer Organisation eingeladen. Bestätige den Beitritt, um
					fortzufahren.
				</p>
				<Button className="mt-8 w-full" onClick={handleAccept}>
					Einladung annehmen
				</Button>
			</div>
		</div>
	);
}
