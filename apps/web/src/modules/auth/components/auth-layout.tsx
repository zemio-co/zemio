import Link from "next/link";
import { ROUTES } from "@/lib/routes";
import { cn } from "@/lib/utils";

function AuthLayout({
	className,
	children,
	...props
}: React.ComponentProps<"main">) {
	return (
		<main
			className={cn(
				"relative flex min-h-svh items-center justify-center overflow-hidden bg-base-50 py-32",
				className,
			)}
			data-slot="auth-layout"
			{...props}
		>
			{children}
			<div className="absolute bottom-8 left-1/2 flex w-full -translate-x-1/2 items-center justify-center gap-8 font-medium text-base-600 text-xs **:transition-colors [&>a]:hover:text-accent-600">
				<Link href={ROUTES.LEGAL_PRIVACY_POLICY()}>Privacy Policy</Link>
				<Link href={ROUTES.LEGAL_TERMS_AND_CONDITIONS()}>Terms and Conditions</Link>
				<Link href={ROUTES.LEGAL_IMPRINT()}>Imprint</Link>
			</div>
		</main>
	);
}

export { AuthLayout };
