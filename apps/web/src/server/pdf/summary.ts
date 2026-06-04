import { writeFile } from "node:fs/promises";
import { format } from "date-fns";
import { PDFDocument as PDFLibDocument } from "pdf-lib";
import PDFDocument from "pdfkit";
import sharp from "sharp";
import type {
	Attachment,
	Expense,
	Report,
	User,
} from "@/generated/prisma/client";
import { logger } from "@/lib/logger";
import { translateExpenseType, translateReportStatus } from "@/lib/utils";
import {
	foodExpenseMetaSchema,
	travelExpenseMetaSchema,
} from "@/lib/validators";
import { getFileFromStorage, isPdfFile } from "@/server/storage";

interface SummaryProps {
	report: Report & {
		expenses: (Expense & { attachments: Attachment[] })[];
		owner: User;
		costUnit: {
			tag: string;
			title: string;
		};
		bankingDetails: {
			iban: string;
			fullName: string;
		};
	};
}

interface AttachmentData {
	key: string;
	buffer: Buffer;
}

const MUTED_COLOR = "#6b7280";
const COLUMN_WIDTHS = {
	TYPE: 100,
	DATE: 80,
	DETAILS: "*",
	AMOUNT: 80,
} as const;

function formatEuroAmount(amount: number): string {
	return `${amount.toFixed(2)}€`;
}

function toSnakeCaseFilenameSegment(value: string): string {
	const normalizedValue = value
		.normalize("NFKD")
		.replace(/[\u0300-\u036f]/g, "")
		.toLowerCase();
	const snakeCaseValue = normalizedValue
		.replace(/[^a-z0-9]+/g, "_")
		.replace(/^_+|_+$/g, "")
		.replace(/_+/g, "_");

	return snakeCaseValue || "report";
}

export function buildReportPdfFilename(
	report: Pick<Report, "tag" | "title">,
): string {
	const escapedTitle = toSnakeCaseFilenameSegment(report.title);
	return `Spesen_${report.tag}_${escapedTitle}.pdf`;
}

function formatExpenseMeta(expense: Expense): string {
	if (expense.type === "TRAVEL") {
		const meta = travelExpenseMetaSchema.safeParse(expense.meta);
		if (meta.success) {
			return `${meta.data.from} → ${meta.data.to} (${meta.data.distance.toFixed(2)} km)`;
		}
		return "Ungültige Reisedaten";
	}

	if (expense.type === "FOOD") {
		const meta = foodExpenseMetaSchema.safeParse(expense.meta);
		if (meta.success) {
			return `${meta.data.days} Tag(e)`;
		}
		return "Ungültige Verpflegungsdaten";
	}

	if (expense.type === "RECEIPT") {
		return "Beleg";
	}

	return "";
}

/**
 * Convert an arbitrary image buffer to JPEG using sharp.
 * Returns null if the buffer cannot be interpreted as an image.
 */
async function convertToJpeg(
	buffer: Buffer,
	key: string,
): Promise<Buffer | null> {
	try {
		const jpeg = await sharp(buffer).jpeg({ quality: 90 }).toBuffer();
		return jpeg;
	} catch (error) {
		logger.warn("Image conversion to JPEG failed — attachment skipped", {
			key,
			error,
		});
		void logger.flush();
		return null;
	}
}

/**
 * Fetch all attachments from storage and categorize them.
 * Non-PDF attachments are converted to JPEG via sharp so that any image
 * format (HEIC, WebP, GIF, TIFF, …) can be embedded by pdfkit.
 */
async function fetchAttachments(
	expenses: (Expense & { attachments: Attachment[] })[],
): Promise<{ images: AttachmentData[]; pdfs: AttachmentData[] }> {
	const images: AttachmentData[] = [];
	const pdfs: AttachmentData[] = [];

	const allAttachments = expenses.flatMap((expense) => expense.attachments);

	const fetchPromises = allAttachments.map(async (attachment) => {
		const buffer = await getFileFromStorage(attachment.key);
		if (!buffer) {
			logger.warn("PDF attachment fetch returned no data", {
				key: attachment.key,
			});
			void logger.flush();
			return null;
		}
		return { key: attachment.key, buffer };
	});

	const results = await Promise.all(fetchPromises);

	for (const result of results) {
		if (!result) continue;

		if (isPdfFile(result.key)) {
			pdfs.push(result);
		} else {
			const jpeg = await convertToJpeg(result.buffer, result.key);
			if (jpeg) {
				images.push({ key: result.key, buffer: jpeg });
			}
		}
	}

	return { images, pdfs };
}

