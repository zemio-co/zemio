import type React from "react";

function SettingsLayout({ children }: React.PropsWithChildren) {
	return (
		// <main className="min-h-svh bg-zinc-50 py-20">
		// 	<div className="mx-auto grid w-full max-w-6xl gap-12 px-8 lg:grid-cols-4 lg:gap-8">
		// 		<SettingsSidebar />
		// 		<div className="px-2.5 lg:col-span-3 lg:px-0">{children}</div>
		// 	</div>
		// </main>
		children
	);
}

export { SettingsLayout };
