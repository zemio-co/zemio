import Image from "next/image";
import Link from "next/link";
import ZemioLogo from "public/assets/zemio-logo-dark.svg";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { LegalDocumentDefinition } from "@/server/legal";

interface LegalDocumentPageProps {
	document: LegalDocumentDefinition;
}

function LegalDocumentPage({ document }: LegalDocumentPageProps) {
	return (
		<main className="min-h-svh bg-stone-50">
			<div className="mx-auto w-full max-w-5xl md:px-8">
				<div className="flex flex-col gap-8 border-zinc-200 border-x px-6 py-12 md:px-12">
					<div className="flex shrink-0 flex-wrap items-center justify-between gap-4">
						<Link href="/">
							<Image alt="Zemio Logo" className="h-5 w-fit" src={ZemioLogo} />
						</Link>
					</div>
					<article className="w-full max-w-3xl">
						<h1 className="font-semibold text-2xl text-zinc-900">{document.title}</h1>
						<p className="mt-1 text-sm text-zinc-500">Version {document.version}</p>
						<p className="mt-3 text-zinc-600">{document.summary}</p>
						<div className="mt-8 text-sm text-zinc-700 leading-6">
							<ReactMarkdown
								components={{
									h1: ({ ...props }) => (
										<h2
											{...props}
											className="mt-6 font-semibold text-lg text-zinc-900 first:mt-0"
										/>
									),
									h2: ({ ...props }) => (
										<h3
											{...props}
											className="mt-6 font-semibold text-base text-zinc-900 first:mt-0"
										/>
									),
									h3: ({ ...props }) => (
										<h4
											{...props}
											className="mt-5 font-medium text-base text-zinc-900 first:mt-0"
										/>
									),
									p: ({ ...props }) => <p {...props} className="mt-4 first:mt-0" />,
									ul: ({ ...props }) => (
										<ul {...props} className="mt-4 ml-6 list-disc space-y-2 first:mt-0" />
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
					</article>
					<div className="flex flex-wrap justify-end gap-6">
						<div className="flex gap-4">
							<Link
								className="font-medium text-foreground text-xs transition-colors hover:text-primary"
								href={"/legal/privacy-policy"}
							>
								Privacy Policy
							</Link>
							<Link
								className="font-medium text-foreground text-xs transition-colors hover:text-primary"
								href={"/legal/terms-and-conditions"}
							>
								Terms and Conditions
							</Link>
						</div>
					</div>
				</div>
			</div>
		</main>
	);
}

export { LegalDocumentPage };
