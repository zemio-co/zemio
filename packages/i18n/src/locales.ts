import de from "../messages/de.json";
import en from "../messages/en.json";

export const locales = ["de"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "de";

const messagesByFileLocale = { de, en };

export type Messages = typeof de;

export function getMessages(locale: Locale): Messages {
	return messagesByFileLocale[locale];
}
