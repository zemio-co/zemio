import type { Messages } from "@zemio/i18n";

declare module "next-intl" {
	interface AppConfig {
		Messages: Messages;
	}
}
