import { Button } from "@/components/ui/button";
import { SheetBody, SheetFooter } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";

function SheetFormSkeleton({ fieldCount }: { fieldCount: number }) {
	return (
		<>
			<SheetBody>
				<div className="space-y-5">
					{Array.from({ length: fieldCount }, (_, index) => `field-${index}`).map(
						(fieldKey) => (
							<div className="space-y-2" key={fieldKey}>
								<Skeleton className="h-4 w-20" />
								<Skeleton className="h-10 w-full" />
							</div>
						),
					)}
				</div>
			</SheetBody>
			<SheetFooter>
				<Skeleton className="h-10 w-32" />
			</SheetFooter>
		</>
	);
}

function SheetFormError({ error, retry }: { error: Error; retry: () => void }) {
	return (
		<>
			<SheetBody>
				<div className="space-y-3">
					<p className="font-medium text-sm">Couldn&apos;t load the form</p>
					<p className="text-muted-foreground text-sm">{error.message}</p>
				</div>
			</SheetBody>
			<SheetFooter>
				<Button onClick={retry} variant="outline">
					Try again
				</Button>
			</SheetFooter>
		</>
	);
}

export { SheetFormError, SheetFormSkeleton };
