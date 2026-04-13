import { adminClient, organizationClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import * as adminAc from "./ac/admin";
import * as organizationAc from "./ac/organization";

export const authClient = createAuthClient({
	plugins: [
		adminClient({
			ac: adminAc.ac,
			roles: {
				user: adminAc.user,
				admin: adminAc.admin,
			},
		}),
		organizationClient({
			ac: organizationAc.ac,
			roles: {
				member: organizationAc.member,
				admin: organizationAc.admin,
				owner: organizationAc.owner,
			},
		}),
	],
});

export type Session = typeof authClient.$Infer.Session;
