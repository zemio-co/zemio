import type { Attachment, Expense, Report, User } from "@zemio/db";
import { format } from "date-fns";
import heicConvert from "heic-convert";
import { PDFDocument as PDFLibDocument } from "pdf-lib";
import PDFDocument from "pdfkit";
import sharp from "sharp";
import { logger } from "../../lib/logger";

const MUTED_COLOR = "#6b7280";
const COLUMN_WIDTHS = {
	TYPE: 100,
	DATE: 80,
	DETAILS: "*",
	AMOUNT: 80,
} as const;

export interface PdfInput {
	report: Report & {
		expenses: (Expense & { attachments: Attachment[] })[];
		owner: User;
		costUnit: { tag: string; title: string };
		bankingDetails: { iban: string; fullName: string };
	};
	images: { key: string; buffer: Buffer }[];
	pdfs: { key: string; buffer: Buffer }[];
}

function translateReportStatus(status: Report["status"]): string {
	switch (status) {
		case "DRAFT":
			return "Entwurf";
		case "PENDING_APPROVAL":
			return "In Bearbeitung";
		case "NEEDS_REVISION":
			return "Benötigt Überarbeitung";
		case "ACCEPTED":
			return "Akzeptiert";
		case "REJECTED":
			return "Abgelehnt";
	}
}

function translateExpenseType(type: Expense["type"]): string {
	switch (type) {
		case "RECEIPT":
			return "Beleg";
		case "TRAVEL":
			return "Reise";
		case "FOOD":
			return "Verpflegung";
	}
}

const travelMetaSchema = {
	parse: (
		meta: unknown,
	): { from: string; to: string; distance: number } | null => {
		if (!meta || typeof meta !== "object") return null;
		const m = meta as Record<string, unknown>;
		if (
			typeof m.from !== "string" ||
			typeof m.to !== "string" ||
			typeof m.distance !== "number"
		)
			return null;
		return { from: m.from, to: m.to, distance: m.distance };
	},
};

const foodMetaSchema = {
	parse: (meta: unknown): { days: number } | null => {
		if (!meta || typeof meta !== "object") return null;
		const m = meta as Record<string, unknown>;
		if (typeof m.days !== "number") return null;
		return { days: m.days };
	},
};

function formatExpenseMeta(expense: Expense): string {
	if (expense.type === "TRAVEL") {
		const meta = travelMetaSchema.parse(expense.meta);
		if (meta) return `${meta.from} → ${meta.to} (${meta.distance.toFixed(2)} km)`;
		return "Ungültige Reisedaten";
	}
	if (expense.type === "FOOD") {
		const meta = foodMetaSchema.parse(expense.meta);
		if (meta) return `${meta.days} Tag(e)`;
		return "Ungültige Verpflegungsdaten";
	}
	return "";
}

function formatEuroAmount(amount: number): string {
	return `${amount.toFixed(2)}€`;
}

function toSnakeCaseFilenameSegment(value: string): string {
	const normalized = value.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase();
	return (
		normalized
			.replace(/[^a-z0-9]+/g, "_")
			.replace(/^_+|_+$/g, "")
			.replace(/_+/g, "_") || "report"
	);
}

export function buildReportPdfFilename(
	report: Pick<Report, "tag" | "title">,
): string {
	return `Spesen_${report.tag}_${toSnakeCaseFilenameSegment(report.title)}.pdf`;
}

async function convertToJpeg(
	buffer: Buffer,
	key: string,
): Promise<Buffer | null> {
	try {
		const ext = key.split(".").pop()?.toLowerCase();
		if (ext === "heic" || ext === "heif") {
			const output = await heicConvert({ buffer, format: "JPEG", quality: 0.9 });
			return Buffer.from(output);
		}
		return await sharp(buffer).jpeg({ quality: 90 }).toBuffer();
	} catch (error) {
		logger.warn("Image conversion to JPEG failed — attachment skipped", {
			key,
			error,
		});
		return null;
	}
}

export async function prepareAttachmentBuffers(
	rawImages: { key: string; buffer: Buffer }[],
): Promise<{ key: string; buffer: Buffer }[]> {
	const results = await Promise.all(
		rawImages.map(async ({ key, buffer }) => {
			const jpeg = await convertToJpeg(buffer, key);
			return jpeg ? { key, buffer: jpeg } : null;
		}),
	);
	return results.filter((r): r is { key: string; buffer: Buffer } => r !== null);
}

function addImagesToPdf(
	doc: InstanceType<typeof PDFDocument>,
	images: { key: string; buffer: Buffer }[],
): void {
	if (images.length === 0) return;
	doc.addPage();
	doc
		.fontSize(14)
		.font("Helvetica-Bold")
		.text("Belege / Anhänge", { align: "left" });
	doc.moveDown(1);

	const pageWidth =
		doc.page.width - doc.page.margins.left - doc.page.margins.right;
	const pageHeight =
		doc.page.height - doc.page.margins.top - doc.page.margins.bottom;
	const maxImageHeight = pageHeight - 60;

	images.forEach((image, i) => {
		if (i > 0) doc.addPage();
		const filename = image.key.split("/").pop() ?? image.key;
		doc.fontSize(10).font("Helvetica").fillColor("#6b7280");
		doc.text(`Anhang ${i + 1}: ${filename}`, { align: "left" });
		doc.fillColor("black").moveDown(0.5);
		try {
			doc.image(image.buffer, {
				fit: [pageWidth, maxImageHeight],
				align: "center",
			});
		} catch (error) {
			logger.error("PDF image embed failed", { key: image.key, error });
			doc
				.fontSize(10)
				.fillColor("#dc2626")
				.text(`Fehler beim Einbetten des Bildes: ${filename}`)
				.fillColor("black");
		}
	});
}

