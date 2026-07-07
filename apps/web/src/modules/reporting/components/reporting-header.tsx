"use client";

import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import type * as React from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Field } from "@/components/ui/field";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { useReportingStore } from "../state/reporting.store";

function ReportingHeader({
	className,
	...props
}: React.ComponentProps<"section">) {
	return (
		<section
			className={cn("container", className)}
			data-slot="reporting-header"
			{...props}
		>
			<div className="flex flex-wrap justify-between gap-4">
				<h1 className="font-semibold text-2xl text-slate-800">Reporting</h1>
				<div className="flex items-center justify-center gap-4">
					<DatePickerWithRange />
					<Button>Exportieren</Button>
				</div>
			</div>

			<Separator className={"mt-4"} />
		</section>
	);
}

export function DatePickerWithRange() {
	const dates = useReportingStore((state) => state.dates);
	const setDates = useReportingStore((state) => state.setDates);

	return (
		<Field className="w-60">
			<Popover>
				<PopoverTrigger
					render={
						<Button
							className="justify-start px-2.5 font-normal"
							disableAnimation
							id="date-picker-range"
							variant="outline"
						>
							<CalendarIcon data-icon="inline-start" />
							{dates?.start ? (
								dates.end ? (
									<>
										{format(dates.start, "LLL dd, y")} - {format(dates.end, "LLL dd, y")}
									</>
								) : (
									format(dates.start, "LLL dd, y")
								)
							) : (
								<span>Pick a date</span>
							)}
						</Button>
					}
				/>
				<PopoverContent align="start" className="w-auto p-0">
					<Calendar
						defaultMonth={dates?.start}
						mode="range"
						numberOfMonths={2}
						onSelect={(dates) => {
							if (!dates?.from || !dates.to) {
								return;
							}

							setDates({
								start: dates?.from,
								end: dates?.to,
							});
						}}
						selected={{ from: dates.start, to: dates.end }}
					/>
				</PopoverContent>
			</Popover>
		</Field>
	);
}

export { ReportingHeader };
