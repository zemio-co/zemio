import { prismaAdapter } from "@better-auth/prisma-adapter";
import { betterAuth } from "better-auth/minimal";
import { nextCookies } from "better-auth/next-js";
import { admin as adminPlugin, organization } from "better-auth/plugins";
import { env } from "@/env";
import { logger } from "@/lib/logger";
import { sendOrgInvitationEmail } from "@/server/better-auth/invitations";
import { sendEmailVerification } from "@/server/better-auth/verification";
import { db } from "@/server/db";
import { CURRENT_LEGAL_RELEASE } from "@/server/legal";
import {
	applyAutoJoins,
	resolveSessionOrganization,
} from "@/server/modules/joining";
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
	// Explicit secret with a build-time fallback so Docker builds (which run without
	// secrets) don't throw during Next.js module evaluation. At runtime the real
	// BETTER_AUTH_SECRET env var is always present.
	secret:
		process.env.BETTER_AUTH_SECRET ??
		"docker-build-placeholder-not-used-at-runtime",
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

	/**
	 * An address is verified by Zemio or not at all (ADR-0008).
	 *
	 * Asked for lazily rather than at every first login: most people arrive
	 * through a tenant joining rule, which reads `tid` and needs no verified
	 * address, so making everyone verify on day one would tax the common path
	 * to protect the rare one.
	 */
	emailVerification: {
		sendVerificationEmail: async ({ user, url }) => {
			await sendEmailVerification({ to: user.email, verifyUrl: url });
		},
		expiresIn: 60 * 60 * 24,
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
				/**
				 * An address is verified by Zemio or not at all (ADR-0008).
				 *
				 * Better Auth's Entra provider will happily set `emailVerified`
				 * from the provider's own claims — `email_verified`, or the
				 * address appearing in `verified_primary_email` /
				 * `verified_secondary_email`, which a personal Microsoft account
				 * does return. Left alone, such an account would arrive already
				 * verified and pass both the invitation gate and organization
				 * creation without Zemio ever sending a mail.
				 *
				 * Microsoft's own documentation says the email claim "isn't
				 * guaranteed to be correct" and must never be used for
				 * authorization, so this is not distrust of one provider: no
				 * assertion verifies an address, whoever makes it.
				 */
				before: async (user) => ({
					data: { ...user, emailVerified: false },
				}),
				after: async (user) => {
					await Promise.all([
						db.preferences.create({
							data: {
								userId: user.id,
								notifications: "ALL",
							},
						}),
						db.legalAcceptance.create({
							data: {
								userId: user.id,
								releaseVersion: CURRENT_LEGAL_RELEASE.version,
								acceptanceType: "IMPLICIT_ON_SIGNUP",
								documentVersions: CURRENT_LEGAL_RELEASE.version,
								acceptedAt: new Date(),
							},
						}),
					]);
				},
			},
		},
		session: {
			create: {
				after: async (session) => {
					logger.info("auth.session_created", { userId: session.userId });
					void logger.flush();
				},
				before: async (session) => {
					// Resolve the user's Microsoft Entra ID tenant from the stored
					// idToken. The idToken is written to the account record by
					// better-auth during the OAuth callback, so it is always present
					// by the time this session hook runs.
					const [msAccount, user] = await Promise.all([
						db.account.findFirst({
							where: { userId: session.userId, providerId: "microsoft" },
							select: { idToken: true },
						}),
						db.user.findUnique({
							where: { id: session.userId },
							select: {
								email: true,
								emailVerified: true,
								microsoftTenantId: true,
							},
						}),
					]);

					const tenantIdFromToken = msAccount?.idToken
						? extractMicrosoftTenantId(msAccount.idToken)
						: null;

					// Fall back to the value stored on the user record from a
					// previous login (covers sessions where the idToken is unavailable).
					const resolvedTenantId =
						tenantIdFromToken ?? user?.microsoftTenantId ?? null;

					if (tenantIdFromToken) {
						// Persist the tenant ID on the user for future sessions.
						await db.user.update({
							where: { id: session.userId },
							data: { microsoftTenantId: tenantIdFromToken },
						});
					}

					if (user) {
						// Joining rules decide who is admitted, not this hook. A `tid`
						// needs no verified address and an email domain does, and that
						// asymmetry belongs in one place (ADR-0008).
						await applyAutoJoins(db, session.userId, {
							email: user.email,
							emailVerified: user.emailVerified,
							microsoftTenantId: resolvedTenantId,
						});
					}

					return {
						data: {
							...session,
							activeOrganizationId: await resolveSessionOrganization(
								db,
								session.userId,
							),
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
		organization({
			// The public create endpoint is closed to everyone. Organizations are
			// created either by a platform admin or through `organization.
			// createSelfServe`, both of which reach Better Auth as system actions
			// — so the eligibility rules cannot be stepped around by posting here
			// directly.
			allowUserToCreateOrganization: false,

			// An invitation is a grant addressed to an email, so accepting one
			// requires that Zemio has proved the address (ADR-0008).
			requireEmailVerificationOnInvitation: true,
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
		nextCookies(),
	],
});

export type Session = typeof auth.$Infer.Session;
