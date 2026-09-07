"use client";

import { ArrowLeftIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import ZemioIcon from "public/assets/zemio-icon-light.svg";
import { ROUTES } from "@/lib/routes";
import { cn } from "@/lib/utils";

function AuthMagicLinkSent({
	className,
	...props
}: React.ComponentProps<"div">) {
	const t = useTranslations("modules.auth.magicLinkSent");
	const params = useSearchParams();

	// The address is named where it is known. Somebody who reached this page
	// without it — a shared link, a stripped query — is told what happened in
	// the general terms that are still true.
	const email = params.get("email");

	return (
		<div className={cn("relative z-20 w-full max-w-sm", className)} {...props}>
			<Image alt="" className="size-8" src={ZemioIcon} />
			<p className="mt-10 font-semibold text-base-800 text-lg">{t("title")}</p>
			<p className="mt-0.5 text-base-500 text-sm">
				{email
					? t.rich("body", {
							address: (chunks) => (
								<span className="font-medium text-base-700">{chunks}</span>
							),
							email,
						})
					: t("bodyWithoutAddress")}
			</p>

			<Link
				className="mt-6 flex w-fit items-center justify-center gap-1.5 font-medium text-accent-600 text-sm"
				href={ROUTES.AUTH()}
			>
				<ArrowLeftIcon className="size-3.5 shrink-0" />
				{t("back")}
			</Link>
		</div>
	);
}

export { AuthMagicLinkSent };
