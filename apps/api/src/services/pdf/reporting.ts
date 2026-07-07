import { getPresignedDownloadUrl, uploadToStorage } from "../../lib/storage";
import type { ReportingPdfRequest } from "./reporting.validators";
import { fetchReportingPdfData } from "./reporting-data";
import {
	buildReportingPdfFilename,
	renderReportingPdf,
} from "./reporting-generate";

function isAdminRole(role: string): boolean {
	return role === "admin" || role === "owner";
}

export async function generateReportingPdf(
	organizationId: string,
	memberRole: string,
	filters: ReportingPdfRequest,
): Promise<{ url: string; filename: string }> {
	if (!isAdminRole(memberRole)) {
		throw Object.assign(new Error("Forbidden"), { status: 403 });
	}

	const data = await fetchReportingPdfData(organizationId, filters);
	const pdfBuffer = await renderReportingPdf(data);

	const filename = buildReportingPdfFilename(data.organizationName);
	const key = `pdf/temp/${crypto.randomUUID()}.pdf`;

	await uploadToStorage(key, pdfBuffer, "application/pdf");
	const url = await getPresignedDownloadUrl(key, filename, 120);

	return { url, filename };
}
