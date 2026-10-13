"use client";

import { useRef } from "react";
import { authClient } from "@/server/better-auth/client";
import { api } from "@/trpc/react";

/**
 * Makes another of the person's organizations the one they are working in.
 *
 * Two writes, in order. Better Auth's `setActive` moves the session, and it is
 * also the authorization: it refuses an organization the person is not a
 * member of. Only once it has succeeded is the choice remembered on the user,
 * so their next login opens there too — remembering a switch that was refused
 * would send that next login somewhere they never chose. Remembering is
 * best-effort: failing it must not cost them a switch that already happened.
 *
 * One switch at a time. Two in flight can finish out of order and leave the
 * session on one organization and the remembered choice on the other. Guarded
 * by a ref rather than state, because two quick clicks both read the state of
 * the same render. The guard is released on failure so the person can try
 * again; on success it is held, because the caller reloads into the new
 * organization.
 *
 * Resolves to whether the switch happened.
 */
export function useSwitchOrganization() {
	const rememberOrganization = api.user.setLastActiveOrganization.useMutation();
	const switching = useRef(false);

	return async (organizationId: string): Promise<boolean> => {
		if (switching.current) return false;
		switching.current = true;

		try {
			const { error } = await authClient.organization.setActive({
				organizationId,
			});

			if (error) {
				switching.current = false;
				return false;
			}
		} catch {
			switching.current = false;
			return false;
		}

		await rememberOrganization.mutateAsync({ organizationId }).catch(() => {});

		return true;
	};
}
