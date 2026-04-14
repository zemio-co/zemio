export { CURRENT_LEGAL_RELEASE } from "./current-release";
export {
	getCurrentLegalDocumentVersionSnapshots,
	getCurrentLegalRelease,
} from "./load-current-release";
export {
	buildLegalOnboardingRedirectPath,
	getPostAcceptancePath,
	getRequestReturnToPath,
	getSafeReturnToPath,
	hasAcceptedCurrentLegalRelease,
} from "./session";
export type {
	LegalDocumentDefinition,
	LegalDocumentVersionSnapshot,
	LegalReleaseDefinition,
} from "./types";