async function mergePdfAttachments(
	summaryBuffer: Buffer,
	pdfAttachments: { key: string; buffer: Buffer }[],
): Promise<Buffer> {
	if (pdfAttachments.length === 0) return summaryBuffer;
	try {
		const merged = await PDFLibDocument.load(summaryBuffer);
		for (const { key, buffer } of pdfAttachments) {
			try {
				const pdf = await PDFLibDocument.load(buffer);
				const pages = await merged.copyPages(pdf, pdf.getPageIndices());
				for (const page of pages) merged.addPage(page);
			} catch (error) {
				logger.error("PDF attachment merge failed", { key, error });
			}
		}
		return Buffer.from(await merged.save());
	} catch (error) {
		logger.error("PDF merge process failed", { error });
		return summaryBuffer;
	}
}

export async function generatePdf({
	report,
	images,
	pdfs,
}: PdfInput): Promise<Buffer> {
	const pdfCreationDate = new Date();

	const doc = new PDFDocument({
		autoFirstPage: true,
		layout: "portrait",
		size: "A4",
		margins: { top: 48, bottom: 48, left: 32, right: 32 },
	});

	doc.fontSize(24).font("Helvetica-Bold").text(report.title, { align: "left" });
	doc.moveDown(0.5);

	doc.fontSize(12).font("Helvetica").fillColor(MUTED_COLOR);
	const creationDateStr = format(report.createdAt, "dd.MM.yyyy");
	doc.text(
		`Erstellt am ${creationDateStr} | Report ID: ${report.tag} | Status: ${translateReportStatus(report.status)}`,
		{ align: "left" },
	);
	doc.text(`Kostenstelle: ${report.costUnit.tag} | ${report.costUnit.title}`, {
		align: "left",
	});
	doc.fillColor("black").moveDown(1);

	if (report.description) {
		doc.fontSize(11).fillColor(MUTED_COLOR);
		doc.text(`Beschreibung: ${report.description}`, {
			align: "left",
			width: doc.page.width - doc.page.margins.left - doc.page.margins.right,
		});
		doc.fillColor("black").moveDown(2.5);
	} else {
		doc.moveDown(2);
	}

	const userInfoTable = doc.table({
		defaultStyle: { border: false, padding: 0 },
		rowStyles: () => ({ height: 16 }),
		columnStyles: () => ({ width: "*" }),
	});
	doc.font("Helvetica-Bold").fontSize(11);
	userInfoTable.row(["Antragssteller", "Kontoangaben"]);
	doc.font("Helvetica");
	userInfoTable.row([report.owner.name ?? "", report.bankingDetails.fullName]);
	userInfoTable.row([report.owner.email, report.bankingDetails.iban]);

	doc.moveDown(3);
	doc
		.fontSize(14)
		.font("Helvetica-Bold")
		.text("Ausgabenübersicht", { align: "left" });
	doc.moveDown(0.5);

	if (report.expenses.length === 0) {
		doc
			.fontSize(11)
			.font("Helvetica")
			.text("Keine Ausgaben vorhanden.", { align: "left" });
	} else {
		const totalAmount = report.expenses.reduce(
			(sum, e) => sum + Number(e.amount),
			0,
		);
		const lastRowIndex = report.expenses.length + 1;

		const expensesTable = doc.table({
			rowStyles: (index) => {
				if (index === 0) return { backgroundColor: "#efefef" };
				if (index === lastRowIndex) return { backgroundColor: "#f5f5f5" };
				return {};
			},
			columnStyles: (index) => {
				const widths = [
					COLUMN_WIDTHS.TYPE,
					COLUMN_WIDTHS.DATE,
					COLUMN_WIDTHS.DATE,
					COLUMN_WIDTHS.DETAILS,
					COLUMN_WIDTHS.AMOUNT,
				];
				return { width: widths[index] ?? "*" };
			},
		});

		doc.font("Helvetica-Bold").fontSize(10);
		expensesTable.row(["Typ", "Startdatum", "Enddatum", "Details", "Betrag"]);
		doc.font("Helvetica").fontSize(9);

		for (const expense of report.expenses) {
			const typeStr = translateExpenseType(expense.type);
			const startDateStr = format(expense.startDate, "dd.MM.yyyy");
			const endDateStr = format(expense.endDate, "dd.MM.yyyy");
			const metaStr = formatExpenseMeta(expense);
			const descriptionStr = expense.description ?? "";
			const detailsStr =
				descriptionStr && metaStr
					? `${descriptionStr} (${metaStr})`
					: descriptionStr || metaStr || "-";

			expensesTable.row([
				typeStr,
				startDateStr,
				endDateStr,
				detailsStr,
				formatEuroAmount(Number(expense.amount)),
			]);
		}

		doc.font("Helvetica-Bold").fontSize(9);
		expensesTable.row(["Gesamt", "", "", "", formatEuroAmount(totalAmount)]);
	}

	doc.moveDown(2);
	doc
		.fontSize(9)
		.font("Helvetica")
		.text(
			`PDF erstellt am ${format(pdfCreationDate, "dd.MM.yyyy")} um ${format(pdfCreationDate, "HH:mm")} Uhr`,
			{ align: "left" },
		);

	addImagesToPdf(doc, images);

	const chunks: Uint8Array[] = [];
	doc.on("data", (chunk) => chunks.push(chunk));

	const summaryBuffer = await new Promise<Buffer>((resolve, reject) => {
		doc.on("end", () => resolve(Buffer.concat(chunks)));
		doc.on("error", reject);
		doc.end();
	});

	return mergePdfAttachments(summaryBuffer, pdfs);
}
