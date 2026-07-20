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

function useDebounce<T>(value: T, delay: number): T {
	const [debounced, setDebounced] = useState(value);
	useEffect(() => {
		const timer = setTimeout(() => setDebounced(value), delay);
		return () => clearTimeout(timer);
	}, [value, delay]);
	return debounced;
}

function OrgSettingsGeneral() {
	const t = useTranslations("modules.settings.generalLegacy");

	return (
		<main>
			<div className="space-y-1">
				<h1 className="font-semibold text-lg text-zinc-800">{t("title")}</h1>
				<p className="text-sm text-zinc-600">{t("description")}</p>
			</div>

			<div className="mt-12">
				<div className="mb-3 flex flex-wrap items-end justify-between gap-4">
					<p className="font-medium text-xs text-zinc-600">
						{t("sections.general")}
					</p>
				</div>
				<GeneralForm />
			</div>

			<div className="mt-12">
				<div className="mb-3 flex flex-wrap items-end justify-between gap-4">
					<p className="font-medium text-xs text-zinc-600">
						{t("sections.reviewer")}
					</p>
				</div>
				<ReviewerEMail />
			</div>
		</main>
	);
}

function GeneralForm() {
	const t = useTranslations("modules.settings.generalLegacy");
	const utils = api.useUtils();
	const [org] = api.settings.getOrg.useSuspenseQuery();
	const [nameInput, setNameInput] = useState(org.name);
	const debouncedName = useDebounce(nameInput, 600);
	const isInitialMount = useRef(true);

	const updateOrgName = api.settings.updateOrgName.useMutation({
		onSuccess: () => {
			toast.success(t("orgName.savedToast"));
			void utils.settings.getOrg.invalidate();
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
		if (trimmed && trimmed !== org.name) {
			updateOrgName.mutate({ name: trimmed });
		}
	}, [debouncedName, org.name, updateOrgName.mutate]); // eslint-disable-line react-hooks/exhaustive-deps

	return (
		<Box>
			<BoxItem variant="grid">
				<BoxItemContent>
					<BoxItemTitle>{t("orgName.label")}</BoxItemTitle>
					<BoxItemDescription>{t("orgName.description")}</BoxItemDescription>
				</BoxItemContent>
				<div className="flex w-full flex-col gap-2">
					<Input
						aria-label={t("orgName.ariaLabel")}
						disabled={updateOrgName.isPending}
						onChange={(e) => setNameInput(e.target.value)}
						value={nameInput}
					/>
				</div>
			</BoxItem>
			<BoxItem variant="grid">
				<BoxItemContent>
					<BoxItemTitle>{t("slug.label")}</BoxItemTitle>
					<BoxItemDescription>{t("slug.description")}</BoxItemDescription>
				</BoxItemContent>
				<Input disabled value={`/${org.slug}`} />
			</BoxItem>
			<BoxItem variant="grid">
				<BoxItemContent>
					<BoxItemTitle>{t("tenantId.label")}</BoxItemTitle>
					<BoxItemDescription>{t("tenantId.description")}</BoxItemDescription>
				</BoxItemContent>
				<Input disabled value={`${org.microsoftTenantId}`} />
			</BoxItem>
		</Box>
	);
}

function ReviewerEMail() {
	const t = useTranslations("modules.settings.generalLegacy");
	const utils = api.useUtils();
	const [settings] = api.settings.get.useSuspenseQuery();
	const [emailInput, setEmailInput] = useState(settings.reviewerEmail ?? "");
	const debouncedEmail = useDebounce(emailInput, 600);
	const isInitialMount = useRef(true);

	const updateReviewerEmail = api.settings.update.useMutation({
		onSuccess: () => {
			toast.success(t("reviewerEmail.savedToast"));
			void utils.settings.get.invalidate();
		},
		onError: (error) => {
			toast.error(t("saveErrorTitle"), {
				description: error.message ?? t("saveErrorFallback"),
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
					<BoxItemTitle>{t("reviewerEmail.label")}</BoxItemTitle>
					<BoxItemDescription>{t("reviewerEmail.description")}</BoxItemDescription>
				</BoxItemContent>
				<div className="flex w-full flex-col gap-1">
					<Input
						aria-label={t("reviewerEmail.ariaLabel")}
						disabled={updateReviewerEmail.isPending}
						inputMode="email"
						onChange={(e) => setEmailInput(e.target.value)}
						placeholder={t("reviewerEmail.placeholder")}
						value={emailInput}
					/>
					{showError && (
						<p className="text-red-500 text-xs">{t("reviewerEmail.invalid")}</p>
					)}
				</div>
			</BoxItem>
		</Box>
	);
}

export { OrgSettingsGeneral };
