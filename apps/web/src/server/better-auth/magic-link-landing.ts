import { ROUTES } from "@/lib/routes";

/**
 * The query parameters Better Auth puts on a magic link, which the landing
 * page hands on to the verify endpoint unchanged.
 */
export const MAGIC_LINK_PARAMS = [
	"token",
	"callbackURL",
	"newUserCallbackURL",
	"errorCallbackURL",
] as const;

/**
 * The link to email for a magic-link sign-in, given the one Better Auth built.
 *
 * Better Auth's link opens its verify endpoint, which consumes the single-use
 * token on the first request it receives. Mail security scanners — Microsoft
 * Defender's Safe Links among them, and the people Zemio is for are largely on
 * Microsoft 365 — fetch every link in a message before it is delivered, so the
 * token was spent before the person ever clicked and they landed on "invalid
 * token".
 *
 * So the mail links to a page of Zemio's instead, with the same query, and the
 * page's button opens the endpoint. Scanners fetch links; they do not submit
 * forms. Only the path changes: the token and the callbacks travel exactly as
 * Better Auth wrote them, so the endpoint, its origin checks and the checks
 * hooked onto it are untouched.
 */
export function magicLinkLandingUrl(verifyUrl: string): string {
	const url = new URL(verifyUrl);
	url.pathname = ROUTES.AUTH_MAGIC_LINK();
	return url.toString();
}
