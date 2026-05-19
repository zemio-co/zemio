"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { api } from "@/trpc/react";

type ReportReasoning = {
	id: string;
	description: string | null;
	owner: {
		name: string;
		email: string;
		id: string;
		image: string | null;
	};
};

function ReviewReasoning({
	className,
	reportId,
	...props
}: React.ComponentProps<"section"> & {
	reportId: string;
}) {
	const {
		data: reasoning,
		error,
		isPending,
	} = api.report.getById.useQuery({
		id: reportId,
	});

	if (!reasoning) {
		return;
	}

	if (isPending) {
		return (
			<section className={cn("space-y-4", className)} {...props}>
				<ReasoningHeader />
				<Skeleton className="min-h-32 w-full" />
			</section>
		);
	}

	if (error || !reasoning) {
		return (
			<section className={cn("space-y-4", className)} {...props}>
				<ReasoningHeader />
				<div className="flex min-h-24 flex-col items-center justify-center gap-1 rounded-md border border-dashed px-6 py-10">
					<p className="text-center font-medium text-destructive text-sm">
						Fehler beim Laden des Reports
					</p>
					<p className="text-center text-xs">
						{error?.message ?? "Ein unbekannter Fehler ist aufgetreten"}
					</p>
				</div>
			</section>
		);
	}

	if (!reasoning.description) {
		return (
			<section className={cn("space-y-4", className)} {...props}>
				<ReasoningHeader />
				<div className="flex min-h-24 flex-col items-center justify-center gap-1 rounded-md border border-dashed px-6 py-10">
					<p className="text-center font-medium text-sm">Keine Begründung</p>
					<p className="text-center text-xs">
						Der Nutzer hat keine Begründung für diesen Antrag angegeben.
					</p>
				</div>
			</section>
		);
	}

	return (
		<section className={cn("space-y-4", className)} {...props}>
			<ReasoningHeader />
			<ReasoningContent reasoning={reasoning} />
		</section>
	);
}

function ReasoningHeader({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			className={cn("flex items-center justify-start gap-2", className)}
			data-slot="component"
			{...props}
		>
			<p className="font-semibold text-zinc-800">Begründung</p>
		</div>
	);
}

function ReasoningContent({
	className,
	reasoning,
	...props
}: React.ComponentProps<"div"> & {
	reasoning: ReportReasoning;
}) {
	return (
		<div
			className={cn("space-y-3", className)}
			data-slot="reasoning-content"
			{...props}
		>
			<p className="max-w-prose rounded-lg rounded-bl-none bg-background px-4 py-3 text-zinc-700 leading-7 shadow-sm ring-1 ring-zinc-700/15">
				{reasoning.description}
			</p>
			<div className="flex items-center justify-start">
				<p className="text-sm text-zinc-500">Von</p>
				<Avatar className={"mr-1 ml-2 size-3.5"}>
					<AvatarImage src={reasoning.owner.image ?? undefined} />
					<AvatarFallback>
						{reasoning.owner.name.charAt(0)?.toUpperCase()}
					</AvatarFallback>
				</Avatar>
				<p className="font-medium text-sm text-zinc-600">{reasoning.owner.name}</p>
			</div>
		</div>
	);
}

export { ReviewReasoning };
