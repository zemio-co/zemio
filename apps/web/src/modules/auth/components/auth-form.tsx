"use client";

import { useForm } from "@tanstack/react-form";
import Image from "next/image";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/routes";
import { authClient } from "@/server/better-auth/client";
import MicrosoftLogo from "../../../../public/assets/microsoft-logo.svg";

const formSchema = z.object({});

export function AuthForm({ ...props }: React.ComponentProps<"form">) {
	const signInWithMicrosoft = async () => {
		const res = await authClient.signIn.social({
			provider: "microsoft",
			callbackURL: ROUTES.USER_DASHBOARD(),
		});

		if (res.error) {
			toast.error(res.error.message ?? "Ein Fehler ist aufgetreten");
			return;
		}

		toast.success("Anmeldung erfolgreich", {
			description: "Du wirst in Kürze weitergeleitet",
		});
	};

	const form = useForm({
		defaultValues: {},
		validators: {
			onSubmit: formSchema,
		},
		onSubmit: async () => {
			await signInWithMicrosoft();
		},
	});

	return (
		<form
			id="auth-form"
			onSubmit={(e) => {
				e.preventDefault();
				form.handleSubmit();
			}}
			{...props}
		>
			<Button
				className={"w-full"}
				form="auth-form"
				size={"lg"}
				type="submit"
				variant={"outline"}
			>
				<Image alt="Microsoft Logo" className="mr-1 size-3.5" src={MicrosoftLogo} />
				Mit Microsoft fortfahren
			</Button>
		</form>
	);
}
