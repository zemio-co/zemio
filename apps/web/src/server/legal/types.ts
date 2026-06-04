export interface LegalDocumentVersionSnapshot {
	key: string;
	title: string;
	version: string;
}

export interface LegalDocumentDefinition extends LegalDocumentVersionSnapshot {
	summary: string;
	content: string;
}

export interface LegalReleaseDefinition {
	version: string;
	publishedAt: string;
	acceptanceType: import("@/generated/prisma/enums").LegalAcceptanceType;
	documents: readonly LegalDocumentDefinition[];
}
