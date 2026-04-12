import { ArrowLeftIcon } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { CreateFoodExpenseForm } from "@/components/forms/expense/food";
import { CreateReceiptExpenseForm } from "@/components/forms/expense/receipt";
import { CreateTravelExpenseForm } from "@/components/forms/expense/travel";
import { PageDescription, PageTitle } from "@/components/page-title";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ROUTES } from "@/lib/consts";
import { api, HydrateClient } from "@/trpc/server";

export default async function ServerPage({
	params,
}: PageProps<"/reports/[id]/expenses/new">) {
	const { id: reportId } = await params;
	void api.settings.get.prefetch();

	return (
		<HydrateClient>
			<section className="container mt-12 max-w-4xl">
				<Button
					className={"-ms-2"}
					nativeButton={false}
					render={
						<Link href={ROUTES.REPORT_DETAIL(reportId)}>
							<ArrowLeftIcon />
							Zurück zum Report
						</Link>
					}
					variant={"ghost"}
				/>
				<PageTitle className="mt-8">Ausgabe hinzufügen</PageTitle>
				<PageDescription className="mt-2">
					Füge deinem Report eine neue Ausgabe hinzu
				</PageDescription>
			</section>
			<section className="container mt-10 max-w-4xl pb-32">
				<Tabs defaultValue="receipt">
					<TabsList className={"w-full"}>
						<TabsTrigger value="receipt">Beleg</TabsTrigger>
						<TabsTrigger value="travel">Reise</TabsTrigger>
						<TabsTrigger value="food">Verpflegung</TabsTrigger>
					</TabsList>
					<div className="mt-6">
						<TabsContent value="receipt">
							<CreateReceiptExpenseForm reportId={reportId} />
						</TabsContent>
						<TabsContent value="travel">
							<Suspense fallback={<Skeleton className="h-32 w-full" />}>
								<CreateTravelExpenseForm reportId={reportId} />
							</Suspense>
						</TabsContent>
						<TabsContent value="food">
							<CreateFoodExpenseForm reportId={reportId} />
						</TabsContent>
					</div>
				</Tabs>
			</section>
		</HydrateClient>
	);
}
