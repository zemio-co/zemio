"use client";

import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

/**
 * Why the last sign-in did not complete, when Better Auth sent somebody back
 * here with `?error=`.
 *
 * Two codes have something to do about them. `account_not_linked`: the address
 * already has an account, and the Microsoft sign-in could not prove it belongs
 * to the same person (ADR-0010) — a sign-in link to that address proves it, so
 * that is where they are sent. `account_pending_verification`: the reverse, a
 * magic link to an address held by an unverified Microsoft sign-up — so they
 * are sent to that Microsoft account, or to support if it is not theirs. Every
 * other code reads the same, because none of them has a next step beyond
 * trying again.
 */
function AuthError({ className, ...props }: React.ComponentProps<"p">) {
	const t = useTranslations("modules.auth.error");
	const error = useSearchParams().get("error");

	if (!error) return null;

	const message =
		error === "account_not_linked"
			? t("accountNotLinked")
			: error === "account_pending_verification"
				? t("accountPendingVerification")
				: t("generic");

	return (
		<p
			className={cn(
				"rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700 text-sm",
				className,
			)}
			data-slot="auth-error"
			role="alert"
			{...props}
		>
			{message}
		</p>
	);
}

export { AuthError };
