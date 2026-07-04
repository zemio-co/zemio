"use client";

import Link from "next/link";
import React from "react";
import { cn } from "@/lib/utils";
import { authClient } from "@/server/better-auth/client";
import { settingsRoutes } from "../lib/routes";
import type { SettingsGroup as SettingsGroupType } from "../lib/types";

function SettingsContent({
	className,
	...props
}: React.ComponentProps<"main">) {
	return (
		<main
			className={cn("space-y-20 py-12", className)}
			data-slot="settings-content"
			{...props}
		>
			{settingsRoutes.map((group) => (
				<SettingsGroup group={group} key={group.label} />
			))}
		</main>
	);
}

function SettingsGroup({
	className,
	group,
	...props
}: React.ComponentProps<"div"> & {
	group: SettingsGroupType;
}) {
	const [hasPerm, setHasPerm] = React.useState(false);

	React.useEffect(() => {
		let cancelled = false;

		Promise.resolve(group.hasPermission(authClient)).then((result) => {
			if (!cancelled) {
				setHasPerm(result);
			}
		});

		return () => {
			cancelled = true;
		};
	}, [group]);

	if (!hasPerm) {
		return null;
	}

	return (
		<div
			className={cn("container", className)}
			data-slot="settings-group"
			{...props}
		>
			<h1 className="font-semibold text-slate-800 text-xl">{group.label}</h1>

			<div className="mt-6 grid gap-12 sm:grid-cols-2 md:grid-cols-3">
				{group.items.map(({ icon: Icon, ...item }) => (
					<div
						className={cn(
							"relative isolate flex items-start justify-start gap-4",
							"after:absolute after:inset-0 after:top-1/2 after:left-1/2 after:z-[-1] after:h-[calc(100%+1.5rem)] after:w-[calc(100%+1.5rem)] after:-translate-x-1/2 after:-translate-y-1/2 after:rounded-md after:bg-slate-100 after:opacity-0 after:transition-opacity after:content-[''] hover:after:opacity-100",
						)}
						key={item.label}
					>
						<div className="mt-0.75 flex size-7 shrink-0 items-center justify-center rounded-md bg-slate-100 text-violet-500 [&_svg]:size-4">
							<Icon />
						</div>
						<div>
							<Link className="font-semibold text-violet-600" href={item.href}>
								{item.label}
								<span className="absolute inset-0 h-full w-full" />
							</Link>
							<p className="mt-1 text-slate-700 text-sm">{item.description}</p>
						</div>
					</div>
				))}
			</div>
		</div>
	);
}

export { SettingsContent };
