"use client";

import { useForm } from "@tanstack/react-form";
import { useState } from "react";
import { toast } from "sonner";
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
import { NO_COST_UNIT_GROUP } from "@/lib/consts";
import { createCostUnitSchema } from "@/lib/validators";
import { api } from "@/trpc/react";
import { ExamplesInput } from "./cost-unit-examples-input";

export function CreateCostUnit({
	...props
}: React.ComponentProps<typeof Button>) {
	const [groups] = api.costUnit.listGroups.useSuspenseQuery();
	const utils = api.useUtils();
	const [open, setOpen] = useState(false);

	const createCostUnit = api.costUnit.create.useMutation({
		onSuccess: () => {
			utils.costUnit.listGrouped.invalidate();
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
