import { cn } from "@/lib/utils";
import { LegalFooter } from "@/modules/legal";

async function AuthLayout({
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
			<LegalFooter className="absolute bottom-8 left-1/2 -translate-x-1/2" />
		</main>
	);
}

export { AuthLayout };
