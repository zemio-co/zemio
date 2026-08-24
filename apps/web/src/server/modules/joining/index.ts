export {
	chooseActiveOrganization,
	emailDomain,
	gateInvitation,
	type InvitationGate,
	type JoiningRuleFacts,
	matchesPerson,
	organizationsToAutoJoin,
	type PersonSignals,
} from "./joining.policy";
export { findInvitationById } from "./joining.repository";
export {
	applyAutoJoins,
	type Openings,
	resolveOpenings,
	resolveSessionOrganization,
} from "./joining.service";
