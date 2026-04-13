import { redirect } from "next/navigation";
import { ROUTES } from "@/lib/consts";

/**
 * The onboarding page (manual org creation) is no longer available.
 * Organizations are created by platform admins only and users are
 * auto-assigned based on their Microsoft Entra ID tenant.
 */
export default function OnboardingPage() {
	redirect(ROUTES.USER_DASHBOARD);
}
