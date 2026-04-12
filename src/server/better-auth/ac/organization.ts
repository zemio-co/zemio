import { createAccessControl } from "better-auth/plugins/access";
import {
	adminAc,
	defaultStatements,
	memberAc,
	ownerAc,
} from "better-auth/plugins/organization/access";

const statement = {
	...defaultStatements,
	report: ["readAll"],
} as const;

const ac = createAccessControl(statement);

const member = ac.newRole({
	...memberAc.statements,
});

const admin = ac.newRole({
	report: ["readAll"],
	...adminAc.statements,
});

const owner = ac.newRole({
	report: ["readAll"],
	...ownerAc.statements,
});

export { member, admin, owner, ac };
