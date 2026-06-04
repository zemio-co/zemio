"use client";

import { useForm } from "@tanstack/react-form";
import { PlusIcon } from "lucide-react";
import { parseAsString, useQueryState } from "nuqs";
import type React from "react";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { toast } from "sonner";
import {
	Box,
	BoxItem,
	BoxItemContent,
	BoxItemDescription,
	BoxItemTitle,
} from "@/components/box";
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
import {
	NativeSelect,
	NativeSelectOptGroup,
	NativeSelectOption,
} from "@/components/ui/native-select";
import { Skeleton } from "@/components/ui/skeleton";
import { NO_COST_UNIT_GROUP } from "@/lib/consts";
import { cn } from "@/lib/utils";
import {
	createCostUnitGroupSchema,
	createCostUnitSchema,
	updateCostUnitSchema,
} from "@/lib/validators";
import { api } from "@/trpc/react";

function OrgSettingsCostUnits() {
	return (
		<main>
			<div className="space-y-1">
				<h1 className="font-semibold text-lg text-zinc-800">Kostenstellen</h1>
				<p className="text-sm text-zinc-600">
					Kostenstellen werden verwendet um Ausgaben einfacher zuordnen zu können
				</p>
			</div>

			<Box className="mt-12">
				<BoxItem variant="grid">
					<BoxItemContent>
						<BoxItemTitle>Neue Kostenstelle</BoxItemTitle>
						<BoxItemDescription>
							Kostenstellen werden verwendet um Spesenausgaben besser zuordnen zu
							können
						</BoxItemDescription>
					</BoxItemContent>
					<div className="flex justify-end">
						<CreateCostUnit size={"sm"} variant={"outline"}>
							<PlusIcon /> Kostenstelle anlegen
						</CreateCostUnit>
					</div>
				</BoxItem>{" "}
				<BoxItem variant="grid">
					<BoxItemContent>
						<BoxItemTitle>Neue Gruppe</BoxItemTitle>
						<BoxItemDescription>
							Verwende Gruppen um Kostenstellen besser zu organisieren
						</BoxItemDescription>
					</BoxItemContent>
					<div className="flex justify-end">
						<CreateCostUnitGroup size={"sm"} variant={"outline"}>
							<PlusIcon /> Gruppe erstellen
						</CreateCostUnitGroup>
					</div>
				</BoxItem>
			</Box>

			<CostUnitsList className="mt-12" />
		</main>
	);
}

// ========= COST UNITS LIST =============================================

function useDebounce<T>(value: T, delay = 300): T {
	const [debounced, setDebounced] = useState(value);
	useEffect(() => {
		const id = setTimeout(() => setDebounced(value), delay);
		return () => clearTimeout(id);
	}, [value, delay]);
	return debounced;
}

function CostUnitsList({ className, ...props }: React.ComponentProps<"div">) {
	const [search, setSearch] = useQueryState(
		"search",
		parseAsString.withDefault(""),
	);
	const [searchInput, setSearchInput] = useState(search);
	const debouncedSearch = useDebounce(searchInput, 300);

	useEffect(() => {
		void setSearch(debouncedSearch);
	}, [debouncedSearch, setSearch]);

	const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isFetching } =
		api.costUnit.listCostUnits.useInfiniteQuery(
			{
				pageSize: 20,
				search: debouncedSearch || undefined,
			},
			{
				getNextPageParam: (lastPage) => lastPage.nextCursor,
				initialCursor: undefined,
				placeholderData: (prev) => prev,
			},
		);

	const items = data?.pages.flatMap((page) => page.items) ?? [];

	const loadMoreRef = useRef<HTMLDivElement>(null);
	useEffect(() => {
		const node = loadMoreRef.current;
		if (!node) return;
		const observer = new IntersectionObserver(
			(entries) => {
				if (entries[0]?.isIntersecting && hasNextPage && !isFetchingNextPage) {
					void fetchNextPage();
				}
			},
			{ threshold: 0.1 },
		);
		observer.observe(node);
		return () => observer.disconnect();
	}, [hasNextPage, isFetchingNextPage, fetchNextPage]);

	return (
		<div className={cn("space-y-4", className)} {...props}>
			<div>
				<Input
					className="max-w-72 bg-white"
					onChange={(e) => setSearchInput(e.target.value)}
					placeholder="Suchen nach Tag oder Titel..."
					value={searchInput}
				/>
			</div>
			<Box
				className={"data-[loading=true]:opacity-60"}
				data-loading={isFetching && !isFetchingNextPage}
			>
				{items.map((item) => (
					<BoxItem key={item.id}>
						<BoxItemContent>
							<BoxItemTitle>
								{item.tag} – {item.title}
							</BoxItemTitle>
							{item.examples.length > 0 && (
								<BoxItemDescription>{item.examples.join(", ")}</BoxItemDescription>
							)}
						</BoxItemContent>
					</BoxItem>
				))}
			</Box>
			<div ref={loadMoreRef} />
			{isFetchingNextPage && <Skeleton className="h-12 w-full" />}
		</div>
	);
}

