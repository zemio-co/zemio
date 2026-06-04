"use client";

import { useForm } from "@tanstack/react-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
import { updateCostUnitSchema } from "@/lib/validators";
import { api } from "@/trpc/react";
import { ExamplesInput } from "./cost-unit-examples-input";

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

export function UpdateCostUnit({ costUnit, onClose }: UpdateCostUnitProps) {
	const [groups] = api.costUnit.listGroups.useSuspenseQuery();
	const utils = api.useUtils();

	const updateCostUnit = api.costUnit.update.useMutation({
		onSuccess: () => {
			utils.costUnit.listGrouped.invalidate();
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
