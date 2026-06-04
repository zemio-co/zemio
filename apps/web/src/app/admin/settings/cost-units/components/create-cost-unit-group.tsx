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
import { createCostUnitGroupSchema } from "@/lib/validators";
import { api } from "@/trpc/react";

export function CreateCostUnitGroup({
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
