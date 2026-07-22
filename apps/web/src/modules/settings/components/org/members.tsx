"use client";

import { Dialog as DialogPrimitive } from "@base-ui/react";
import { keepPreviousData } from "@tanstack/react-query";
import {
	type ColumnDef,
	flexRender,
	getCoreRowModel,
	type PaginationState,
	useReactTable,
} from "@tanstack/react-table";
import { format } from "date-fns";
import {
	ChevronLeftIcon,
	ChevronRightIcon,
	CircleIcon,
	EllipsisIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { api } from "@/trpc/react";
import {
	createUpdateMemberHandle,
	type UpdateMemberHandle,
	UpdateMemberSheet,
} from "./update-member";

function OrgSettingsMembers() {
	const t = useTranslations("modules.settings.members");

	return (
		<section className="container">
			<header className="flex flex-wrap items-start justify-between gap-8">
				<div className="space-y-1">
					<h1 className="font-bold text-2xl text-zinc-800">{t("title")}</h1>
					<p className="text-sm text-zinc-700">{t("description")}</p>
				</div>
			</header>

			<MembersTable className="mt-12" />
		</section>
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

function createMembersTableColumns(
	handle: UpdateMemberHandle,
	t: ColumnTranslator,
): ColumnDef<Member>[] {
	return [
		{
			id: "avatar",
			cell: ({ row }) => (
				<Avatar size="sm">
					<AvatarImage src={row.original.user.image ?? undefined} />
					<AvatarFallback>
						{row.original.user.name.charAt(0)?.toUpperCase() ?? "X"}
					</AvatarFallback>
				</Avatar>
			),
		},
		{
			id: "name",
			accessorFn: ({ user }) => {
				return user.name;
			},
			cell: ({ row }) => {
				return (
					<span className="font-semibold text-slate-800">
						{row.original.user.name}
					</span>
				);
			},
			header: t("table.name"),
		},
		{
			id: "email",
			accessorFn: ({ user }) => {
				return user.email;
			},
			header: t("table.email"),
		},
		{
			id: "Rolle",
			accessorKey: "role",
			header: t("table.role"),
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
			accessorKey: "",
			header: t("table.createdAt"),
			cell: ({ row }) => {
				return format(row.original.createdAt, "dd.MM.yyyy, HH:mm");
			},
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

function MembersTable({ className, ...props }: React.ComponentProps<"div">) {
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
		return createMembersTableColumns(updateHandle, t as ColumnTranslator);
	}, [updateHandle, t]);

	const dataQuery = api.settings.listMembers.useQuery(
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
		data: dataQuery.data?.rows ?? [],
		rowCount: dataQuery.data?.total,
		columns: columns,
		state: {
			pagination,
		},
		getCoreRowModel: getCoreRowModel(),
		onPaginationChange: setPagination,
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
				className="transition-opacity data-[fetching=true]:opacity-50"
				data-fetching={dataQuery.isFetching}
			>
				<table className="w-full">
					<thead>
						{table.getHeaderGroups().map((headerGroup) => (
							<tr className="border-b" key={headerGroup.id}>
								{headerGroup.headers.map((header) => {
									return (
										<th
											className="whitespace-nowrap px-3 py-2 text-left font-semibold text-slate-800 text-xs"
											key={header.id}
										>
											{header.isPlaceholder
												? null
												: flexRender(header.column.columnDef.header, header.getContext())}
										</th>
									);
								})}
							</tr>
						))}
					</thead>
					<tbody>
						{table.getRowModel().rows?.length ? (
							table.getRowModel().rows.map((row) => (
								<tr className="group/row" key={row.id}>
									{row.getVisibleCells().map((cell) => (
										<td
											className="whitespace-nowrap px-3 py-2 text-slate-700 text-sm"
											key={cell.id}
										>
											{flexRender(cell.column.columnDef.cell, cell.getContext())}
										</td>
									))}
								</tr>
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
					</tbody>
				</table>
			</div>
			<div className="mt-8 flex flex-wrap justify-between gap-4 border-slate-200 border-t pt-4">
				<span className="text-slate-500 text-sm">
					{t("table.unitsCount", { count: data.total })}
				</span>
				<div className="flex items-center justify-center gap-2">
					<span className="me-2 text-slate-500 text-sm">
						{t("table.pageIndicator", {
							current: pagination.pageIndex + 1,
							total: Math.ceil(data.total / PAGE_SIZE),
						})}
					</span>
					<Button
						disabled={!table.getCanPreviousPage()}
						onClick={() => table.previousPage()}
						size={"icon-xs"}
						variant={"outline"}
					>
						<ChevronLeftIcon />
					</Button>
					<Button
						disabled={!table.getCanNextPage()}
						onClick={() => table.nextPage()}
						size={"icon-xs"}
						variant={"outline"}
					>
						<ChevronRightIcon />
					</Button>
				</div>
			</div>
			<UpdateMemberSheet handle={updateHandle} />
		</div>
	);
}

export { OrgSettingsMembers };
