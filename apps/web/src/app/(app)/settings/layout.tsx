import { SettingsLayout } from "@/modules/settings";

export default async function ServerLayout({
	children,
}: LayoutProps<"/settings">) {
	return <SettingsLayout>{children}</SettingsLayout>;
}
