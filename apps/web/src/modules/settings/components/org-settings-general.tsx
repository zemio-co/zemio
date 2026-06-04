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

function useDebounce<T>(value: T, delay: number): T {
	const [debounced, setDebounced] = useState(value);
	useEffect(() => {
		const timer = setTimeout(() => setDebounced(value), delay);
		return () => clearTimeout(timer);
	}, [value, delay]);
	return debounced;
}

function OrgSettingsGeneral() {
	return (
		<main>
			<div className="space-y-1">
				<h1 className="font-semibold text-lg text-zinc-800">Organisation</h1>
				<p className="text-sm text-zinc-600">
					Verwalte die Einstellungen zu deiner Organisation
				</p>
			</div>

			<div className="mt-12">
				<div className="mb-3 flex flex-wrap items-end justify-between gap-4">
					<p className="font-medium text-xs text-zinc-600">Allgemeines</p>
				</div>
				<GeneralForm />
			</div>

			<div className="mt-12">
				<div className="mb-3 flex flex-wrap items-end justify-between gap-4">
					<p className="font-medium text-xs text-zinc-600">Reviewer</p>
				</div>
				<ReviewerEMail />
			</div>
		</main>
	);
}

function GeneralForm() {
	const utils = api.useUtils();
	const [org] = api.settings.getOrg.useSuspenseQuery();
	const [nameInput, setNameInput] = useState(org.name);
	const debouncedName = useDebounce(nameInput, 600);
	const isInitialMount = useRef(true);

	const updateOrgName = api.settings.updateOrgName.useMutation({
		onSuccess: () => {
			toast.success("Organisationsname gespeichert");
			void utils.settings.getOrg.invalidate();
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
		if (trimmed && trimmed !== org.name) {
			updateOrgName.mutate({ name: trimmed });
		}
	}, [debouncedName, org.name, updateOrgName.mutate]); // eslint-disable-line react-hooks/exhaustive-deps

	return (
		<Box>
			<BoxItem variant="grid">
				<BoxItemContent>
					<BoxItemTitle>Organisationsname</BoxItemTitle>
					<BoxItemDescription>
						Der Name deiner Organisation, wie er in der Anwendung angezeigt wird.
					</BoxItemDescription>
				</BoxItemContent>
				<div className="flex w-full flex-col gap-2">
					<Input
						aria-label="Organisationsname"
						disabled={updateOrgName.isPending}
						onChange={(e) => setNameInput(e.target.value)}
						value={nameInput}
					/>
				</div>
			</BoxItem>
			<BoxItem variant="grid">
				<BoxItemContent>
					<BoxItemTitle>Slug</BoxItemTitle>
					<BoxItemDescription>
						Zur eindeutigen und nutzerfreundlichen Identifikation
					</BoxItemDescription>
				</BoxItemContent>
				<Input disabled value={`/${org.slug}`} />
			</BoxItem>
			<BoxItem variant="grid">
				<BoxItemContent>
					<BoxItemTitle>Microsoft Tenant ID</BoxItemTitle>
					<BoxItemDescription>
						Users whose Entra ID tenant matches this UUID can be assigned to this
						organization automatically.
					</BoxItemDescription>
				</BoxItemContent>
				<Input disabled value={`${org.microsoftTenantId}`} />
			</BoxItem>
		</Box>
	);
}

function ReviewerEMail() {
	const utils = api.useUtils();
	const [settings] = api.settings.get.useSuspenseQuery();
	const [emailInput, setEmailInput] = useState(settings.reviewerEmail ?? "");
	const debouncedEmail = useDebounce(emailInput, 600);
	const isInitialMount = useRef(true);

	const updateReviewerEmail = api.settings.update.useMutation({
		onSuccess: () => {
			toast.success("Reviewer E-Mail gespeichert");
			void utils.settings.get.invalidate();
		},
		onError: (error) => {
			toast.error("Fehler beim Speichern", {
				description: error.message ?? "Ein unerwarteter Fehler ist aufgetreten",
			});
		},
	});

	const currentEmail = settings.reviewerEmail ?? "";
	const isValidEmail =
		debouncedEmail === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(debouncedEmail);
	const showError = debouncedEmail !== "" && !isValidEmail;

	useEffect(() => {
		if (isInitialMount.current) {
			isInitialMount.current = false;
			return;
		}
		if (!isValidEmail) return;
		const next = debouncedEmail === "" ? null : debouncedEmail;
		const current = currentEmail === "" ? null : currentEmail;
		if (next !== current) {
			updateReviewerEmail.mutate({ reviewerEmail: next });
		}
	}, [debouncedEmail, currentEmail, isValidEmail, updateReviewerEmail.mutate]); // eslint-disable-line react-hooks/exhaustive-deps

	return (
		<Box>
			<BoxItem variant="grid">
				<BoxItemContent>
					<BoxItemTitle>Reviewer E-Mail</BoxItemTitle>
					<BoxItemDescription>
						Spesenanträge werden nach der Einreichung an diese E-Mail-Adresse
						weitergeleitet.
					</BoxItemDescription>
				</BoxItemContent>
				<div className="flex w-full flex-col gap-1">
					<Input
						aria-label="Reviewer E-Mail"
						disabled={updateReviewerEmail.isPending}
						inputMode="email"
						onChange={(e) => setEmailInput(e.target.value)}
						placeholder="reviewer@example.com"
						value={emailInput}
					/>
					{showError && (
						<p className="text-red-500 text-xs">Ungültige E-Mail-Adresse</p>
					)}
				</div>
			</BoxItem>
		</Box>
	);
}

export { OrgSettingsGeneral };
