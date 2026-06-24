import Image from "next/image";
import Link from "next/link";
import ZemioLogo from "public/assets/zemio-logo-dark.svg";
import { AuthForm } from "./auth-form";

function AuthContent() {
	return (
		<main className="flex bg-slate-100">
			<div className="w-full max-w-2xl shrink-0 bg-white">
				<div className="container flex min-h-svh max-w-xl flex-col items-start justify-between py-20">
					<Image alt="Zemio logo" className="h-5 w-auto" src={ZemioLogo} />
					<div className="">
						<h1 className="font-semibold text-2xl text-slate-800">
							Willkommen zurück!
						</h1>
						<p className="mt-2 max-w-prose text-slate-500 text-sm">
							Melde dich mit deinem Microsoft-Konto an um fortzufahren.
						</p>
						<AuthForm className="mt-10" />
					</div>
					<div className="flex flex-wrap justify-between gap-x-6 gap-y-2">
						<p className="text-xs text-zinc-500">
							Schwierigkeiten bei der Anmeldung?{" "}
							<Link
								className="font-medium text-foreground text-xs transition-colors hover:text-violet-600"
								href={"#"}
							>
								Support kontaktieren
							</Link>
						</p>
						<div className="flex gap-4">
							<Link
								className="font-medium text-foreground text-xs transition-colors hover:text-violet-600"
								href={"#"}
							>
								Privacy Policy
							</Link>
							<Link
								className="font-medium text-foreground text-xs transition-colors hover:text-violet-600"
								href={"#"}
							>
								Help center
							</Link>
						</div>
					</div>
				</div>
			</div>
			<div className="min-h-svh grow bg-linear-to-tl from-violet-100 to-slate-50" />
		</main>
	);
}

export { AuthContent };
