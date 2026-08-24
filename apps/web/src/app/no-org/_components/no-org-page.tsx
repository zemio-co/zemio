"use client";

import {
	ArrowRightIcon,
	BuildingIcon,
	LogOutIcon,
	MailIcon,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import ZemioLogo from "public/assets/zemio-logo-dark.svg";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ROUTES as ROUTES_DEPR } from "@/lib/consts";
import { selfServeRefusalOf } from "@/lib/organization";
import { ROUTES } from "@/lib/routes";
import { authClient } from "@/server/better-auth/client";
import { api } from "@/trpc/react";

interface NoOrgPageContentProps {
	userEmail: string;
	emailVerified: boolean;
	isPlatformAdmin: boolean;
	invitations: { id: string; organizationName: string }[];
}

export function NoOrgPageContent({
	userEmail,
	emailVerified,
	isPlatformAdmin,
	invitations,
}: NoOrgPageContentProps) {
	const t = useTranslations("modules.noOrg");
	const router = useRouter();
	const [name, setName] = useState("");
	const [sendingVerification, setSendingVerification] = useState(false);

	const createOrg = api.organization.createSelfServe.useMutation({
		onSuccess: () => {
			// A full reload rather than a push: the active organization is
			// decided when the session is read, and the app shell was rendered
			// for somebody who belonged to nothing.
			window.location.assign(ROUTES.USER_DASHBOARD());
		},
		onError: (error) => {
			// The procedure answers with a marker rather than a sentence so the
			// interface can say which of the two rules was hit.
			const description = selfServeRefusalOf(error)
				? t("needsVerification", { email: userEmail })
				: error.message;

			toast.error(t("createFailed"), { description });
		},
	});

	async function handleSendVerification() {
		setSendingVerification(true);

		// Reset in `finally`: a rejected request — offline, a 500 — would
		// otherwise leave the one button that unblocks this person disabled
		// until they reload the page.
		try {
			const result = await authClient.sendVerificationEmail({
				email: userEmail,
				callbackURL: ROUTES_DEPR.NO_ORG,
			});

			if (result.error) {
				toast.error(t("verificationFailed"), {
					description: result.error.message,
				});
				return;
			}

			toast.success(t("verificationSent", { email: userEmail }));
		} catch (error) {
			toast.error(t("verificationFailed"), {
				description: error instanceof Error ? error.message : undefined,
			});
		} finally {
			setSendingVerification(false);
		}
	}

	async function handleSignOut() {
		await authClient.signOut();
		router.push(ROUTES_DEPR.AUTH);
	}

	return (
		<main className="bg-stone-50">
			<div className="mx-auto w-full max-w-5xl md:px-8">
				<div className="flex min-h-svh flex-col gap-8 border-zinc-200 border-x px-6 py-12 md:px-12">
					<div className="flex shrink-0 flex-wrap items-center justify-between gap-4">
						<Image alt="Zemio Logo" className="h-5 w-fit" src={ZemioLogo} />
						{isPlatformAdmin && (
							<Link
								className={
									"flex items-center justify-center gap-1.5 font-medium text-blue-600 text-sm"
								}
								href={ROUTES.SETTINGS_ADMIN_ORGS()}
							>
								{t("manageOrgs")}
								<ArrowRightIcon className="size-3.5" />
							</Link>
						)}
					</div>
					<div className="flex grow flex-col items-center justify-center">
						<div className="w-full max-w-md rounded-lg bg-white p-8 shadow-lg ring-1 ring-zinc-700/10 ring-offset-0">
							<div className="mb-8 w-fit rounded-md bg-zinc-50 p-2 shadow-sm ring-1 ring-zinc-700/10">
								<BuildingIcon className="size-5 text-zinc-600" />
							</div>
							<h1 className="font-semibold text-lg text-zinc-800">{t("title")}</h1>
							<p className="mt-1.5 max-w-prose text-sm text-zinc-500">
								{t("subtitle", { email: userEmail })}
							</p>

							{invitations.length > 0 && (
								<div className="mt-8">
									<h2 className="font-medium text-sm text-zinc-800">
										{t("invitationsTitle")}
									</h2>
									<p className="mt-1 text-sm text-zinc-500">{t("invitationsHint")}</p>
									<ul className="mt-3 flex flex-col gap-2">
										{invitations.map((invitation) => (
											<li key={invitation.id}>
												<Link
													className="flex items-center justify-between gap-2 rounded-md border border-zinc-200 px-3 py-2 text-sm hover:bg-zinc-50"
													href={ROUTES_DEPR.ACCEPT_INVITATION(invitation.id)}
												>
													<span className="flex items-center gap-2 truncate">
														<MailIcon className="size-4 shrink-0 text-zinc-500" />
														<span className="truncate">{invitation.organizationName}</span>
													</span>
													<span className="shrink-0 font-medium text-blue-600">
														{t("openInvitation")}
													</span>
												</Link>
											</li>
										))}
									</ul>
								</div>
							)}

							<div className="mt-8 border-zinc-200 border-t pt-8">
								<h2 className="font-medium text-sm text-zinc-800">
									{t("createTitle")}
								</h2>
								<p className="mt-1 text-sm text-zinc-500">{t("createHint")}</p>

								{emailVerified ? (
									<form
										className="mt-3 flex flex-col gap-3"
										onSubmit={(event) => {
											event.preventDefault();
											createOrg.mutate({ name: name.trim() });
										}}
									>
										<Input
											aria-label={t("nameLabel")}
											maxLength={100}
											onChange={(event) => setName(event.target.value)}
											placeholder={t("namePlaceholder")}
											value={name}
										/>
										<Button
											disabled={name.trim() === "" || createOrg.isPending}
											type="submit"
										>
											{t("createButton")}
										</Button>
									</form>
								) : (
									<div className="mt-3 rounded-md bg-amber-50 px-3 py-2">
										<p className="text-amber-900 text-sm">
											{t("needsVerification", { email: userEmail })}
										</p>
										{/* The ask appears where it matters, with the action that
										    answers it — a gate with no way through is just a wall
										    (ADR-0008). */}
										<Button
											className="mt-2"
											disabled={sendingVerification}
											onClick={handleSendVerification}
											size="sm"
											variant="outline"
										>
											{t("sendVerification")}
										</Button>
									</div>
								)}
							</div>

							<Button
								className={"mt-8 w-full"}
								onClick={handleSignOut}
								variant={"outline"}
							>
								<LogOutIcon />
								{t("signOut")}
							</Button>
						</div>
					</div>
				</div>
			</div>
		</main>
	);
}
