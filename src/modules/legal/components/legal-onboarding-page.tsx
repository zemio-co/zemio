"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import {
	Field,
	FieldContent,
	FieldError,
	FieldLabel,
} from "@/components/ui/field";
import type { LegalReleaseDefinition } from "@/server/legal";
import { api } from "@/trpc/react";

interface LegalOnboardingPageProps {
	postAcceptancePath: string;
	release: LegalReleaseDefinition;
}

import { useForm } from "@tanstack/react-form";
import { ArrowRightIcon, ScaleIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ZemioLogo from "public/assets/zemio-logo-dark.svg";
import z from "zod";
import { Button } from "@/components/ui/button";

const formSchema = z.object({
	legalAccepted: z.boolean(),
});

function LegalOnboardingPage({
	postAcceptancePath,
	release,
}: LegalOnboardingPageProps) {
	const router = useRouter();

	const acceptCurrentRelease = api.legal.acceptCurrentRelease.useMutation({
		onSuccess: () => {
			router.push(postAcceptancePath);
		},
		onError: (error) => {
			toast.error("Die Zustimmung konnte nicht gespeichert werden", {
				description: error.message ?? "Ein unerwarteter Fehler ist aufgetreten.",
			});
		},
	});

	const form = useForm({
		defaultValues: {
			legalAccepted: false,
		},
		validators: {
			onSubmit: formSchema,
		},
		onSubmit: () => {
			acceptCurrentRelease.mutate({
				releaseVersion: release.version,
			});
		},
	});

	return (
		<>
			<main className="bg-stone-50">
				<div className="mx-auto w-full max-w-5xl md:px-8">
					<div className="flex min-h-svh flex-col gap-8 border-zinc-200 border-x px-6 py-12 md:px-12">
						<div className="flex shrink-0 flex-wrap items-center justify-between gap-4">
							<Image alt="Zemio Logo" className="h-5 w-fit" src={ZemioLogo} />
						</div>
						<div className="flex grow flex-col items-center justify-center">
							<div className="w-full max-w-md rounded-lg bg-white p-8 shadow-lg ring-1 ring-zinc-700/10 ring-offset-0">
								<div className="mb-8 w-fit rounded-md bg-blue-50 p-2 shadow-blue-500/10 shadow-lg ring-1 ring-blue-700/30">
									<ScaleIcon className="size-5 text-blue-500" />
								</div>
								<h1 className="font-semibold text-lg text-zinc-800">
									Rechtliche Zustimmung erforderlich
								</h1>
								<p className="mt-1.5 max-w-prose text-sm text-zinc-500">
									Bevor du Zemio verwenden kannst, benötigen wir deine Zustimmung zu
									unseren rechtlichen Bestimmungen.
								</p>

								<form
									className="mt-8"
									id="accept-legal"
									onSubmit={(e) => {
										e.preventDefault();
										form.handleSubmit();
									}}
								>
									<form.Field name="legalAccepted">
										{({ state, ...field }) => {
											const isInvalid = state.meta.isTouched && !state.meta.isValid;

											return (
												<Field orientation={"horizontal"}>
													<Checkbox
														checked={state.value}
														defaultChecked={false}
														id={field.name}
														onCheckedChange={(c) => field.setValue(c)}
													/>
													<FieldContent>
														<FieldLabel
															className="block font-normal text-zinc-600"
															htmlFor={field.name}
														>
															I have read and hereby accept the{" "}
															<Link
																className="inline-block font-medium text-zinc-700 hover:text-blue-500"
																href={"/legal/tos"}
															>
																Terms and Conditions
															</Link>
															,{" "}
															<Link
																className="inline-block font-medium text-zinc-700 hover:text-blue-500"
																href={"/legal/privacy"}
															>
																Privacy Policy
															</Link>
															, and{" "}
															<Link
																className="inline-block font-medium text-zinc-700 hover:text-blue-500"
																href={"/legal/platform-policies"}
															>
																Platform Policies
															</Link>
															.
														</FieldLabel>
														{isInvalid && <FieldError errors={state.meta.errors} />}
													</FieldContent>
												</Field>
											);
										}}
									</form.Field>
									<div className="mt-6 flex w-full justify-end">
										<Button
											disabled={acceptCurrentRelease.isPending}
											variant={"secondary"}
										>
											Weiter <ArrowRightIcon />
										</Button>
									</div>
								</form>
							</div>
						</div>
						<div className="flex flex-wrap justify-end gap-6">
							<div className="flex gap-4">
								<Link
									className="font-medium text-foreground text-xs transition-colors hover:text-primary"
									href={"#"}
								>
									Privacy Policy
								</Link>
								<Link
									className="font-medium text-foreground text-xs transition-colors hover:text-primary"
									href={"#"}
								>
									Help center
								</Link>
							</div>
						</div>
					</div>
				</div>
			</main>
			<main className="hidden bg-stone-50">
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
										<div className="mt-5 text-sm text-zinc-700 leading-6">
											<ReactMarkdown
												components={{
													h1: ({ ...props }) => (
														<h3
															{...props}
															className="mt-6 font-semibold text-lg text-zinc-900 first:mt-0"
														/>
													),
													h2: ({ ...props }) => (
														<h4
															{...props}
															className="mt-6 font-semibold text-base text-zinc-900 first:mt-0"
														/>
													),
													h3: ({ ...props }) => (
														<h5
															{...props}
															className="mt-5 font-medium text-base text-zinc-900 first:mt-0"
														/>
													),
													p: ({ ...props }) => <p {...props} className="mt-4 first:mt-0" />,
													ul: ({ ...props }) => (
														<ul
															{...props}
															className="mt-4 ml-6 list-disc space-y-2 first:mt-0"
														/>
													),
													ol: ({ ...props }) => (
														<ol
															{...props}
															className="mt-4 ml-6 list-decimal space-y-2 first:mt-0"
														/>
													),
													li: ({ ...props }) => <li {...props} className="pl-1" />,
													strong: ({ ...props }) => (
														<strong {...props} className="font-semibold text-zinc-900" />
													),
													a: ({ ...props }) => (
														<a
															{...props}
															className="font-medium text-blue-700 underline underline-offset-4"
														/>
													),
												}}
												remarkPlugins={[remarkGfm]}
											>
												{document.content}
											</ReactMarkdown>
										</div>
									</section>
								))}
							</div>
						</div>
					</div>
				</div>
			</main>
		</>
	);
}

export { LegalOnboardingPage };
