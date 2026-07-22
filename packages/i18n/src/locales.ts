import de from "../messages/de.json";

export const locales = ["de"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "de";

const messagesByFileLocale = { de };

export type Messages = typeof de;

export function getMessages(locale: Locale): Messages {
	return messagesByFileLocale[locale];
}
