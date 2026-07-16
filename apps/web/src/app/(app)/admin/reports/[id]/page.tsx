import { ReviewContent } from "@/modules/review";
import { api, HydrateClient } from "@/trpc/server";

export default async function ServerPage({
	params,
}: PageProps<"/reports/[id]">) {
	const { id: reportId } = await params;

	void api.report.review.prefetch({ id: reportId });

	return (
		<HydrateClient>
			<ReviewContent reportId={reportId} />
		</HydrateClient>
	);
}
