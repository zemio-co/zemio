import { TriangleAlertIcon } from "lucide-react";
import { cn } from "@/lib/utils";

function ReportingBanner({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			className={cn(
				"flex flex-nowrap items-start justify-start gap-3 rounded-xl bg-amber-50 px-5 py-4",
				className,
			)}
			data-slot="reporting-banner"
			{...props}
		>
			<TriangleAlertIcon className="mt-0.5 size-4 shrink-0 text-amber-600" />
			<div>
				<p className="font-semibold text-amber-800 text-sm">
					Reporting ist ein experimentelles Feature
				</p>
				<p className="mt-1 max-w-4xl text-amber-700 text-sm">
					Reporting ist ein Feature, welches sich aktiv in der Entwicklung befindet.
					Du kannst bereits auf Reporting zugreifen und erste Funktionen austesten,
					gehe jedoch davon aus, dass Fehler auftreten können.
				</p>
			</div>
		</div>
	);
}

export { ReportingBanner };
