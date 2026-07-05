"use client";

import { Dialog as DialogPrimitive } from "@base-ui/react";
import { useForm } from "@tanstack/react-form";
import { useQueries } from "@tanstack/react-query";
import {
	type ColumnDef,
	flexRender,
	getCoreRowModel,
	useReactTable,
} from "@tanstack/react-table";
import { format } from "date-fns";
import { EllipsisIcon } from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import {
	Field,
	FieldError,
	FieldGroup,
	FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { createCostUnitGroupSchema } from "@/lib/validators";
import { api } from "@/trpc/react";
import {
	CreateCostUnitSheet,
	CreateCostUnitSheetTrigger,
} from "./org-settings-create-cost-unit";
import {
	UpdateCostUnitSheet,
	updateCostUnitHandle,
} from "./org-settings-update-cost-unit";

function OrgSettingsCostUnits() {
	return (
		<section className="container">
			<header className="flex flex-wrap items-start justify-between gap-8">
				<div className="space-y-1">
					<h1 className="font-bold text-2xl text-zinc-800">Kostenstellen</h1>
					<p className="text-sm text-zinc-700">
						Kostenstellen werden verwendet um Ausgaben einfacher zuordnen zu können
					</p>
				</div>
				<div className="flex flex-nowrap items-center justify-center gap-4">
					<CreateCostUnitGroup variant={"outline"}>Neue Gruppe</CreateCostUnitGroup>
					<CreateCostUnitSheetTrigger>Neue Kostenstelle</CreateCostUnitSheetTrigger>
				</div>
			</header>

			<CostUnitsTable className="mt-12" />

			<CreateCostUnitSheet />
		</section>
	);
}

// ========= COST UNITS LIST =============================================

type FetchedCostUnit = {
	id: string;
	tag: string;
	title: string;
	examples: string[];
	costUnitGroupId: string | null;
	costUnitGroup: {
		title: string;
	} | null;
	createdAt: Date;
};

const costUnitColumns: ColumnDef<FetchedCostUnit>[] = [
	{
		id: "tag",
		accessorKey: "tag",
		header: "Tag",
	},
	{
		id: "title",
		accessorKey: "title",
		header: "Titel",
		cell: ({ row }) => {
			return (
				<span className="font-semibold text-slate-800">{row.original.title}</span>
			);
		},
	},
	{
		id: "examples",
		accessorFn: (original) => {
			return original.examples.length;
		},
		cell: ({ row }) => {
			return <span>{row.original.examples.length} Beispiele</span>;
		},
		header: undefined,
	},
	{
		id: "createdAt",
		accessorKey: "",
		header: "Erstellt",
		cell: ({ row }) => {
			return format(row.original.createdAt, "dd.MM.yyyy, HH:mm");
		},
	},
	{
		id: "group",
		accessorFn: (original) => {
			return original.costUnitGroup?.title ?? "Keine Gruppe";
		},
		header: "Gruppe",
		cell: ({ row }) => {
			return (
				<Badge variant={"outline"}>
					{row.original.costUnitGroup?.title ?? "Keine Gruppe"}
				</Badge>
			);
		},
	},
	{
		id: "actions",
		cell: () => {
			return (
				<Button
					className={
						"shadow-none ring-0 group-hover/row:shadow-sm group-hover/row:ring-1"
					}
					onClick={(e) => {
						e.stopPropagation();
					}}
					onPointerDown={(e) => {
						e.stopPropagation();
					}}
					// costUnit={row.original}
					size={"icon-sm"}
					variant={"outline"}
				>
					<EllipsisIcon />
				</Button>
			);
		},
	},
];

function CostUnitsTable({ className, ...props }: React.ComponentProps<"div">) {
	const page = 1;
	const pageSize = 20;
	const search = undefined;

	const utils = api.useUtils();

	const [dataQuery] = useQueries({
		queries: [
			utils.costUnit.listCostUnits.queryOptions({
				page,
				pageSize,
				search,
			}),
		],
	});

	const table = useReactTable({
		data: dataQuery.data?.items ?? [],
		columns: costUnitColumns,
		getCoreRowModel: getCoreRowModel(),
	});

	if (dataQuery.error) {
		return <p>{JSON.stringify(dataQuery.error)}</p>;
	}

	return (
		<div className={cn("", className)} data-slot="cost-units-table" {...props}>
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
							<DialogPrimitive.Trigger
								handle={updateCostUnitHandle}
								key={row.id}
								nativeButton={false}
								payload={{ id: row.original.id }}
								render={
									<tr className="group/row" key={row.id}>
										{row.getVisibleCells().map((cell) => (
											<td
												className="cursor-pointer whitespace-nowrap px-3 py-2 text-slate-700 text-sm"
												key={cell.id}
											>
												{flexRender(cell.column.columnDef.cell, cell.getContext())}
											</td>
										))}
									</tr>
								}
							/>
						))
					) : (
						<tr>
							<td
								className="h-24 text-center"
								colSpan={table.getVisibleFlatColumns().length}
							>
								No results.
							</td>
						</tr>
					)}
				</tbody>
			</table>
			<UpdateCostUnitSheet />
		</div>
	);
}

// ========= CREATE COST UNIT GROUP ======================================

