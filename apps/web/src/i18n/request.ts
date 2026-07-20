import { defaultLocale, getMessages } from "@zemio/i18n";
import { getRequestConfig } from "next-intl/server";

export default getRequestConfig(async () => {
	const locale = defaultLocale;

	return {
		locale,
		messages: getMessages(locale),
	};
});
