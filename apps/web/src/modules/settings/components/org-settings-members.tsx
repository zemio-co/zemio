"use client";

import { Avatar as AvatarPrimitive } from "@base-ui/react";
import {
	type ColumnDef,
	flexRender,
	getCoreRowModel,
	useReactTable,
} from "@tanstack/react-table";
import { format } from "date-fns";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { parseAsInteger, parseAsString, useQueryStates } from "nuqs";
import type React from "react";
import { useEffect, useState } from "react";
import { Fragment } from "react/jsx-runtime";
import {
	Box,
	BoxItem,
	BoxItemContent,
	BoxItemDescription,
	BoxItemTitle,
} from "@/components/box";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { api } from "@/trpc/react";

function OrgSettingsMembers() {
	return (
		<main>
			<div className="space-y-1">
				<h1 className="font-semibold text-lg text-zinc-800">Mitglieder</h1>
				<p className="text-sm text-zinc-600">
					Verwalten Sie die Mitglieder Ihrer Organisation
				</p>
			</div>
			<MembersList className="mt-12" />
		</main>
	);
}

// ======== MEMBERS LIST ===============================================================

function useDebounce<T>(value: T, delay = 300): T {
	const [debounced, setDebounced] = useState(value);
	useEffect(() => {
		const id = setTimeout(() => setDebounced(value), delay);
		return () => clearTimeout(id);
	}, [value, delay]);
	return debounced;
}

function useListParams() {
	return useQueryStates({
		page: parseAsInteger.withDefault(1),
		pageSize: parseAsInteger.withDefault(20),
		search: parseAsString.withDefault(""),
	});
}

function useListQuery() {
	const [params, setParams] = useListParams();

	const query = api.settings.listMembers.useQuery(
		{
			page: params.page,
			pageSize: params.pageSize,
			search: params.search || undefined,
		},
		{
			placeholderData: (prev) => prev,
		},
	);

	return { params, setParams, query };
}

type Member = {
	id: string;
	user: { email: string; id: string; name: string; image: string | null };
};

const columns: ColumnDef<Member>[] = [
	{
		id: "avatar",
		cell: ({ row }) => (
			<AvatarPrimitive.Root
				className={
					"size-8 overflow-hidden rounded-md border border-border bg-zinc-100"
				}
			>
				<AvatarPrimitive.Image
					className={"h-full w-full object-cover object-center"}
					src={row.original.user.image ?? undefined}
				/>
				<AvatarPrimitive.Fallback className="flex h-full w-full items-center justify-center font-medium text-xs">
					<span>{row.original.user.name.charAt(0)?.toUpperCase() ?? "X"}</span>
				</AvatarPrimitive.Fallback>
			</AvatarPrimitive.Root>
		),
	},
	{
		id: "info",
		cell: ({ row }) => (
			<BoxItemContent>
				<BoxItemTitle>{row.original.user.name}</BoxItemTitle>
				<BoxItemDescription>{row.original.user.email}</BoxItemDescription>
			</BoxItemContent>
		),
	},
	{
		id: "action",
		cell: ({ row }) => (
			<MemberDetails
				className={
					"ml-auto cursor-pointer text-blue-500 opacity-0 transition-opacity hover:text-blue-500 group-hover/item:opacity-100"
				}
				memberId={row.original.id}
				size={"sm"}
				variant={"ghost"}
			>
				Mehr <ChevronRightIcon />
			</MemberDetails>
		),
	},
];

