import Image from "next/image";
import Link from "next/link";
import ZemioLogo from "public/assets/zemio-logo-dark.svg";
import { ROUTES } from "@/lib/routes";
import { cn } from "@/lib/utils";
import AuthBackgroundImage from "../../../../public/assets/auth-background.jpg";
import { AuthForm } from "./auth-form";

function AuthContent() {
	return (
		<main className="flex bg-slate-100">
			<div className="w-full max-w-2xl shrink-0 bg-white">
				<div className="container flex min-h-svh max-w-2xl flex-col items-start justify-between gap-20 px-12 py-20">
					<Image alt="Zemio logo" className="h-5 w-auto" src={ZemioLogo} />
					<div className="mx-auto">
						<h1 className="text-center font-semibold text-2xl text-slate-800">
							Willkommen zurück!
						</h1>
						<p className="mt-2 max-w-prose text-center text-slate-500 text-sm">
							Melde dich mit deinem Microsoft-Konto an um fortzufahren.
						</p>
						<AuthForm className="mt-10" />
					</div>
					<div className="flex flex-wrap justify-between gap-x-6 gap-y-2">
						<p
							className={cn(
								"mx-auto block text-center text-slate-500 text-xs/4.5",
								"[&_a]:font-medium [&_a]:text-slate-800 [&_a]:transition-colors [&_a]:hover:text-violet-800",
							)}
						>
							Mit der Erstellung eines Kontos akzeptierst du die{" "}
							<Link href={ROUTES.LEGAL_TERMS_AND_CONDITIONS()}>
								Nutzungsbedingungen
							</Link>{" "}
							und bestätigst, die{" "}
							<Link href={ROUTES.LEGAL_PRIVACY_POLICY()}>Datenschutzerklärung</Link>{" "}
							sowie die{" "}
							<Link href={ROUTES.LEGAL_PLATFORM_POLICIES()}>Plattformrichtlinien</Link>{" "}
							zur Kenntnis genommen zu haben.
						</p>
					</div>
				</div>
			</div>
			<div className="relative min-h-svh grow bg-linear-to-tl from-violet-100 to-slate-50">
				<Image
					alt="Auth Background Image"
					className="h-full w-full object-cover object-left"
					src={AuthBackgroundImage}
				/>
			</div>
		</main>
	);
}

export { AuthContent };
