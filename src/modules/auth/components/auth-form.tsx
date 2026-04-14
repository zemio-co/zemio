"use client";

import { useForm } from "@tanstack/react-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/consts";
import { authClient } from "@/server/better-auth/client";

const formSchema = z.object({});

export function AuthForm({ ...props }: React.ComponentProps<"form">) {
	const signInWithMicrosoft = async () => {
		const res = await authClient.signIn.social({
			provider: "microsoft",
			callbackURL: ROUTES.ONBOARDING,
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
				Mit Microsoft fortfahren
			</Button>
		</form>
	);
}
