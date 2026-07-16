import { format } from "date-fns";
import PDFDocument from "pdfkit";
import {
	formatEuroAmount,
	toSnakeCaseFilenameSegment,
	translateExpenseType,
	translateReportStatus,
} from "./format";
import type { ReportingPdfData } from "./reporting-data";

const MUTED_COLOR = "#6b7280";

type Doc = InstanceType<typeof PDFDocument>;

function buildFilterSummary(data: ReportingPdfData): string {
	const parts: string[] = [];

	if (data.filters.dateRange) {
		parts.push(
			`Zeitraum: ${format(data.filters.dateRange.start, "dd.MM.yyyy")} – ${format(data.filters.dateRange.end, "dd.MM.yyyy")}`,
		);
	}
	if (data.filters.statuses?.length) {
		parts.push(
			`Status: ${data.filters.statuses.map(translateReportStatus).join(", ")}`,
		);
	}
	if (data.filters.costUnitIds?.length) {
		parts.push(`${data.filters.costUnitIds.length} Kostenstelle(n) gefiltert`);
	}
	if (data.filters.ownerIds?.length) {
		parts.push(`${data.filters.ownerIds.length} Mitglied(er) gefiltert`);
	}

	return parts.length > 0 ? parts.join(" | ") : "Kein Filter angewendet";
}

function drawOverviewSection(doc: Doc, data: ReportingPdfData): void {
	doc.fontSize(14).font("Helvetica-Bold").text("Übersicht", { align: "left" });
	doc.moveDown(0.5);

	const table = doc.table({
		defaultStyle: { border: false, padding: 0 },
		rowStyles: () => ({ height: 18 }),
		columnStyles: () => ({ width: "*" }),
	});

	doc.font("Helvetica").fontSize(10);
	table.row([
		"Eingereicht gesamt",
		formatEuroAmount(data.overview.totalSubmitted),
	]);
	table.row(["Erstattet", formatEuroAmount(data.overview.totalReimbursed)]);
	table.row(["Ausstehend", formatEuroAmount(data.overview.totalPending)]);
	table.row(["Abgelehnt", formatEuroAmount(data.overview.totalRejected)]);

	doc.moveDown(2);
}

function drawBreakdownTable(
	doc: Doc,
	title: string,
	rows: { label: string; amount: number; count: number }[],
): void {
	doc.fontSize(14).font("Helvetica-Bold").text(title, { align: "left" });
	doc.moveDown(0.5);

	if (rows.length === 0) {
		doc
			.fontSize(10)
			.font("Helvetica")
			.fillColor(MUTED_COLOR)
			.text("Keine Daten vorhanden.")
			.fillColor("black");
		doc.moveDown(2);
		return;
	}

	const table = doc.table({
		rowStyles: (index) => (index === 0 ? { backgroundColor: "#efefef" } : {}),
		columnStyles: (index) => ({ width: index === 0 ? "*" : 100 }),
	});

	doc.font("Helvetica-Bold").fontSize(10);
	table.row(["Bezeichnung", "Betrag", "Anzahl"]);
	doc.font("Helvetica").fontSize(9);

	for (const row of rows) {
		table.row([row.label, formatEuroAmount(row.amount), String(row.count)]);
	}

	doc.moveDown(2);
}

/** Renders the aggregate reporting snapshot — no per-member/itemized detail (see reporting-data.ts). */
export function renderReportingPdf(data: ReportingPdfData): Promise<Buffer> {
	const doc = new PDFDocument({
		autoFirstPage: true,
		layout: "portrait",
		size: "A4",
		margins: { top: 48, bottom: 48, left: 32, right: 32 },
	});

	doc
		.fontSize(22)
		.font("Helvetica-Bold")
		.text(`Reporting: ${data.organizationName}`, { align: "left" });
	doc.moveDown(0.5);

	doc.fontSize(10).font("Helvetica").fillColor(MUTED_COLOR);
	doc.text(
		`Erstellt am ${format(data.generatedAt, "dd.MM.yyyy")} um ${format(data.generatedAt, "HH:mm")} Uhr`,
	);
	doc.text(buildFilterSummary(data));
	doc.fillColor("black").moveDown(2);

	drawOverviewSection(doc, data);

	drawBreakdownTable(
		doc,
		"Nach Kostenstelle",
		data.byCostUnit.map((row) => ({
			label: `${row.tag} · ${row.title}`,
			amount: row.amount,
			count: row.count,
		})),
	);

	drawBreakdownTable(
		doc,
		"Nach Ausgabenart",
		data.byExpenseType.map((row) => ({
			label: translateExpenseType(row.type),
			amount: row.amount,
			count: row.count,
		})),
	);

	const chunks: Uint8Array[] = [];
	doc.on("data", (chunk) => chunks.push(chunk));

	return new Promise<Buffer>((resolve, reject) => {
		doc.on("end", () => resolve(Buffer.concat(chunks)));
		doc.on("error", reject);
		doc.end();
	});
}

export function buildReportingPdfFilename(organizationName: string): string {
	const datePart = format(new Date(), "yyyy-MM-dd");
	return `Reporting_${toSnakeCaseFilenameSegment(organizationName)}_${datePart}.pdf`;
}
