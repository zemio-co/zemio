"use client";

import { useEffect, useState } from "react";
import { msUntilTrialDaysChange, trialDaysRemaining } from "@/lib/billing";

/**
 * Whole days left of a trial, kept current while the page stays open.
 *
 * Computed during render, exactly as a one-off read would be, so the server's
 * render and the hydrating one agree. What this adds is a timer to the next
 * instant the count changes — at most a day away — so a tab left open does not
 * keep showing yesterday's number, or "1 day left" after the trial has ended.
 * It also re-renders when the tab becomes visible again, because a timer does
 * not run while a laptop sleeps.
 */
export function useTrialDaysRemaining(end: Date | null): number | null {
	const endTime = end?.getTime() ?? null;
	const [, rerender] = useState(0);

	useEffect(() => {
		if (endTime === null) return;

		let timer: ReturnType<typeof setTimeout> | undefined;

		// Each step schedules the next, counted from when it actually fired.
		const refresh = () => {
			clearTimeout(timer);
			rerender((value) => value + 1);

			const ms = msUntilTrialDaysChange(new Date(endTime), new Date());
			timer = ms === null ? undefined : setTimeout(refresh, ms);
		};

		const ms = msUntilTrialDaysChange(new Date(endTime), new Date());
		timer = ms === null ? undefined : setTimeout(refresh, ms);

		const onVisible = () => {
			if (document.visibilityState === "visible") refresh();
		};
		document.addEventListener("visibilitychange", onVisible);

		return () => {
			clearTimeout(timer);
			document.removeEventListener("visibilitychange", onVisible);
		};
	}, [endTime]);

	return endTime === null
		? null
		: trialDaysRemaining(new Date(endTime), new Date());
}
