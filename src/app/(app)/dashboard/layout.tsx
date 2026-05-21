import { DashboardLayout } from "@/modules/dashboard";

export default async function ServerLayout(props: LayoutProps<"/dashboard">) {
	return <DashboardLayout>{props.children}</DashboardLayout>;
}