function CreateCostUnitGroup({
	...props
}: React.ComponentProps<typeof Button>) {
	const utils = api.useUtils();
	const [open, setOpen] = useState(false);

	const createGroup = api.costUnit.createGroup.useMutation({
		onSuccess: () => {
			utils.costUnit.listGroups.invalidate();
			setOpen(false);
			form.reset();
			toast.success("Kostenstellengruppe erfolgreich erstellt");
		},
		onError: (error) => {
			toast.error("Fehler beim Erstellen der Kostenstellengruppe", {
				description: error.message ?? "Ein unerwarteter Fehler ist aufgetreten",
			});
		},
	});

	const form = useForm({
		defaultValues: {
			title: "",
		},
		validators: {
			onSubmit: createCostUnitGroupSchema,
		},
		onSubmit: (value) => {
			createGroup.mutate(value.value);
		},
	});

	return (
		<Dialog onOpenChange={setOpen} open={open}>
			<DialogTrigger render={<Button {...props} />} />
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Neue Kostenstellengruppe</DialogTitle>
					<DialogDescription>
						Erstelle eine neue Kostenstellengruppe
					</DialogDescription>
				</DialogHeader>
				<div>
					<form
						id="form-create-cost-unit-group"
						onSubmit={(e) => {
							e.preventDefault();
							form.handleSubmit();
						}}
					>
						<FieldGroup>
							<form.Field name="title">
								{(field) => {
									const isInvalid =
										field.state.meta.isTouched && !field.state.meta.isValid;
									return (
										<Field data-invalid={isInvalid}>
											<FieldLabel htmlFor={field.name}>Gruppentitel</FieldLabel>
											<Input
												aria-invalid={isInvalid}
												id={field.name}
												name={field.name}
												onBlur={field.handleBlur}
												onChange={(e) => field.handleChange(e.target.value)}
												value={field.state.value}
											/>
											{isInvalid && <FieldError errors={field.state.meta.errors} />}
										</Field>
									);
								}}
							</form.Field>
							<Button
								className="w-full"
								disabled={createGroup.isPending}
								form="form-create-cost-unit-group"
								type="submit"
							>
								Erstellen
							</Button>
						</FieldGroup>
					</form>
				</div>
			</DialogContent>
		</Dialog>
	);
}

// ========= EXAMPLES INPUT ==============================================

interface ExamplesInputProps {
	value: string[];
	onChange: (examples: string[]) => void;
	placeholder?: string;
}

interface InputItem {
	id: string;
	value: string;
}

export function ExamplesInput({
	value,
	onChange,
	placeholder,
}: ExamplesInputProps) {
	const baseId = useId();
	const counterRef = useRef(0);

	const generateInputId = useCallback(() => {
		return `${baseId}-input-${++counterRef.current}`;
	}, [baseId]);

	// Initialize inputs from value prop, with a trailing empty input for new entries
	const [inputs, setInputs] = useState<InputItem[]>(() => {
		if (value.length === 0) {
			return [{ id: `${baseId}-input-0`, value: "" }];
		}
		// Map existing values to inputs and add a trailing empty input
		const initialInputs = value.map((v, i) => ({
			id: `${baseId}-input-${i}`,
			value: v,
		}));
		counterRef.current = value.length;
		initialInputs.push({
			id: `${baseId}-input-${counterRef.current}`,
			value: "",
		});
		return initialInputs;
	});

	// Sync inputs when external value changes (e.g., form reset)
	// Compare against current internal state to avoid regenerating on round-trips
	useEffect(() => {
		setInputs((currentInputs) => {
			// Get current non-empty values from internal state
			const currentValues = currentInputs
				.map((item) => item.value)
				.filter((v) => v.trim() !== "");

			// Compare incoming value against current internal values
			const isSameContent =
				currentValues.length === value.length &&
				currentValues.every((v, i) => v === value[i]);

			// If content matches, don't regenerate (avoids focus loss on round-trips)
			if (isSameContent) {
				return currentInputs;
			}

			// External value differs from internal state - regenerate inputs
			if (value.length === 0) {
				return [{ id: generateInputId(), value: "" }];
			}

			const restoredInputs = value.map((v) => ({
				id: generateInputId(),
				value: v,
			}));
			restoredInputs.push({ id: generateInputId(), value: "" });
			return restoredInputs;
		});
	}, [value, generateInputId]);

	// Sync non-empty values to parent form (separate effect to avoid setState during render)
	const onChangeRef = useRef(onChange);
	onChangeRef.current = onChange;
	useEffect(() => {
		const nonEmptyValues = inputs
			.map((item) => item.value)
			.filter((v) => v.trim() !== "");
		onChangeRef.current(nonEmptyValues);
	}, [inputs]);

	const handleChange = useCallback(
		(inputId: string, newValue: string) => {
			setInputs((prev) => {
				const index = prev.findIndex((item) => item.id === inputId);
				if (index === -1) return prev;

				const updated = [...prev];
				updated[index] = { id: inputId, value: newValue };

				// If the last input now has content, add a new empty input
				const isLastInput = index === prev.length - 1;
				if (isLastInput && newValue.trim() !== "") {
					updated.push({ id: generateInputId(), value: "" });
				}

				// Remove empty inputs except for one trailing empty input
				const filtered = updated.filter(
					(item, i) => item.value.trim() !== "" || i === updated.length - 1,
				);

				// Ensure there's always at least one empty input at the end
				const lastItem = filtered[filtered.length - 1];
				if (filtered.length === 0 || (lastItem && lastItem.value.trim() !== "")) {
					filtered.push({ id: generateInputId(), value: "" });
				}

				return filtered;
			});
		},
		[generateInputId],
	);

	return (
		<div className="flex flex-col gap-2">
			{inputs.map((input) => (
				<Input
					key={input.id}
					onChange={(e) => handleChange(input.id, e.target.value)}
					placeholder={placeholder}
					value={input.value}
				/>
			))}
		</div>
	);
}

export { OrgSettingsCostUnits };
