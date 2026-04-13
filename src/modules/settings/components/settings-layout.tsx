import type React from "react";
import { SettingsSidebar } from "./settings-sidebar";

function SettingsLayout({ children }: React.PropsWithChildren) {
	return (
		<main className="min-h-svh bg-zinc-50 py-20">
			<div className="mx-auto flex w-full max-w-6xl gap-8 px-8">
				<SettingsSidebar className="w-full max-w-64 shrink-0" />
				<div className="grow">{children}</div>
			</div>
		</main>
	);
}

export { SettingsLayout };
