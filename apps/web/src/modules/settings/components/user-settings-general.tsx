"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
	Box,
	BoxItem,
	BoxItemContent,
	BoxItemDescription,
	BoxItemTitle,
} from "@/components/box";
import { Input } from "@/components/ui/input";
import { api } from "@/trpc/react";
import { SettingsSubtitle, SettingsTitle } from "./settings-typography";

function useDebounce<T>(value: T, delay: number): T {
	const [debounced, setDebounced] = useState(value);
	useEffect(() => {
		const timer = setTimeout(() => setDebounced(value), delay);
		return () => clearTimeout(timer);
	}, [value, delay]);
	return debounced;
}

function UserSettingsGeneral() {
	return (
		<main>
			<div className="space-y-1">
				<SettingsTitle>Allgemeines</SettingsTitle>
				<SettingsSubtitle>
					Verwalte deine persönlichen Informationen
				</SettingsSubtitle>
			</div>
			<div className="mt-12">
				<div className="mb-3">
					<p className="font-medium text-xs text-zinc-600">Profil</p>
				</div>
				<ProfileForm />
			</div>
		</main>
	);
}

function ProfileForm() {
	const utils = api.useUtils();
	const [user] = api.user.getOwn.useSuspenseQuery();
	const [nameInput, setNameInput] = useState(user.name);
	const debouncedName = useDebounce(nameInput, 600);
	const isInitialMount = useRef(true);

	const updateName = api.user.updateOwnName.useMutation({
		onSuccess: () => {
			toast.success("Name gespeichert");
			void utils.user.getOwn.invalidate();
		},
		onError: (error) => {
			toast.error("Fehler beim Speichern", {
				description: error.message ?? "Ein unerwarteter Fehler ist aufgetreten",
			});
		},
	});

	useEffect(() => {
		if (isInitialMount.current) {
			isInitialMount.current = false;
			return;
		}
		const trimmed = debouncedName.trim();
		if (trimmed && trimmed !== user.name) {
			updateName.mutate({ name: trimmed });
		}
	}, [debouncedName, user.name, updateName.mutate]);

	return (
		<Box>
			<BoxItem variant="grid">
				<BoxItemContent>
					<BoxItemTitle>Name</BoxItemTitle>
					<BoxItemDescription>
						Dein vollständiger Name, wie er in der Anwendung angezeigt wird.
					</BoxItemDescription>
				</BoxItemContent>
				<Input
					aria-label="Name"
					disabled={updateName.isPending}
					onChange={(e) => setNameInput(e.target.value)}
					value={nameInput}
				/>
			</BoxItem>
			<BoxItem variant="grid">
				<BoxItemContent>
					<BoxItemTitle>E-Mail</BoxItemTitle>
					<BoxItemDescription>
						Deine E-Mail-Adresse wird über Microsoft verwaltet und kann hier nicht
						geändert werden.
					</BoxItemDescription>
				</BoxItemContent>
				<Input aria-label="E-Mail" disabled readOnly value={user.email} />
			</BoxItem>
		</Box>
	);
}

export { UserSettingsGeneral };
