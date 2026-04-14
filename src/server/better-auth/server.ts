import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { admin as adminPlugin, organization } from "better-auth/plugins";
import { env } from "@/env";
import { sendOrgInvitationEmail } from "@/server/better-auth/invitations";
import { db } from "@/server/db";
import { CURRENT_LEGAL_RELEASE } from "@/server/legal";
import * as adminAc from "./ac/admin";
import * as organizationAc from "./ac/organization";

// Get configuration values
const authUrl = env.BETTER_AUTH_URL;
const _microsoftTenantId = env.MICROSOFT_TENANT_ID;
const microsoftClientId = env.MICROSOFT_CLIENT_ID;

/**
 * Decodes the payload of a Microsoft JWT id_token (without re-verification —
 * better-auth has already verified the token) and extracts the `tid` claim,
 * which is the Microsoft Entra ID tenant identifier.
 */
function extractMicrosoftTenantId(idToken: string): string | null {
	try {
		const payloadBase64 = idToken.split(".")[1];
		if (!payloadBase64) return null;

		const payloadJson = Buffer.from(payloadBase64, "base64url").toString("utf-8");
		const payload = JSON.parse(payloadJson) as Record<string, unknown>;

		return typeof payload.tid === "string" ? payload.tid : null;
	} catch {
		return null;
	}
}

export const auth = betterAuth({
	database: prismaAdapter(db, {
		provider: "postgresql",
	}),
	trustedOrigins: [
		authUrl,
		...(env.NODE_ENV === "development"
			? ["http://localhost:3000", "http://127.0.0.1:3000"]
			: []),
	],
	emailAndPassword: {
		enabled: false,
	},
	session: {
		additionalFields: {
			legalAcceptedAt: {
				type: "date",
				required: false,
				input: false,
			},
			legalAcceptedReleaseVersion: {
				type: "string",
				required: false,
				input: false,
			},
		},
	},
	socialProviders: {
		microsoft: {
			clientId: microsoftClientId,
			clientSecret: env.MICROSOFT_CLIENT_SECRET,
			authority: "https://login.microsoftonline.com",
			prompt: "select_account",
		},
	},
	databaseHooks: {
		user: {
			create: {
				after: async (user) => {
					await db.preferences.create({
						data: {
							userId: user.id,
							notifications: "ALL",
						},
					});
				},
			},
		},
		session: {
			create: {
				before: async (session) => {
					// Resolve the user's Microsoft Entra ID tenant from the stored
					// idToken. The idToken is written to the account record by
					// better-auth during the OAuth callback, so it is always present
					// by the time this session hook runs.
					const msAccount = await db.account.findFirst({
						where: {
							userId: session.userId,
							providerId: "microsoft",
						},
						select: { idToken: true },
					});

					const tenantIdFromToken = msAccount?.idToken
						? extractMicrosoftTenantId(msAccount.idToken)
						: null;

					// Fall back to the value stored on the user record from a
					// previous login (covers sessions where the idToken is unavailable).
					let resolvedTenantId: string | null = tenantIdFromToken;

					if (!resolvedTenantId) {
						const user = await db.user.findFirst({
							where: { id: session.userId },
							select: { microsoftTenantId: true },
						});
						resolvedTenantId = user?.microsoftTenantId ?? null;
					} else {
						// Persist the tenant ID on the user for future sessions.
						await db.user.update({
							where: { id: session.userId },
							data: { microsoftTenantId: resolvedTenantId },
						});
					}

					if (resolvedTenantId) {
						// Find all organizations configured for this tenant.
						const matchingOrgs = await db.organization.findMany({
							where: { microsoftTenantId: resolvedTenantId },
							select: { id: true },
						});

						// Auto-add the user as a member of every matching organization
						// they have not yet joined. Handles both the initial login and
						// the case where a new organization is created for an existing
						// tenant after users have already logged in.
						for (const org of matchingOrgs) {
							const existingMember = await db.member.findFirst({
								where: {
									userId: session.userId,
									organizationId: org.id,
								},
							});

							if (!existingMember) {
								await db.member.create({
									data: {
										id: crypto.randomUUID(),
										userId: session.userId,
										organizationId: org.id,
										role: "member",
										createdAt: new Date(),
									},
								});
							}
						}
					}

					// Set the active organization to the user's earliest membership
					// so they land in an org context immediately after login.
					const firstMember = await db.member.findFirst({
						where: { userId: session.userId },
						orderBy: { createdAt: "asc" },
					});

					// This extra lookup keeps newly created sessions in sync with the
					// immutable LegalAcceptance source of truth, including sessions
					// created after the acceptance mutation updated existing sessions.
					const legalAcceptance = await db.legalAcceptance.findUnique({
						where: {
							userId_releaseVersion: {
								userId: session.userId,
								releaseVersion: CURRENT_LEGAL_RELEASE.version,
							},
						},
						select: {
							acceptedAt: true,
							releaseVersion: true,
						},
					});

					return {
						data: {
							...session,
							activeOrganizationId: firstMember?.organizationId ?? null,
							legalAcceptedAt: legalAcceptance?.acceptedAt ?? null,
							legalAcceptedReleaseVersion: legalAcceptance?.releaseVersion ?? null,
						},
					};
				},
			},
		},
	},
	plugins: [
		adminPlugin({
			ac: adminAc.ac,
			roles: {
				user: adminAc.user,
				admin: adminAc.admin,
			},
		}),
		nextCookies(),
		organization({
			// Only platform admins (user.role === "admin") may create organizations
			// via the server-side platform admin API. Regular users cannot.
			allowUserToCreateOrganization: false,
			sendInvitationEmail: async (data) => {
				await sendOrgInvitationEmail(data);
			},
			organizationHooks: {},
			ac: organizationAc.ac,
			roles: {
				member: organizationAc.member,
				admin: organizationAc.admin,
				owner: organizationAc.owner,
			},
		}),
	],
});

export type Session = typeof auth.$Infer.Session;
