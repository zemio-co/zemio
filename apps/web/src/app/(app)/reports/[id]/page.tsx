import { ReportContent } from "@/modules/report";

export default async function ServerPage({
	params,
}: PageProps<"/reports/[id]">) {
	const { id: reportId } = await params;

	return <ReportContent reportId={reportId} />;
}
