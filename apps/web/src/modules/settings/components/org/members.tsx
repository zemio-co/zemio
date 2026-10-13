"use client";

import { Dialog as DialogPrimitive } from "@base-ui/react";
import { keepPreviousData } from "@tanstack/react-query";
import {
	type ColumnDef,
	flexRender,
	getCoreRowModel,
	getSortedRowModel,
	type PaginationState,
	useReactTable,
} from "@tanstack/react-table";
import {
	Button,
	DataGridColumnHeader,
	Grid,
	GridBody,
	GridCell,
	GridFooter,
	GridHead,
	GridHeader,
	GridRow,
	getPinningStyles,
} from "@zemio/ui";
import { format } from "date-fns";
import {
	AtSignIcon,
	CalendarPlusIcon,
	ChevronLeftIcon,
	ChevronRightIcon,
	CircleIcon,
	EllipsisIcon,
	IdCardIcon,
	ShieldIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { api } from "@/trpc/react";
import { SettingsSubtitle, SettingsTitle } from "../settings-typography";
import {
	createUpdateMemberHandle,
	type UpdateMemberHandle,
	UpdateMemberSheet,
} from "./update-member";

function OrgSettingsMembers({
	className,
	...props
}: React.ComponentProps<"main">) {
	const t = useTranslations("modules.settings.members");

	return (
		<main
			className={cn("py-16", className)}
			data-slot="org-settings-members"
			{...props}
		>
			<div className="container max-w-4xl space-y-1">
				<SettingsTitle>{t("title")}</SettingsTitle>
				<SettingsSubtitle>{t("description")}</SettingsSubtitle>
			</div>

			<div className="mt-12 max-w-full">
				<MembersGrid />
			</div>
		</main>
	);
}

type Member = {
	id: string;
	role: string;
	createdAt: Date;
	user: { email: string; id: string; name: string; image: string | null };
};

type ColumnTranslator = (
	key: string,
	values?: Record<string, string | number>,
) => string;

function createMembersGridColumns(
	handle: UpdateMemberHandle,
	t: ColumnTranslator,
): ColumnDef<Member>[] {
	return [
		{
			id: "user",
			accessorFn: (original) => original.user.name,
			header: ({ column }) => (
				<DataGridColumnHeader
					column={column}
					icon={IdCardIcon}
					title={t("table.name")}
				/>
			),
			cell: ({ row }) => {
				return (
					<span className="flex items-center justify-start gap-2.5 font-semibold text-slate-800">
						<Avatar size="sm">
							<AvatarImage src={row.original.user.image ?? undefined} />
							<AvatarFallback>
								{row.original.user.name.charAt(0)?.toUpperCase() ?? "X"}
							</AvatarFallback>
						</Avatar>
						{row.original.user.name}
					</span>
				);
			},
		},

		{
			id: "email",
			accessorFn: ({ user }) => {
				return user.email;
			},
			header: ({ column }) => (
				<DataGridColumnHeader
					column={column}
					icon={AtSignIcon}
					title={t("table.email")}
				/>
			),
		},
		{
			id: "Rolle",
			accessorKey: "role",
			header: ({ column }) => (
				<DataGridColumnHeader
					column={column}
					icon={ShieldIcon}
					title={t("table.role")}
				/>
			),
			cell: ({ row }) => {
				const roles = row.original.role.split(",");

				if (roles.includes("owner")) {
					return (
						<Badge className="pl-1.25" variant={"outline"}>
							<CircleIcon className="text-white **:fill-violet-600" />
							{t("roles.owner")}
						</Badge>
					);
				}

				if (roles.includes("admin")) {
					return (
						<Badge className="pl-1.25" variant={"outline"}>
							<CircleIcon className="text-white **:fill-blue-500" />
							{t("roles.admin")}
						</Badge>
					);
				}

				return (
					<Badge className="pl-1.25" variant={"outline"}>
						<CircleIcon className="text-white **:fill-orange-500" />
						{t("roles.member")}
					</Badge>
				);
			},
		},
		{
			id: "createdAt",
			accessorFn: ({ createdAt }) => createdAt,
			cell: ({ row }) => {
				return format(row.original.createdAt, "dd.MM.yyyy, HH:mm");
			},
			header: ({ column }) => (
				<DataGridColumnHeader
					column={column}
					icon={CalendarPlusIcon}
					title={t("table.createdAt")}
				/>
			),
		},
		{
			id: "action",
			cell: ({ row }) => (
				<DialogPrimitive.Trigger
					handle={handle}
					payload={{
						id: row.original.id,
					}}
					render={
						<Button
							className={
								"shadow-none ring-0 group-hover/row:shadow-sm group-hover/row:ring-1"
							}
							size={"icon-sm"}
							variant={"outline"}
						>
							<EllipsisIcon />
						</Button>
					}
				/>
			),
		},
	];
}

function MembersGrid({ className, ...props }: React.ComponentProps<"div">) {
	const t = useTranslations("modules.settings.members");
	const PAGE_SIZE = 20;

	const [pagination, setPagination] = React.useState<PaginationState>({
		pageIndex: 0,
		pageSize: PAGE_SIZE,
	});

	const updateHandleRef = React.useRef<UpdateMemberHandle | null>(null);
	if (!updateHandleRef.current)
		updateHandleRef.current = createUpdateMemberHandle();
	const updateHandle = updateHandleRef.current;

	const columns = React.useMemo(() => {
		return createMembersGridColumns(updateHandle, t as ColumnTranslator);
	}, [updateHandle, t]);

	const dataQuery = api.membership.list.useQuery(
		{
			page: pagination.pageIndex + 1,
			pageSize: pagination.pageSize,
			search: undefined,
		},
		{
			placeholderData: keepPreviousData,
		},
	);

	const table = useReactTable({
		data: dataQuery.data?.members ?? [],
		rowCount: dataQuery.data?.pagination.totalCount,
		columns: columns,
		state: {
			pagination,
		},
		getCoreRowModel: getCoreRowModel(),
		onPaginationChange: setPagination,
		getSortedRowModel: getSortedRowModel(),
		manualPagination: true,
	});

	if (dataQuery.isPending) {
		return null;
	}

	if (dataQuery.error) {
		return <p>{JSON.stringify(dataQuery.error)}</p>;
	}

	const { data } = dataQuery;

	return (
		<div className={cn("", className)} data-slot="cost-units-table" {...props}>
			<div
				className="border-base-200 border-t transition-opacity data-[fetching=true]:opacity-50"
				data-fetching={dataQuery.isFetching}
			>
				<Grid className="w-full">
					<GridHeader>
						{table.getHeaderGroups().map((headerGroup) => (
							<GridRow className="border-b" key={headerGroup.id}>
								{headerGroup.headers.map((header) => {
									return (
										<GridHead
											className="p-0"
											key={header.id}
											style={{ ...getPinningStyles(header.column) }}
										>
											{header.isPlaceholder
												? null
												: flexRender(header.column.columnDef.header, header.getContext())}
										</GridHead>
									);
								})}
							</GridRow>
						))}
					</GridHeader>
					<GridBody>
						{table.getRowModel().rows?.length ? (
							table.getRowModel().rows.map((row) => (
								<GridRow className="group/row" key={row.id}>
									{row.getVisibleCells().map((cell) => (
										<GridCell key={cell.id} style={{ ...getPinningStyles(cell.column) }}>
											{flexRender(cell.column.columnDef.cell, cell.getContext())}
										</GridCell>
									))}
								</GridRow>
							))
						) : (
							<tr>
								<td
									className="h-24 text-center"
									colSpan={table.getVisibleFlatColumns().length}
								>
									{t("table.noResults")}
								</td>
							</tr>
						)}
					</GridBody>
					<GridFooter>
						<GridRow>
							<GridCell colSpan={columns.length}>
								<div className="flex flex-wrap justify-between gap-4 border-slate-200">
									<span className="text-slate-500 text-sm">
										{t("table.unitsCount", { count: data.pagination.totalCount })}
									</span>
									<div className="flex items-center justify-center gap-2">
										<span className="me-2 text-slate-500 text-sm">
											{t("table.pageIndicator", {
												current: pagination.pageIndex + 1,
												total: data.pagination.pageCount,
											})}
										</span>
										<Button
											disabled={!table.getCanPreviousPage()}
											onClick={() => table.previousPage()}
											size={"icon-sm"}
											variant={"outline"}
										>
											<ChevronLeftIcon />
										</Button>
										<Button
											disabled={!table.getCanNextPage()}
											onClick={() => table.nextPage()}
											size={"icon-sm"}
											variant={"outline"}
										>
											<ChevronRightIcon />
										</Button>
									</div>
								</div>
							</GridCell>
						</GridRow>
					</GridFooter>
				</Grid>
			</div>
			<UpdateMemberSheet handle={updateHandle} />
		</div>
	);
}

export { OrgSettingsMembers };
