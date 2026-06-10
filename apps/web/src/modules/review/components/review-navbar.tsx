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
import { toast } from "sonner";
import { Navbar, NavbarSidebarTrigger } from "@/components/navbar";
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
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
import { Skeleton } from "@/components/ui/skeleton";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { ROUTES } from "@/lib/routes";
import { cn } from "@/lib/utils";
import { api } from "@/trpc/react";

type ReviewNavbarReport = {
	id: string;
	readableId: string;
	iban: string;
	name: string;
	sum: number;
	title: string;
};

function ReviewNavbar({
	className,
	reportId,
	...props
}: React.ComponentProps<"nav"> & {
	reportId: string;
}) {
	const {
		data: report,
		error,
		isPending,
	} = api.admin.getReview.useQuery({ id: reportId });

	if (isPending) {
		return (
			<Navbar className={cn("", className)} {...props}>
				<div className="container flex max-w-none items-center justify-start gap-4 py-4">
					<NavbarSidebarTrigger />
					<Breadcrumb>
						<BreadcrumbList>
							<BreadcrumbItem>
								<BreadcrumbLink
									render={<Link href={ROUTES.ADMIN_REVIEW_OVERVIEW()}>Admin</Link>}
								/>
							</BreadcrumbItem>
							<BreadcrumbSeparator />
							<BreadcrumbItem>
								<BreadcrumbLink
									render={<Link href={ROUTES.ADMIN_REVIEW_OVERVIEW()}>Reports</Link>}
								/>
							</BreadcrumbItem>
							<BreadcrumbSeparator />
							<BreadcrumbItem>
								<Skeleton className="h-4 w-16" />
							</BreadcrumbItem>
						</BreadcrumbList>
					</Breadcrumb>
					<Navigation className="ml-auto" />
				</div>
			</Navbar>
		);
	}

	if (error || !report) {
		return null;
	}

	const navbarReport: ReviewNavbarReport = {
		iban: report.bankingSummary.iban,
		id: report.report.id,
		name: report.bankingSummary.ownerName,
		readableId: report.report.readableId,
		sum: report.totalAmount,
		title: report.report.title,
	};

	return (
		<Navbar className={cn("", className)} {...props}>
			<div className="container flex max-w-none items-center justify-start gap-4 py-4">
				<NavbarSidebarTrigger />
				<Breadcrumb>
					<BreadcrumbList>
						<BreadcrumbItem>
							<BreadcrumbLink
								render={<Link href={ROUTES.ADMIN_REVIEW_OVERVIEW()}>Admin</Link>}
							/>
						</BreadcrumbItem>
						<BreadcrumbSeparator />
						<BreadcrumbItem>
							<BreadcrumbLink
								render={<Link href={ROUTES.ADMIN_REVIEW_OVERVIEW()}>Reports</Link>}
							/>
						</BreadcrumbItem>
						<BreadcrumbSeparator />
						<BreadcrumbItem>
							<BreadcrumbPage>#{navbarReport.readableId}</BreadcrumbPage>
						</BreadcrumbItem>
					</BreadcrumbList>
				</Breadcrumb>
				<MoreMenu report={navbarReport} />
				<Navigation className="ml-auto" />
			</div>
		</Navbar>
	);
}

function MoreMenu({ report }: { report: ReviewNavbarReport }) {
	const copyActions = React.useMemo(() => {
		return [
			{
				id: "id",
				icon: FingerprintIcon,
				title: "ID",
				value: report.id,
			},
			{
				id: "iban",
				icon: CreditCardIcon,
				title: "IBAN",
				value: report.iban,
			},
			{
				id: "name",
				icon: UserIcon,
				title: "Kontoname",
				value: report.name,
			},
			{
				id: "sum",
				icon: CalculatorIcon,
				title: "Summe",
				value: report.sum,
			},
			{
				id: "title",
				icon: TextIcon,
				title: "Titel",
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
									toast.success(`${action.title} wurde zum Clipboard kopiert`);
								}}
							>
								<Icon /> {action.title} kopieren
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