/**
 * Add image attachments to the PDF document
 */
function addImagesToPdf(
	doc: typeof PDFDocument.prototype,
	images: AttachmentData[],
): void {
	if (images.length === 0) return;

	// Add section header for attachments
	doc.addPage();
	doc.fontSize(14);
	doc.font("Helvetica-Bold");
	doc.text("Belege / Anhänge", { align: "left" });
	doc.moveDown(1);

	const pageWidth =
		doc.page.width - doc.page.margins.left - doc.page.margins.right;
	const pageHeight =
		doc.page.height - doc.page.margins.top - doc.page.margins.bottom;
	const maxImageHeight = pageHeight - 60; // Leave room for filename label

	let imageIndex = 0;
	for (const image of images) {
		// Add new page for each image (except the first one which already has the header)
		if (imageIndex > 0) {
			doc.addPage();
		}

		// Add filename label
		doc.fontSize(10);
		doc.font("Helvetica");
		doc.fillColor("#6b7280");
		const filename = image.key.split("/").pop() || image.key;
		doc.text(`Anhang ${imageIndex + 1}: ${filename}`, { align: "left" });
		doc.fillColor("black");
		doc.moveDown(0.5);

		try {
			// Add the image, scaling to fit page while maintaining aspect ratio
			doc.image(image.buffer, {
				fit: [pageWidth, maxImageHeight],
				align: "center",
				valign: "top",
			});
		} catch (error) {
			logger.error("PDF image embed failed", { key: image.key, error });
			void logger.flush();
			doc.fontSize(10);
			doc.fillColor("#dc2626");
			doc.text(`Fehler beim Einbetten des Bildes: ${filename}`);
			doc.fillColor("black");
		}

		imageIndex++;
	}
}

/**
 * Merge PDF attachments into the final document using pdf-lib
 */
async function mergePdfAttachments(
	summaryBuffer: Buffer,
	pdfAttachments: AttachmentData[],
): Promise<Buffer> {
	if (pdfAttachments.length === 0) {
		return summaryBuffer;
	}

	try {
		// Load the summary PDF
		const mergedPdf = await PDFLibDocument.load(summaryBuffer);

		// Merge each PDF attachment
		for (const attachment of pdfAttachments) {
			try {
				const attachmentPdf = await PDFLibDocument.load(attachment.buffer);
				const pages = await mergedPdf.copyPages(
					attachmentPdf,
					attachmentPdf.getPageIndices(),
				);

				for (const page of pages) {
					mergedPdf.addPage(page);
				}
			} catch (error) {
				logger.error("PDF attachment merge failed", { key: attachment.key, error });
				void logger.flush();
				// Continue with other attachments
			}
		}

		// Save the merged PDF
		const mergedBuffer = await mergedPdf.save();
		return Buffer.from(mergedBuffer);
	} catch (error) {
		logger.error("PDF attachment merge process failed", { error });
		void logger.flush();
		// Return original summary if merge fails
		return summaryBuffer;
	}
}

