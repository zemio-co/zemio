import { createAccessControl } from "better-auth/plugins/access";
import {
	adminAc,
	defaultStatements,
	userAc,
} from "better-auth/plugins/admin/access";

const statement = {
	app: ["update"],
	...defaultStatements,
} as const;

const ac = createAccessControl(statement);

const user = ac.newRole({
	...userAc.statements,
});

const admin = ac.newRole({
	app: ["update"],
	...adminAc.statements,
});

export { ac, admin, user };
