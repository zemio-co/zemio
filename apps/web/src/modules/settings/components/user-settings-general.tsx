"use client";

import { useTranslations } from "next-intl";
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
	const t = useTranslations("modules.settings.preferences.general");

	return (
		<main>
			<div className="space-y-1">
				<SettingsTitle>{t("title")}</SettingsTitle>
				<SettingsSubtitle>{t("description")}</SettingsSubtitle>
			</div>
			<div className="mt-12">
				<div className="mb-3">
					<p className="font-medium text-xs text-zinc-600">{t("sectionProfile")}</p>
				</div>
				<ProfileForm />
			</div>
		</main>
	);
}

function ProfileForm() {
	const t = useTranslations("modules.settings.preferences.general");
	const utils = api.useUtils();
	const [user] = api.user.getOwn.useSuspenseQuery();
	const [nameInput, setNameInput] = useState(user.name);
	const debouncedName = useDebounce(nameInput, 600);
	const isInitialMount = useRef(true);

	const updateName = api.user.updateOwnName.useMutation({
		onSuccess: () => {
			toast.success(t("savedToast"));
			void utils.user.getOwn.invalidate();
		},
		onError: (error) => {
			toast.error(t("saveErrorTitle"), {
				description: error.message ?? t("saveErrorFallback"),
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
					<BoxItemTitle>{t("nameLabel")}</BoxItemTitle>
					<BoxItemDescription>{t("nameDescription")}</BoxItemDescription>
				</BoxItemContent>
				<Input
					aria-label={t("nameAriaLabel")}
					disabled={updateName.isPending}
					onChange={(e) => setNameInput(e.target.value)}
					value={nameInput}
				/>
			</BoxItem>
			<BoxItem variant="grid">
				<BoxItemContent>
					<BoxItemTitle>{t("emailLabel")}</BoxItemTitle>
					<BoxItemDescription>{t("emailDescription")}</BoxItemDescription>
				</BoxItemContent>
				<Input
					aria-label={t("emailAriaLabel")}
					disabled
					readOnly
					value={user.email}
				/>
			</BoxItem>
		</Box>
	);
}

export { UserSettingsGeneral };
