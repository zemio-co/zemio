import {
	createTranslator,
	type NamespaceKeys,
	type NestedKeyOf,
} from "use-intl/core";
import {
	defaultLocale,
	getMessages,
	type Locale,
	type Messages,
} from "./locales";

/**
 * Resolves translated strings outside a React tree (emails, PDF generation,
 * apps/api) where next-intl's request-scoped hooks aren't available.
 */
export function createAppTranslator<
	const Namespace extends NamespaceKeys<Messages, NestedKeyOf<Messages>> = never,
>({
	locale = defaultLocale,
	namespace,
}: {
	locale?: Locale;
	namespace?: Namespace;
}) {
	return createTranslator<Messages, Namespace>({
		locale,
		messages: getMessages(locale),
		namespace,
	});
}
