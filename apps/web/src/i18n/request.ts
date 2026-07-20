import { defaultLocale, getMessages, type Locale, locales } from "@zemio/i18n";
import { cookies, headers } from "next/headers";
import { getRequestConfig } from "next-intl/server";
import { auth } from "@/server/better-auth/server";
import { db } from "@/server/db";

const LOCALE_COOKIE = "NEXT_LOCALE";

function isSupportedLocale(value: string | undefined): value is Locale {
	return locales.includes(value as Locale);
}

// Next.js only allows writing cookies from a Server Action or Route Handler,
// not while resolving request config during render — so this only reads the
// cookie. It gets written once the locale-switcher mutation (Server Action)
// is added; until then every cookie-less request falls back to the DB.
async function resolveLocale(): Promise<Locale> {
	const cookieStore = await cookies();
	const cookieLocale = cookieStore.get(LOCALE_COOKIE)?.value;
	if (isSupportedLocale(cookieLocale)) {
		return cookieLocale;
	}

	const session = await auth.api.getSession({ headers: await headers() });
	if (!session) {
		return defaultLocale;
	}

	const preferences = await db.preferences.findUnique({
		where: { userId: session.user.id },
		select: { locale: true },
	});

	return isSupportedLocale(preferences?.locale)
		? preferences.locale
		: defaultLocale;
}

export default getRequestConfig(async () => {
	const locale = await resolveLocale();

	return {
		locale,
		messages: getMessages(locale),
	};
});
