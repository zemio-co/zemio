"use client";

import { formatDistanceToNow } from "date-fns";
import { de } from "date-fns/locale";
import React from "react";

type UpdateTimerFormatter = (date: Date) => string;

interface UseUpdateTimerProps {
	initialDate?: Date;
	format?: UpdateTimerFormatter;
	delay?: number;
}

const defaultFormatter: UpdateTimerFormatter = (date) => {
	return formatDistanceToNow(date, {
		addSuffix: true,
		includeSeconds: true,
		locale: de,
	});
};

function useUpdateTimer(props?: UseUpdateTimerProps) {
	const {
		format = defaultFormatter,
		initialDate = new Date(),
		delay = 5000,
	} = props || {};

	const ref = React.useRef(initialDate);
	const [label, setLabel] = React.useState<string>(() => format(ref.current));

	// Reset function to update the ref and refresh the label immediately
	const reset = React.useCallback(
		(newDate = new Date()) => {
			ref.current = newDate;
			setLabel(format(ref.current));
		},
		[format],
	);

	React.useEffect(() => {
		setLabel(format(ref.current));

		const interval = setInterval(() => {
			setLabel(format(ref.current));
		}, delay);

		return () => clearInterval(interval);
	}, [format, delay]);

	return {
		startDate: ref.current,
		label,
		reset,
	};
}

export { useUpdateTimer };
