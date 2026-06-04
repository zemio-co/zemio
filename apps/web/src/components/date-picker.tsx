"use client";

import { formatDate as formatDateFn } from "date-fns";
import { CalendarIcon } from "lucide-react";
import React from "react";
import { de } from "react-day-picker/locale";
import { Calendar } from "./ui/calendar";
import type { Input } from "./ui/input";
import {
	InputGroup,
	InputGroupAddon,
	InputGroupButton,
	InputGroupInput,
} from "./ui/input-group";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";

function formatDate(date: Date | undefined): string {
	if (!date) return "";

	return formatDateFn(date, "dd.MM.yyyy");
}

function isValidDate(date: Date | undefined): boolean {
	if (!date) return false;

	return !Number.isNaN(date.getTime());
}

export function DatePicker({
	onChange,
	value: controlledValue,
	...props
}: React.ComponentProps<typeof Input>) {
	const [open, setOpen] = React.useState(false);
	const [date, setDate] = React.useState<Date | undefined>(new Date());
	const [month, setMonth] = React.useState<Date | undefined>(date);
	const [value, setValue] = React.useState(controlledValue);

	return (
		<InputGroup>
			<InputGroupInput
				onChange={(e) => {
					const date = new Date(e.target.value);
					setValue(e.target.value);
					onChange?.(e);
					if (isValidDate(date)) {
						setDate(date);
						setMonth(date);
					}
				}}
				onKeyDown={(e) => {
					if (e.key === "ArrowDown") {
						e.preventDefault();
						setOpen(true);
					}
					if (e.key === "Escape") {
						setOpen(false);
					}
				}}
				value={value}
				{...props}
			/>
			<InputGroupAddon align="inline-end">
				<Popover onOpenChange={setOpen} open={open}>
					<PopoverTrigger
						render={
							<InputGroupButton variant={"ghost"}>
								<CalendarIcon />
								<span className="sr-only">Open calendar</span>
							</InputGroupButton>
						}
					/>
					<PopoverContent
						align="end"
						alignOffset={-8}
						className="w-auto overflow-hidden p-0"
						sideOffset={10}
					>
						<Calendar
							captionLayout="dropdown"
							locale={de}
							mode="single"
							month={month}
							onMonthChange={setMonth}
							onSelect={(date) => {
								setDate(date);
								setValue(formatDate(date));
								setMonth(date);
								onChange?.({
									target: {
										value: formatDate(date),
									},
								} as React.ChangeEvent<HTMLInputElement>);
							}}
							selected={date}
						/>
					</PopoverContent>
				</Popover>
			</InputGroupAddon>
		</InputGroup>
	);
}
