import { prismaAdapter } from "@better-auth/prisma-adapter";
import { createAuthMiddleware } from "better-auth/api";
import { betterAuth } from "better-auth/minimal";
import { nextCookies } from "better-auth/next-js";
import {
	admin as adminPlugin,
	magicLink,
	organization,
} from "better-auth/plugins";
import { env } from "@/env";
import { logger } from "@/lib/logger";
import { ROUTES } from "@/lib/routes";
import { sendOrgInvitationEmail } from "@/server/better-auth/invitations";
import { sendMagicLinkEmail } from "@/server/better-auth/magic-link";
import {
	decodeMicrosoftIdToken,
	isDomainVerifiedWorkAccount,
} from "@/server/better-auth/microsoft";
import { isHeldByUnprovenAccount } from "@/server/better-auth/unproven-account";
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

			/**
			 * What Microsoft's word on an address is worth: proof when the tenant
			 * verified the domain, nothing otherwise (ADR-0010).
			 *
			 * Replaces the provider's own reading of `email_verified` and
			 * `verified_primary_email`. Better Auth reads this when deciding
			 * whether a Microsoft sign-in may link to an existing user with the
			 * same address, so it is what keeps somebody with a tenant of their
			 * own from signing in to a victim's account (see `accountLinking`).
			 */
			mapProfileToUser: (profile) => ({
				emailVerified: isDomainVerifiedWorkAccount(profile, profile.email ?? ""),
			}),
		},
	},

	/**
	 * A Microsoft sign-in joins an existing user with the same address only on
	 * proof from both sides: Zemio verified the user's address, and the token
	 * proves its own (`mapProfileToUser` above). Anything less is refused with
	 * `account_not_linked`, which the sign-in page explains.
	 *
	 * Microsoft is deliberately not a trusted provider. Trusting it skips the
	 * token-side proof, and the `email` claim is set by the tenant, so anybody
	 * with a tenant could sign in to anybody's account.
	 */
	account: {
		accountLinking: {
			enabled: true,
			requireLocalEmailVerified: true,
		},
	},

	hooks: {
		/**
		 * Refuses a magic link to an address held by an unverified user with a
		 * sign-in already attached (see `isHeldByUnprovenAccount`), before the
		 * plugin would verify that user and sign the mailbox owner into it.
		 *
		 * Decided when the link is opened, not when it is requested: refusing
		 * the request would tell anybody who types an address whether such a
		 * user exists, while whoever opens the link has proved the mailbox. The
		 * token is read, not consumed, so a refused link stays refused.
		 *
		 * Always back to `/auth`, never to the link's `errorCallbackURL`: this
		 * runs before the plugin checks that URL's origin.
		 */
		before: createAuthMiddleware(async (ctx) => {
			if (ctx.path !== "/magic-link/verify") return;

			const token = ctx.query?.token;
			if (typeof token !== "string") return;

			// Missing or expired tokens are the plugin's to answer.
			const verification =
				await ctx.context.internalAdapter.findVerificationValue(token);
			if (!verification) return;

			let email: unknown;
			try {
				email = (JSON.parse(verification.value) as { email?: unknown }).email;
			} catch {
				return;
			}
			if (typeof email !== "string") return;
			if (!(await isHeldByUnprovenAccount(db, email))) return;

			const errorURL = new URL(ROUTES.AUTH(), ctx.context.baseURL);
			errorURL.searchParams.set("error", "account_pending_verification");
			throw ctx.redirect(errorURL.toString());
		}),
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
				 * rather than assertion: the session hook below, for an address on
				 * a domain the person's work or school tenant has verified
				 * (ADR-0010), and the magic-link plugin, for an address whose mail
				 * the person just read.
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
							orderBy: { updatedAt: "desc" },
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

					const claims = msAccount?.idToken
						? decodeMicrosoftIdToken(msAccount.idToken)
						: null;
					const tenantIdFromToken =
						typeof claims?.tid === "string" ? claims.tid : null;

					// Fall back to the value stored on the user record from a
					// previous login (covers sessions where the idToken is unavailable).
					const resolvedTenantId =
						tenantIdFromToken ?? user?.microsoftTenantId ?? null;

					// A tenant that verified the address's domain has already done
					// what a verification mail does (ADR-0010). Decided here rather
					// than in the user-create hook because that hook runs before
					// Better Auth has written the account row this id_token is read
					// from.
					//
					// Read from the token only, never from the stored tenant: a tenant
					// is not proof of an address, and the claim that is proof is not
					// kept anywhere else. Nobody is un-verified when the token is
					// unavailable — this only ever sets the flag.
					const verifiedByTenant =
						user?.emailVerified === false &&
						claims !== null &&
						isDomainVerifiedWorkAccount(claims, user.email);

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
