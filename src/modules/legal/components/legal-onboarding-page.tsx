"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
	Field,
	FieldDescription,
	FieldError,
	FieldGroup,
	FieldLabel,
	FieldTitle,
} from "@/components/ui/field";
import type { LegalReleaseDefinition } from "@/server/legal/current-release";
import { api } from "@/trpc/react";

interface LegalOnboardingPageProps {
	postAcceptancePath: string;
	release: LegalReleaseDefinition;
}

function LegalOnboardingPage({
	postAcceptancePath,
	release,
}: LegalOnboardingPageProps) {
	const [hasAcceptedAllDocuments, setHasAcceptedAllDocuments] = useState(false);
	const [showAcceptanceError, setShowAcceptanceError] = useState(false);
	const utils = api.useUtils();

	const acceptCurrentRelease = api.legal.acceptCurrentRelease.useMutation({
		onSuccess: async () => {
			await utils.legal.getCurrentRelease.invalidate();
			window.location.assign(postAcceptancePath);
		},
		onError: (error) => {
			toast.error("Die Zustimmung konnte nicht gespeichert werden", {
				description: error.message ?? "Ein unerwarteter Fehler ist aufgetreten.",
			});
		},
	});

	const handleSubmit = () => {
		if (!hasAcceptedAllDocuments) {
			setShowAcceptanceError(true);
			return;
		}

		setShowAcceptanceError(false);
		acceptCurrentRelease.mutate({
			releaseVersion: release.version,
		});
	};

	return (
		<main className="bg-stone-50">
			<div className="mx-auto w-full max-w-5xl px-6 py-10 md:px-8">
				<div className="rounded-[2rem] border border-zinc-200 bg-white shadow-sm">
					<div className="border-zinc-200 border-b px-8 py-8 md:px-12">
						<p className="font-medium text-blue-600 text-sm">
							Rechtliche Zustimmung erforderlich
						</p>
						<h1 className="mt-3 font-semibold text-3xl text-zinc-900">
							Bitte akzeptiere die aktuellen Nutzungsbedingungen
						</h1>
						<p className="mt-3 max-w-3xl text-pretty text-zinc-600">
							Bevor du Zemio verwenden kannst, musst du die aktuelle Version aller
							rechtlich relevanten Dokumente lesen und akzeptieren.
						</p>
						<div className="mt-4 flex flex-wrap gap-3 text-sm text-zinc-500">
							<span>Release {release.version}</span>
							<span>Veröffentlicht am {release.publishedAt}</span>
							<span>{release.documents.length} Dokumente erforderlich</span>
						</div>
					</div>
					<div className="px-8 py-8 md:px-12">
						<div className="grid gap-6">
							{release.documents.map((document) => (
								<section
									className="rounded-2xl border border-zinc-200 bg-zinc-50/70 p-6"
									key={document.key}
								>
									<div className="flex flex-wrap items-center justify-between gap-3">
										<div>
											<h2 className="font-semibold text-xl text-zinc-900">
												{document.title}
											</h2>
											<p className="mt-1 text-sm text-zinc-500">
												Version {document.version}
											</p>
										</div>
										<p className="max-w-xl text-sm text-zinc-600">{document.summary}</p>
									</div>
									<div className="mt-5 space-y-4 text-sm text-zinc-700 leading-6">
										{document.content.map((paragraph) => (
											<p key={paragraph}>{paragraph}</p>
										))}
									</div>
								</section>
							))}
						</div>

						<div className="mt-8 rounded-2xl border border-zinc-200 bg-white p-6">
							<FieldGroup>
								<Field data-invalid={showAcceptanceError} orientation="horizontal">
									<FieldLabel htmlFor="accept-legal-release">
										<FieldTitle>
											Ich habe alle Dokumente gelesen und akzeptiere sie.
										</FieldTitle>
										<FieldDescription>
											Deine Zustimmung wird mit Zeitstempel, Release-Version und
											Akzeptanztyp revisionssicher gespeichert.
										</FieldDescription>
									</FieldLabel>
									<Checkbox
										checked={hasAcceptedAllDocuments}
										id="accept-legal-release"
										onCheckedChange={(checked) => {
											const nextValue = checked === true;
											setHasAcceptedAllDocuments(nextValue);
											if (nextValue) {
												setShowAcceptanceError(false);
											}
										}}
									/>
								</Field>
								{showAcceptanceError ? (
									<FieldError
										errors={[
											{
												message:
													"Bitte bestätige zuerst, dass du alle Dokumente akzeptierst.",
											},
										]}
									/>
								) : null}
								<div className="flex justify-end">
									<Button
										disabled={acceptCurrentRelease.isPending}
										onClick={handleSubmit}
										type="button"
									>
										Akzeptieren und fortfahren
									</Button>
								</div>
							</FieldGroup>
						</div>
					</div>
				</div>
			</div>
		</main>
	);
}

export { LegalOnboardingPage };
