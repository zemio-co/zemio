import { LegalAcceptanceType } from "@/generated/prisma/enums";

export interface LegalDocumentDefinition {
	key: string;
	title: string;
	version: string;
	summary: string;
	content: readonly string[];
}

export interface LegalReleaseDefinition {
	version: string;
	publishedAt: string;
	acceptanceType: LegalAcceptanceType;
	documents: readonly LegalDocumentDefinition[];
}

export interface LegalDocumentVersionSnapshot {
	key: string;
	title: string;
	version: string;
}

export const CURRENT_LEGAL_RELEASE: LegalReleaseDefinition = {
	version: "2026-04-14.1",
	publishedAt: "2026-04-14",
	acceptanceType: LegalAcceptanceType.CHECKBOX_AND_BUTTON,
	documents: [
		{
			key: "terms-and-conditions",
			title: "Terms and Conditions",
			version: "2026-04-14",
			summary: "Placeholder for the contractual terms governing product use.",
			content: [
				"This is placeholder content for the Zemio Terms and Conditions.",
				"Replace this text with the final contractual clauses before production rollout.",
				"The acceptance flow, release versioning, and audit storage are already wired to this document definition.",
			],
		},
		{
			key: "privacy-policy",
			title: "Privacy Policy",
			version: "2026-04-14",
			summary: "Placeholder for the privacy and data-processing terms.",
			content: [
				"This is placeholder content for the Zemio Privacy Policy.",
				"Replace this text with the approved privacy notice and data processing information.",
				"Users must accept this document as part of the active legal release.",
			],
		},
		{
			key: "platform-policies",
			title: "Platform Policies",
			version: "2026-04-14",
			summary:
				"Placeholder for supplemental operational or platform-specific policies.",
			content: [
				"This is placeholder content for supplemental Zemio platform policies.",
				"Use this slot for code-managed policy documents that must be accepted together with the release.",
				"Add, remove, or replace documents in this release definition as legal requirements evolve.",
			],
		},
	],
};

export function getCurrentLegalDocumentVersionSnapshots(): LegalDocumentVersionSnapshot[] {
	return CURRENT_LEGAL_RELEASE.documents.map((document) => ({
		key: document.key,
		title: document.title,
		version: document.version,
	}));
}
