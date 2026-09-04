import Image from "next/image";
import Link from "next/link";
import { useTranslations } from "next-intl";
import ZemioIcon from "public/assets/zemio-icon-light.svg";
import { ROUTES } from "@/lib/routes";
import { cn } from "@/lib/utils";
import { AuthForm } from "./auth-form";

function AuthContent({ className, ...props }: React.ComponentProps<"div">) {
	const t = useTranslations("modules.auth.content");

	return (
		<div className={cn("relative z-20 w-full max-w-sm", className)} {...props}>
			<Image alt="" className="size-8" src={ZemioIcon} />
			<p className="mt-10 font-semibold text-base-800 text-lg">Zemio</p>
			<p className="mt-0.5 text-base-500 text-sm">Sign up or log in to continue</p>

			<AuthForm className="mt-8" />

			<p
				className={cn(
					"mt-6 block text-slate-500 text-xs/4.5",
					"[&_a]:font-medium [&_a]:text-base-600 [&_a]:transition-colors [&_a]:hover:text-accent-800",
				)}
			>
				{t.rich("legal", {
					terms: (chunks) => (
						<Link href={ROUTES.LEGAL_TERMS_AND_CONDITIONS()}>{chunks}</Link>
					),
					privacy: (chunks) => (
						<Link href={ROUTES.LEGAL_PRIVACY_POLICY()}>{chunks}</Link>
					),
					platform: (chunks) => (
						<Link href={ROUTES.LEGAL_PLATFORM_POLICIES()}>{chunks}</Link>
					),
				})}
			</p>
		</div>
	);
}

export { AuthContent };
