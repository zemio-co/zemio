import { cn } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardTitle } from "./ui/card";

export function StatsCard({
	children,
	...props
}: React.ComponentProps<typeof Card>) {
	return (
		<Card data-slot="stats-card" {...props}>
			<CardContent className="space-y-2">{children}</CardContent>
		</Card>
	);
}

export function StatsCardDescription({
	...props
}: React.ComponentProps<typeof CardDescription>) {
	return <CardDescription data-slot="stats-card-description" {...props} />;
}

export function StatsCardValue({
	className,
	...props
}: React.ComponentProps<typeof CardTitle>) {
	return (
		<CardTitle
			className={cn("font-semibold text-2xl", className)}
			data-slot="stats-card-value"
			{...props}
		/>
	);
}
