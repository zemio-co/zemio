import { LegalAcceptanceType } from "@zemio/db";

export interface CurrentLegalReleaseDefinition {
	version: string;
	publishedAt: string;
	acceptanceType: LegalAcceptanceType;
	documentKeys: readonly string[];
}

export const CURRENT_LEGAL_RELEASE: CurrentLegalReleaseDefinition = {
	version: "2026-04-14.1",
	publishedAt: "2026-04-14",
	acceptanceType: LegalAcceptanceType.CHECKBOX_AND_BUTTON,
	documentKeys: ["terms-and-conditions", "privacy-policy", "platform-policies"],
};
