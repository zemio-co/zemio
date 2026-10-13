"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { ROUTES } from "@/lib/routes";
import { cn } from "@/lib/utils";
import { useSwitchOrganization } from "@/modules/shared";

/**
 * Opens one particular organization's billing page, whichever organization the
 * session is working in.
 *
 * A link to `/settings/org/billing` opens the *active* organization's billing,
 * and an owner of several reading "your trial for Robotics ends in three days"
 * may be working in another one — where they would be shown the wrong
 * organization's billing, or turned away if they do not run it. So the link
 * names its organization and lands here, which switches to it and then
 * reloads into the ordinary billing page, where the owner check runs against
 * the right organization.
 *
 * The switch is Better Auth's, which refuses an organization the person is not
 * a member of; the id in the link grants nothing by itself. Started once per
 * mount — a ref, so React's development double-invocation of effects does not
 * start a second switch and read its refusal as a failure.
 */
function OrgSettingsBillingOpen({
	className,
	organizationId,
	...props
}: React.ComponentProps<"div"> & { organizationId: string }) {
	const t = useTranslations("modules.settings.billing.open");
	const switchOrganization = useSwitchOrganization();
	const started = useRef(false);
	const [failed, setFailed] = useState(false);

	useEffect(() => {
		if (started.current) return;
		started.current = true;

		void switchOrganization(organizationId).then((switched) => {
			if (switched) {
				// A full load rather than a push: the layouts above the billing page
				// read the active organization on the server.
				window.location.replace(ROUTES.SETTINGS_ORG_BILLING());
				return;
			}

			setFailed(true);
		});
	}, [organizationId, switchOrganization]);

	return (
		<div
			className={cn("px-6 py-10 text-base-600 text-sm", className)}
			data-slot="org-settings-billing-open"
			{...props}
		>
			{failed ? (
				<p role="alert">
					{t("failed")}{" "}
					<Link
						className="font-medium text-accent-600"
						href={ROUTES.USER_DASHBOARD()}
					>
						{t("back")}
					</Link>
				</p>
			) : (
				<p aria-live="polite">{t("opening")}</p>
			)}
		</div>
	);
}

export { OrgSettingsBillingOpen };
