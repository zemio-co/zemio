"use client";

import { LogOutIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import React from "react";
import { toast } from "sonner";
import { ROUTES } from "@/lib/consts";
import { authClient } from "@/server/better-auth/client";
import { Button } from "./ui/button";

export function SignOut({ ...props }: React.ComponentProps<typeof Button>) {
	const [pending, setPending] = React.useState(false);

	const router = useRouter();

	const handleSignOut = () => {
		setPending(true);

		const res = authClient.signOut();

		toast.promise(res, {
			loading: "Du wirst abgemeldet",
			success: "Du wurdest erfolgreich abgemeldet",
			error: "Fehler beim Abmelden",
		});

		res.then(() => {
			router.push(ROUTES.AUTH);
			setPending(false);
		});
	};

	return (
		<Button
			disabled={pending}
			onClick={handleSignOut}
			variant={"outline"}
			{...props}
		>
			<LogOutIcon /> Abmelden
		</Button>
	);
}