// ========= CREATE COST UNIT ============================================

function CreateCostUnit({ ...props }: React.ComponentProps<typeof Button>) {
	const [groups] = api.costUnit.listGroups.useSuspenseQuery();
	const utils = api.useUtils();
	const [open, setOpen] = useState(false);

	const createCostUnit = api.costUnit.create.useMutation({
		onSuccess: () => {
			utils.costUnit.listGrouped.invalidate();
			utils.costUnit.listCostUnits.invalidate();
			setOpen(false);
			form.reset();
			toast.success("Kostenstelle erfolgreich erstellt");
		},
		onError: (error) => {
			toast.error("Fehler beim Erstellen der Kostenstelle", {
				description: error.message ?? "Ein unerwarteter Fehler ist aufgetreten",
			});
		},
	});

	const form = useForm({
		defaultValues: {
			tag: "",
			title: "",
			examples: [] as string[],
			costUnitGroupId: NO_COST_UNIT_GROUP as string,
		},
		validators: {
			onSubmit: createCostUnitSchema,
		},
		onSubmit: (value) => {
			createCostUnit.mutate(value.value);
		},
	});

	return (
		<Dialog onOpenChange={setOpen} open={open}>
			<DialogTrigger render={<Button {...props} />} />
			<DialogContent className={"md:max-w-2xl"}>
				<DialogHeader>
					<DialogTitle>Neue Kostenstelle</DialogTitle>
					<DialogDescription>Erstelle eine neue Kostenstelle</DialogDescription>
				</DialogHeader>
				<div>
					<form
						id="form-create-cost-unit"
						onSubmit={(e) => {
							e.preventDefault();
							form.handleSubmit();
						}}
					>
						<FieldGroup className="grid grid-cols-3 gap-4">
							<form.Field name="tag">
								{(field) => {
									const isInvalid =
										field.state.meta.isTouched && !field.state.meta.isValid;
									return (
										<Field data-invalid={isInvalid}>
											<FieldLabel htmlFor={field.name}>Tag</FieldLabel>
											<Input
												aria-invalid={isInvalid}
												id={field.name}
												name={field.name}
												onBlur={field.handleBlur}
												onChange={(e) => field.handleChange(e.target.value)}
												placeholder="KS 111"
												value={field.state.value}
											/>
											{isInvalid && <FieldError errors={field.state.meta.errors} />}
										</Field>
									);
								}}
							</form.Field>
							<form.Field name="title">
								{(field) => {
									const isInvalid =
										field.state.meta.isTouched && !field.state.meta.isValid;
									return (
										<Field className="col-span-2" data-invalid={isInvalid}>
											<FieldLabel htmlFor={field.name}>Titel</FieldLabel>
											<Input
												aria-invalid={isInvalid}
												id={field.name}
												name={field.name}
												onBlur={field.handleBlur}
												onChange={(e) => field.handleChange(e.target.value)}
												placeholder="SAW oder SAF"
												value={field.state.value}
											/>
											{isInvalid && <FieldError errors={field.state.meta.errors} />}
										</Field>
									);
								}}
							</form.Field>
							<form.Field name="costUnitGroupId">
								{(field) => {
									const isInvalid =
										field.state.meta.isTouched && !field.state.meta.isValid;
									return (
										<Field className="col-span-3" data-invalid={isInvalid}>
											<FieldLabel htmlFor={field.name}>Gruppe</FieldLabel>
											<NativeSelect
												onChange={(e) => field.handleChange(e.target.value)}
												value={field.state.value}
											>
												<NativeSelectOption value={NO_COST_UNIT_GROUP}>
													Keine Gruppe
												</NativeSelectOption>
												<NativeSelectOptGroup label="Gruppen">
													{groups.map((group) => (
														<NativeSelectOption key={group.id} value={group.id}>
															{group.title}
														</NativeSelectOption>
													))}
												</NativeSelectOptGroup>
											</NativeSelect>
											{isInvalid && <FieldError errors={field.state.meta.errors} />}
										</Field>
									);
								}}
							</form.Field>
							<form.Field name="examples">
								{(field) => {
									const isInvalid =
										field.state.meta.isTouched && !field.state.meta.isValid;
									return (
										<Field className="col-span-3" data-invalid={isInvalid}>
											<FieldLabel htmlFor={field.name}>Beispiele</FieldLabel>
											<ExamplesInput
												onChange={field.handleChange}
												placeholder="z.B. Kundenname, Projektbezeichnung"
												value={field.state.value}
											/>
											{isInvalid && <FieldError errors={field.state.meta.errors} />}
										</Field>
									);
								}}
							</form.Field>
							<div className="col-span-3 flex items-center justify-end">
								<Button
									className="w-full"
									disabled={createCostUnit.isPending}
									form="form-create-cost-unit"
									type="submit"
								>
									Erstellen
								</Button>
							</div>
						</FieldGroup>
					</form>
				</div>
			</DialogContent>
		</Dialog>
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

function ExamplesInput({ value, onChange, placeholder }: ExamplesInputProps) {
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

// ========= UPDATE COST UNIT ============================================
interface UpdateCostUnitProps {
	costUnit: {
		id: string;
		tag: string;
		title: string;
		examples: string[];
		costUnitGroupId: string | null;
	};
	onClose?: () => void;
}

function UpdateCostUnit({ costUnit, onClose }: UpdateCostUnitProps) {
	const [groups] = api.costUnit.listGroups.useSuspenseQuery();
	const utils = api.useUtils();

	const updateCostUnit = api.costUnit.update.useMutation({
		onSuccess: () => {
			utils.costUnit.listGrouped.invalidate();
			utils.costUnit.listCostUnits.invalidate();
			onClose?.();
			toast.success("Kostenstelle erfolgreich aktualisiert");
		},
		onError: (error) => {
			toast.error("Fehler beim Aktualisieren der Kostenstelle", {
				description: error.message ?? "Ein unerwarteter Fehler ist aufgetreten",
			});
		},
	});

	const form = useForm({
		defaultValues: {
			id: costUnit.id,
			tag: costUnit.tag,
			title: costUnit.title,
			examples: costUnit.examples,
			costUnitGroupId: costUnit.costUnitGroupId ?? NO_COST_UNIT_GROUP,
		},
		validators: {
			onSubmit: updateCostUnitSchema,
		},
		onSubmit: (value) => {
			updateCostUnit.mutate(value.value);
		},
	});

	return (
		<form
			id={`form-update-cost-unit-${costUnit.id}`}
			onSubmit={(e) => {
				e.preventDefault();
				form.handleSubmit();
			}}
		>
			<FieldGroup className="grid grid-cols-3 gap-4">
				<form.Field name="tag">
					{(field) => {
						const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
						return (
							<Field data-invalid={isInvalid}>
								<FieldLabel htmlFor={field.name}>Tag</FieldLabel>
								<Input
									aria-invalid={isInvalid}
									id={field.name}
									name={field.name}
									onBlur={field.handleBlur}
									onChange={(e) => field.handleChange(e.target.value)}
									placeholder="KS 111"
									value={field.state.value}
								/>
								{isInvalid && <FieldError errors={field.state.meta.errors} />}
							</Field>
						);
					}}
				</form.Field>
				<form.Field name="title">
					{(field) => {
						const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
						return (
							<Field className="col-span-2" data-invalid={isInvalid}>
								<FieldLabel htmlFor={field.name}>Titel</FieldLabel>
								<Input
									aria-invalid={isInvalid}
									id={field.name}
									name={field.name}
									onBlur={field.handleBlur}
									onChange={(e) => field.handleChange(e.target.value)}
									placeholder="SAW oder SAF"
									value={field.state.value}
								/>
								{isInvalid && <FieldError errors={field.state.meta.errors} />}
							</Field>
						);
					}}
				</form.Field>
				<form.Field name="costUnitGroupId">
					{(field) => {
						const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
						return (
							<Field className="col-span-3" data-invalid={isInvalid}>
								<FieldLabel htmlFor={field.name}>Gruppe</FieldLabel>
								<NativeSelect
									onChange={(e) => field.handleChange(e.target.value)}
									value={field.state.value}
								>
									<NativeSelectOption value={NO_COST_UNIT_GROUP}>
										Keine Gruppe
									</NativeSelectOption>
									<NativeSelectOptGroup label="Gruppen">
										{groups.map((group) => (
											<NativeSelectOption key={group.id} value={group.id}>
												{group.title}
											</NativeSelectOption>
										))}
									</NativeSelectOptGroup>
								</NativeSelect>
								{isInvalid && <FieldError errors={field.state.meta.errors} />}
							</Field>
						);
					}}
				</form.Field>
				<form.Field name="examples">
					{(field) => {
						const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
						return (
							<Field className="col-span-3" data-invalid={isInvalid}>
								<FieldLabel htmlFor={field.name}>Beispiele</FieldLabel>
								<ExamplesInput
									onChange={field.handleChange}
									placeholder="z.B. Kundenname, Projektbezeichnung"
									value={field.state.value}
								/>
								{isInvalid && <FieldError errors={field.state.meta.errors} />}
							</Field>
						);
					}}
				</form.Field>
				<div className="col-span-3 flex items-center justify-end gap-2">
					{onClose && (
						<Button onClick={onClose} type="button" variant="ghost">
							Abbrechen
						</Button>
					)}
					<Button
						disabled={updateCostUnit.isPending}
						form={`form-update-cost-unit-${costUnit.id}`}
						type="submit"
					>
						Speichern
					</Button>
				</div>
			</FieldGroup>
		</form>
	);
}

export { OrgSettingsCostUnits, UpdateCostUnit };
