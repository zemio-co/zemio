import type { Locale } from "@zemio/i18n";
import type { Locale as DateFnsLocale } from "date-fns";
import { de } from "date-fns/locale";
import { useLocale } from "next-intl";

const dateFnsLocales: Record<Locale, DateFnsLocale> = { de };

/** Maps the active next-intl locale to its date-fns locale object. */
export function useDateFnsLocale(): DateFnsLocale {
	const locale = useLocale();
	return locale in dateFnsLocales
		? dateFnsLocales[locale as Locale]
		: dateFnsLocales.de;
}