function MembersList({ className, ...props }: React.ComponentProps<"div">) {
	const { params, setParams, query } = useListQuery();
	const { data, isFetching } = query;

	const [searchInput, setSearchInput] = useState(params.search ?? "");
	const debouncedSearch = useDebounce(searchInput, 300);

	useEffect(() => {
		void setParams({ search: debouncedSearch, page: 1 });
	}, [debouncedSearch, setParams]);

	const list = useReactTable({
		data: data?.rows ?? [],
		columns,
		pageCount: data?.pageCount ?? -1,

		manualPagination: true,
		manualSorting: true,
		manualFiltering: true,

		state: {
			pagination: {
				pageIndex: params.page - 1,
				pageSize: params.pageSize,
			},
		},

		onPaginationChange: (updater) => {
			const next =
				typeof updater === "function"
					? updater({ pageIndex: params.page - 1, pageSize: params.pageSize })
					: updater;
			void setParams({ page: next.pageIndex + 1, pageSize: next.pageSize });
		},

		getCoreRowModel: getCoreRowModel(),
	});

	return (
		<div className={cn("space-y-4", className)} {...props}>
			<div>
				<Input
					className="max-w-72 bg-white"
					onChange={(e) => setSearchInput(e.target.value)}
					placeholder="Suchen nach Namen..."
					value={searchInput}
				/>
			</div>
			<Box className={"data-[loading=true]:opacity-60"} data-loading={isFetching}>
				{list.getRowModel().rows.map((row) => (
					<BoxItem key={row.id} variant="clickable">
						{row.getVisibleCells().map((cell) => (
							<Fragment key={cell.id}>
								{flexRender(cell.column.columnDef.cell, cell.getContext())}
							</Fragment>
						))}
					</BoxItem>
				))}
			</Box>
			<div className="flex items-center justify-between">
				<Select
					itemToStringLabel={(value) => `${value} Einträge`}
					onValueChange={(value) =>
						void setParams({ pageSize: Number(value), page: 1 })
					}
					value={String(params.pageSize)}
				>
					<SelectTrigger className="w-28">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectGroup>
							{[1, 10, 20, 50].map((size) => (
								<SelectItem key={size} value={String(size)}>
									{size} Einträge
								</SelectItem>
							))}
						</SelectGroup>
					</SelectContent>
				</Select>
				<div className="flex items-center justify-center gap-0.25">
					<span className="me-2 text-xs text-zinc-600">
						Page {params.page} of {query.data?.pageCount ?? -1}
					</span>
					<Button
						disabled={!list.getCanPreviousPage()}
						onClick={() => list.previousPage()}
						size={"icon-sm"}
						variant={"ghost"}
					>
						<ChevronLeftIcon />
					</Button>
					<Button
						disabled={!list.getCanNextPage()}
						onClick={() => list.nextPage()}
						size={"icon-sm"}
						variant={"ghost"}
					>
						<ChevronRightIcon />
					</Button>
				</div>
			</div>
		</div>
	);
}

function MemberDetails({
	memberId,
	...props
}: React.ComponentProps<typeof Button> & { memberId: string }) {
	return (
		<Sheet>
			<SheetTrigger render={<Button {...props} />} />
			<SheetContent className={"data-[side=right]:sm:max-w-lg"}>
				<MemberDetailsContent memberId={memberId} />
			</SheetContent>
		</Sheet>
	);
}

function MemberDetailsContent({
	memberId,
	className,
	...props
}: React.ComponentProps<"div"> & { memberId: string }) {
	const {
		isPending,
		data: member,
		error,
	} = api.settings.getMembershipDetails.useQuery({
		id: memberId,
	});

	if (isPending) {
		return (
			<div className="p-4">
				<Skeleton className="min-h-24 w-full" />
			</div>
		);
	}

	if (!member || error) {
		return <p>An unknown error ocurred</p>;
	}

	return (
		<div className={cn("", className)} {...props}>
			<SheetHeader className="p-6">
				<div className="flex items-start justify-start gap-4">
					<Avatar className={"mt-1 size-10"}>
						<AvatarImage src={member.user.image ?? undefined} />
						<AvatarFallback>
							{member.user.name.charAt(0)?.toUpperCase() ?? "X"}
						</AvatarFallback>
					</Avatar>
					<div>
						<SheetTitle>{member.user.name}</SheetTitle>
						<SheetDescription>Informationen zu diesem Benutzer</SheetDescription>
					</div>
				</div>
			</SheetHeader>
			<div className="grid grid-cols-2 gap-6 p-6">
				<div className="col-span-2 space-y-1">
					<p className="font-medium text-xs text-zinc-500">E-Mail</p>
					<p className="font-medium text-zinc-800">
						{member.user.email}
						{member.user.emailVerified && (
							<span className="font-normal text-zinc-500">(Verfiziert)</span>
						)}
					</p>
				</div>

				<div className="space-y-1">
					<p className="font-medium text-xs text-zinc-500">Gebannt</p>
					<p className="font-medium text-zinc-800">
						{member.user.banned ? "Ja" : "Nein"}
					</p>
				</div>

				<div className="space-y-1">
					<p className="font-medium text-xs text-zinc-500">Konto erstellt</p>
					<p className="font-medium text-zinc-800">
						Am {format(member.createdAt, "dd.MM.yyyy")} um{" "}
						{format(member.createdAt, "HH:mm")}
					</p>
				</div>

				<div className="space-y-1">
					<p className="font-medium text-xs text-zinc-500">Rolle</p>
					<p className="font-medium text-zinc-800">{member.role}</p>
				</div>
				<div className="space-y-1">
					<p className="font-medium text-xs text-zinc-500">Mitglied seit</p>
					<p className="font-medium text-zinc-800">
						{format(member.createdAt, "dd.MM.yyyy")},{" "}
						{format(member.createdAt, "HH:mm")}
					</p>
				</div>
			</div>
		</div>
	);
}

export { OrgSettingsMembers };
