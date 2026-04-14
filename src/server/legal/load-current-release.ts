import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";
import { cache } from "react";
import { z } from "zod";
import { CURRENT_LEGAL_RELEASE } from "./current-release";
import type {
	LegalDocumentDefinition,
	LegalDocumentVersionSnapshot,
	LegalReleaseDefinition,
} from "./types";

function normalizeLegalDocumentVersion(value: unknown): unknown {
	if (!(value instanceof Date)) {
		return value;
	}

	if (Number.isNaN(value.getTime())) {
		return value;
	}

	return value.toISOString().slice(0, 10);
}

const legalDocumentFrontMatterSchema = z.object({
	title: z.string().min(1),
	version: z.preprocess(normalizeLegalDocumentVersion, z.string().min(1)),
	summary: z.string().min(1),
});

function getLegalDocumentPath(documentKey: string): string {
	return path.join(
		process.cwd(),
		"src",
		"content",
		"legal",
		`${documentKey}.md`,
	);
}

const loadLegalDocument = cache(
	async (documentKey: string): Promise<LegalDocumentDefinition> => {
		const documentPath = getLegalDocumentPath(documentKey);
		const fileContent = await readFile(documentPath, "utf-8");
		const parsedDocument = matter(fileContent);
		const metadata = legalDocumentFrontMatterSchema.parse(parsedDocument.data);
		const content = parsedDocument.content.trim();

		if (content.length === 0) {
			throw new Error(`Legal document "${documentKey}" must not be empty.`);
		}

		return {
			key: documentKey,
			title: metadata.title,
			version: metadata.version,
			summary: metadata.summary,
			content,
		};
	},
);

export const getCurrentLegalRelease = cache(
	async (): Promise<LegalReleaseDefinition> => {
		const documents = await Promise.all(
			CURRENT_LEGAL_RELEASE.documentKeys.map((documentKey) =>
				loadLegalDocument(documentKey),
			),
		);

		return {
			version: CURRENT_LEGAL_RELEASE.version,
			publishedAt: CURRENT_LEGAL_RELEASE.publishedAt,
			acceptanceType: CURRENT_LEGAL_RELEASE.acceptanceType,
			documents,
		};
	},
);

export const getCurrentLegalDocumentVersionSnapshots = cache(
	async (): Promise<LegalDocumentVersionSnapshot[]> => {
		const release = await getCurrentLegalRelease();

		return release.documents.map((document) => ({
			key: document.key,
			title: document.title,
			version: document.version,
		}));
	},
);
