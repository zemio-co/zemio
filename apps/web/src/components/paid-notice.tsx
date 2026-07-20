import { StatusIcons } from "@/lib/icons";
import { cn } from "@/lib/utils";

function PaidNotice({
	className,
	dataSlot,
	title,
	description,
	...props
}: React.ComponentProps<"div"> & {
	dataSlot: string;
	title: string;
	description: React.ReactNode;
}) {
	return (
		<div
			className={cn(
				"flex flex-nowrap items-start justify-start gap-3 rounded-md border px-5 py-4",
				className,
			)}
			data-slot={dataSlot}
			{...props}
		>
			<StatusIcons.PAID className="mt-0.5 size-4 shrink-0 text-green-500" />
			<div>
				<p className="font-semibold text-sm text-zinc-800">{title}</p>
				<p className="mt-1 max-w-lg text-sm text-zinc-500">{description}</p>
			</div>
		</div>
	);
}

export { PaidNotice };