export async function generatePdfSummary({
	report,
}: SummaryProps): Promise<Buffer> {
	const pdfCreationDate = new Date();

	// Fetch all attachments from storage
	const { images, pdfs } = await fetchAttachments(report.expenses);

	const doc = new PDFDocument({
		autoFirstPage: true,
		layout: "portrait",
		size: "A4",
		margins: {
			top: 48,
			bottom: 48,
			left: 32,
			right: 32,
		},
	});

	doc.fontSize(24);
	doc.font("Helvetica-Bold");
	doc.text(report.title, { align: "left" });
	doc.moveDown(0.5);

	doc.fontSize(12);
	doc.font("Helvetica");
	doc.fillColor(MUTED_COLOR);
	const creationDateStr = format(report.createdAt, "dd.MM.yyyy");
	const statusStr = translateReportStatus(report.status);
	doc.text(
		`Erstellt am ${creationDateStr} | Report ID: ${report.tag} | Status: ${statusStr}`,
		{
			align: "left",
		},
	);
	doc.text(`Kostenstelle: ${report.costUnit.tag} | ${report.costUnit.title}`, {
		align: "left",
	});
	doc.fillColor("black");
	doc.moveDown(1);

	if (report.description) {
		doc.fontSize(11);
		doc.fillColor(MUTED_COLOR);
		doc.text(`Beschreibung: ${report.description}`, {
			align: "left",
			width: doc.page.width - doc.page.margins.left - doc.page.margins.right,
		});
		doc.fillColor("black");
		doc.moveDown(2.5);
	} else {
		doc.moveDown(2);
	}

	const userInfoTable = doc.table({
		defaultStyle: {
			border: false,
			padding: 0,
		},
		rowStyles: () => ({ height: 16 }),
		columnStyles: () => ({ width: "*" }),
	});

	doc.font("Helvetica-Bold");
	doc.fontSize(11);
	userInfoTable.row(["Antragssteller", "Kontoangaben"]);

	doc.font("Helvetica");
	userInfoTable.row([report.owner.name, report.bankingDetails.fullName]);
	userInfoTable.row([report.owner.email, report.bankingDetails.iban]);

	doc.moveDown(3);

	doc.fontSize(14);
	doc.font("Helvetica-Bold");
	doc.text("Ausgabenübersicht", { align: "left" });
	doc.moveDown(0.5);

	if (report.expenses.length === 0) {
		doc.fontSize(11);
		doc.font("Helvetica");
		doc.text("Keine Ausgaben vorhanden.", { align: "left" });
	} else {
		const totalAmount = report.expenses.reduce(
			(sum, expense) => sum + Number(expense.amount),
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

		doc.font("Helvetica-Bold");
		doc.fontSize(10);
		expensesTable.row(["Typ", "Startdatum", "Enddatum", "Details", "Betrag"]);

		doc.font("Helvetica");
		doc.fontSize(9);

		for (const expense of report.expenses) {
			const typeStr = translateExpenseType(expense.type);
			const startDateStr = format(expense.startDate, "dd.MM.yyyy");
			const endDateStr = format(expense.endDate, "dd.MM.yyyy");
			const metaStr = formatExpenseMeta(expense);
			const descriptionStr = expense.description || "";
			const detailsStr =
				descriptionStr && metaStr
					? `${descriptionStr} (${metaStr})`
					: descriptionStr || metaStr || "-";
			const amountStr = formatEuroAmount(Number(expense.amount));

			expensesTable.row([
				typeStr,
				startDateStr,
				endDateStr,
				detailsStr,
				amountStr,
			]);
		}

		doc.font("Helvetica-Bold");
		doc.fontSize(9);
		expensesTable.row(["Gesamt", "", "", "", formatEuroAmount(totalAmount)]);
	}

	doc.moveDown(2);

	doc.fontSize(9);
	doc.font("Helvetica");
	doc.text(
		`PDF erstellt am ${format(pdfCreationDate, "dd.MM.yyyy")} um ${format(pdfCreationDate, "HH:mm")} Uhr`,
		{
			align: "left",
		},
	);

	// Add image attachments to the PDF
	addImagesToPdf(doc, images);

	// Generate the PDFKit document buffer
	const chunks: Uint8Array[] = [];
	doc.on("data", (chunk) => chunks.push(chunk));

	const summaryBuffer = await new Promise<Buffer>((resolve, reject) => {
		doc.on("end", () => {
			const buffer = Buffer.concat(chunks);
			resolve(buffer);
		});
		doc.on("error", reject);
		doc.end();
	});

	// Merge PDF attachments using pdf-lib
	const finalBuffer = await mergePdfAttachments(summaryBuffer, pdfs);

	return finalBuffer;
}

export async function savePdfSummaryToFile(
	filepath: string,
	props: SummaryProps,
): Promise<void> {
	const buffer = await generatePdfSummary(props);
	await writeFile(filepath, buffer);
}
