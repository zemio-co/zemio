import Image from "next/image";
import Link from "next/link";
import ZemioLogo from "public/assets/zemio-logo-dark.svg";
import { AuthForm } from "./auth-form";

function AuthContent() {
	return (
		<main className="flex min-h-svh flex-col items-center justify-center py-12">
			<Image alt="Zemio Logo" className="h-5 w-fit" src={ZemioLogo} />
			<div className="my-8 flex w-full max-w-md flex-col items-center justify-center rounded-xl bg-muted p-8">
				<div className="space-y-1 text-center">
					<h1 className="font-semibold text-foreground text-lg">
						Willkommen zurück!
					</h1>
					<p className="text-muted-foreground text-sm">
						Melde dich mit deinem Microsoft Konto an um fortzufahren.
					</p>
				</div>

				<AuthForm className="mt-6 w-full" />
			</div>
			<p className="text-center text-muted-foreground text-xs">
				Hast du Schwierigkeiten bei der Anmeldung?{" "}
				<Link
					className="font-medium text-foreground"
					href={"mailto:support@move-ev.de"}
				>
					Hilfe anfragen
				</Link>
			</p>
		</main>
	);
}

export { AuthContent };
