import { ShieldIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import ZemioLogo from "public/assets/zemio-logo-dark.svg";
import { AuthForm } from "./auth-form";

function AuthContent() {
	return (
		<main className="bg-stone-50">
			<div className="mx-auto w-full max-w-5xl md:px-8">
				<div className="flex min-h-svh flex-col gap-8 border-zinc-200 border-x px-6 py-12 md:px-12">
					<div className="flex shrink-0 flex-wrap items-center justify-between gap-4">
						<Image alt="Zemio Logo" className="h-5 w-fit" src={ZemioLogo} />
					</div>
					<div className="flex grow flex-col items-center justify-center">
						<div className="w-full max-w-md rounded-lg bg-white p-8 shadow-lg ring-1 ring-zinc-700/10 ring-offset-0">
							<div className="mb-8 w-fit rounded-md bg-blue-50 p-2 shadow-blue-500/10 shadow-lg ring-1 ring-blue-700/30">
								<ShieldIcon className="size-5 text-blue-500" />
							</div>
							<h1 className="font-semibold text-lg text-zinc-800">
								Willkommen zurück!
							</h1>
							<p className="mt-1.5 max-w-prose text-sm text-zinc-500">
								Melde dich mit deinem Microsoft-Konto an um fortzufahren.
							</p>
							<AuthForm className="mt-6" />
						</div>
					</div>
					<div className="flex flex-wrap justify-between gap-6">
						<p className="text-xs text-zinc-500">
							Schwierigkeiten bei der Anmeldung?{" "}
							<Link
								className="font-medium text-foreground text-xs transition-colors hover:text-primary"
								href={"#"}
							>
								Support kontaktieren
							</Link>
						</p>
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
	);
}

export { AuthContent };
