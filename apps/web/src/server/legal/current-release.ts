import { LegalAcceptanceType } from "@zemio/db";

export interface CurrentLegalReleaseDefinition {
	version: string;
	publishedAt: string;
	acceptanceType: LegalAcceptanceType;
	documentKeys: readonly string[];
}

export const CURRENT_LEGAL_RELEASE: CurrentLegalReleaseDefinition = {
	version: "2026-10-30.1",
	publishedAt: "2026-10-30",
	acceptanceType: LegalAcceptanceType.CHECKBOX_AND_BUTTON,
	documentKeys: ["terms-and-conditions", "privacy-policy", "platform-policies"],
};

/**
 * Published but never accepted: an imprint informs, nobody agrees to it. Kept
 * out of `documentKeys`, so changing it does not ask everybody to accept again.
 */
export const IMPRINT_DOCUMENT_KEY = "imprint";
