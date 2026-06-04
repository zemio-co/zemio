import { Skeleton } from "@/components/ui/skeleton";

const SKELETON_ROW_KEYS = ["a", "b", "c", "d", "e", "f", "g", "h"] as const;

function ReportsListSkeleton() {
	return (
		<div className="container max-w-none space-y-2">
			{SKELETON_ROW_KEYS.map((key) => (
				<Skeleton className="h-10 w-full" key={key} />
			))}
		</div>
	);
}

export { ReportsListSkeleton };
