export type {
	EmailAddress,
	SendResult,
} from "./client/scaleway";
export {
	createEmailer,
	type Emailer,
	type EmailerConfig,
	type EmailVerificationInput,
	type OrgInvitationInput,
	type ReportReceivedInput,
	type ReportSubmittedInput,
	type StatusChangedInput,
	type TrialEndingInput,
} from "./emailer";
