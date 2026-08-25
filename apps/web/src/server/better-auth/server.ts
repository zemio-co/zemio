import { prismaAdapter } from "@better-auth/prisma-adapter";
import { betterAuth } from "better-auth/minimal";
import { nextCookies } from "better-auth/next-js";
import {
	admin as adminPlugin,
	magicLink,
	organization,
} from "better-auth/plugins";
import { env } from "@/env";
import { logger } from "@/lib/logger";
import { sendOrgInvitationEmail } from "@/server/better-auth/invitations";
import { sendMagicLinkEmail } from "@/server/better-auth/magic-link";
import {
	extractMicrosoftTenantId,
	isWorkAccountTenant,
} from "@/server/better-auth/microsoft";
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

/** The tenant recorded on a user by a previous login, if any. */
async function tenantIdOf(userId: string): Promise<string | null> {
	const user = await db.user.findUnique({
		where: { id: userId },
		select: { microsoftTenantId: true },
	});

	return user?.microsoftTenantId ?? null;
}

/**
 * Opens a freshly joined organization in the sessions already running.
 *
 * The session hook that chooses an active organization runs when a session is
 * *created*, and verification happens inside one that already exists. Without
 * this, someone who verifies and is auto-joined is redirected out of onboarding
 * into an application whose every organization-scoped call refuses them for
 * having no active organization — until they log out and back in.
 *
 * Only sessions with no organization are touched, so this never moves someone
 * who is already working somewhere. The user record is updated on the same
 * terms, so the next login lands in the same place.
 */
async function openJoinedOrganization(userId: string): Promise<void> {
	const organizationId = await resolveSessionOrganization(db, userId);
	if (!organizationId) return;

	await db.$transaction([
		db.session.updateMany({
			where: { userId, activeOrganizationId: null },
			data: { activeOrganizationId: organizationId },
		}),
		db.user.updateMany({
			where: { id: userId, lastActiveOrganizationId: null },
			data: { lastActiveOrganizationId: organizationId },
		}),
	]);
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

		/**
		 * Verifying an address can open an organization to this person, and the
		 * session hook that would notice only runs when a session is created.
		 * Without this, an `EMAIL_DOMAIN` rule takes effect at their next login
		 * rather than the moment they proved the address.
		 *
		 * Best-effort: the address is verified either way, and the next login
		 * resolves the same rules. Failing here would report verification as
		 * failed for something that succeeded.
		 */
		afterEmailVerification: async (user) => {
			try {
				const joined = await applyAutoJoins(db, user.id, {
					email: user.email,
					emailVerified: true,
					microsoftTenantId: await tenantIdOf(user.id),
				});

				if (joined.length === 0) return;

				await openJoinedOrganization(user.id);
			} catch (error) {
				logger.error("Could not resolve joining rules after verification", {
					userId: user.id,
					error,
				});
			}
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
				 *
				 * Two things undo this immediately afterwards, and both are proof
				 * rather than assertion: the session hook below, for an address a
				 * work or school tenant administers (ADR-0010), and the magic-link
				 * plugin, for an address whose mail the person just read.
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

					// A work or school tenant has already done what a verification
					// mail does: an administrator created the address and proved the
					// domain to Microsoft (ADR-0010). Decided here rather than in the
					// user-create hook because that hook runs before Better Auth has
					// written the account row this id_token is read from.
					//
					// `resolvedTenantId` rather than the freshly read claim: the
					// stored value has the same provenance — this code put it there,
					// from a token Better Auth had verified — and a login where the
					// id_token is unavailable should not un-verify anybody.
					const verifiedByTenant =
						user?.emailVerified === false && isWorkAccountTenant(resolvedTenantId);

					if (tenantIdFromToken || verifiedByTenant) {
						await db.user.update({
							where: { id: session.userId },
							data: {
								// Persist the tenant ID on the user for future sessions.
								...(tenantIdFromToken && { microsoftTenantId: tenantIdFromToken }),
								...(verifiedByTenant && { emailVerified: true }),
							},
						});
					}

					if (user) {
						// Joining rules decide who is admitted, not this hook. A `tid`
						// needs no verified address and an email domain does, and that
						// asymmetry belongs in one place (ADR-0008).
						await applyAutoJoins(db, session.userId, {
							email: user.email,
							emailVerified: user.emailVerified || verifiedByTenant,
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

		/**
		 * Signing in with an address and no password.
		 *
		 * The second way in, beside Microsoft. Opening the link proves the
		 * mailbox, so the plugin marks the address verified — which is the same
		 * proof `sendVerificationEmail` asks for, arriving one step earlier
		 * (ADR-0008). Sign-up is left open: an initiative's treasurer with no
		 * Microsoft account is exactly who self-serve onboarding is for.
		 */
		magicLink({
			expiresIn: 60 * 15,
			sendMagicLink: async ({ email, url }) => {
				await sendMagicLinkEmail({ to: email, signInUrl: url });
			},
		}),

		nextCookies(),
	],
});

export type Session = typeof auth.$Infer.Session;
