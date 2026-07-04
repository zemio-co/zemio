import { SettingsRoutesLayout } from "@/modules/settings";

export default async function ServerLayout(props: LayoutProps<"/settings">) {
	return <SettingsRoutesLayout>{props.children}</SettingsRoutesLayout>;
}
