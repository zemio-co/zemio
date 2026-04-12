"use client";

import {
	ArrowDownIcon,
	ArrowUpIcon,
	CalculatorIcon,
	CreditCardIcon,
	FingerprintIcon,
	MoreHorizontalIcon,
	TextIcon,
	UserIcon,
} from "lucide-react";
import Link from "next/link";
import React from "react";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Kbd } from "@/components/ui/kbd";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

function ReviewNavbar({
	className,
	report,
	...props
}: React.ComponentProps<"nav"> & {
	report: {
		id: string;
		readableId: string;
		iban: string;
		name: string;
		sum: number;
		title: string;
	};
}) {
	return (
		<nav className={cn("w-full border-b", className)} {...props}>
			<div className="mx-auto flex h-12 w-full max-w-7xl items-center justify-start gap-4 px-8 py-4">
				<div className="flex w-fit items-center justify-center gap-3">
					<Link className="font-medium text-sm text-zinc-600" href={"#"}>
						Reports
					</Link>
					<p className="font-medium text-xs text-zinc-400">/</p>
					<Link className="font-medium text-sm text-zinc-800" href={"#"}>
						#{report.readableId}
					</Link>
				</div>
				<MoreMenu report={report} />
				<Navigation className="ml-auto" />
			</div>
		</nav>
	);
}

function MoreMenu({
	report,
}: {
	report: {
		id: string;
		readableId: string;
		iban: string;
		name: string;
		sum: number;
		title: string;
	};
}) {
	const copyActions = React.useMemo(() => {
		return [
			{
				id: "id",
				icon: FingerprintIcon,
				title: "Copy ID",
				value: report.id,
			},
			{
				id: "iban",
				icon: CreditCardIcon,
				title: "Copy IBAN",
				value: report.iban,
			},
			{
				id: "name",
				icon: UserIcon,
				title: "Copy Kontoname",
				value: report.name,
			},
			{
				id: "sum",
				icon: CalculatorIcon,
				title: "Copy Summe",
				value: report.sum,
			},
			{
				id: "title",
				icon: TextIcon,
				title: "Copy Titel",
				value: report.title,
			},
		];
	}, [report]);

	return (
		<DropdownMenu>
			<DropdownMenuTrigger
				render={
					<Button size={"icon-sm"} variant={"ghost"}>
						<MoreHorizontalIcon />
					</Button>
				}
			/>
			<DropdownMenuContent className="md:min-w-48">
				<DropdownMenuGroup>
					{copyActions.map(({ icon: Icon, ...action }) => {
						return (
							<DropdownMenuItem
								key={action.id}
								onClick={() => {
									navigator.clipboard.writeText(action.value.toString());
								}}
							>
								<Icon /> {action.title}
							</DropdownMenuItem>
						);
					})}
				</DropdownMenuGroup>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

function Navigation({ ...props }: React.ComponentProps<typeof ButtonGroup>) {
	return (
		<ButtonGroup {...props}>
			<Tooltip>
				<TooltipTrigger
					render={
						<Button size={"icon-sm"} variant={"outline"}>
							<ArrowDownIcon />
						</Button>
					}
				/>
				<TooltipContent>
					<span>Navigate down</span>
					<Kbd className="ms-2">J</Kbd>
				</TooltipContent>
			</Tooltip>
			<Tooltip>
				<TooltipTrigger
					render={
						<Button size={"icon-sm"} variant={"outline"}>
							<ArrowUpIcon />
						</Button>
					}
				/>
				<TooltipContent>
					<span>Navigate up</span>
					<Kbd className="ms-2">K</Kbd>
				</TooltipContent>
			</Tooltip>
		</ButtonGroup>
	);
}

export { ReviewNavbar };
