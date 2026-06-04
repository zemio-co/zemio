"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { api } from "@/trpc/react";
import { UpdateCostUnit } from "./update-cost-unit";

export function CostUnitsList() {
	const [data] = api.costUnit.listGrouped.useSuspenseQuery();

	return (
		<div className="flex flex-col gap-8">
			{/* Ungrouped cost units */}
			{data.ungrouped.length > 0 && (
				<CostUnitSection costUnits={data.ungrouped} title="Ohne Gruppe" />
			)}

			{/* Grouped cost units */}
			{data.grouped.map((group) => (
				<CostUnitSection
					costUnits={group.costUnits}
					key={group.group?.id}
					title={group.group?.title ?? "Unbekannte Gruppe"}
				/>
			))}

			{/* Empty state */}
			{data.ungrouped.length === 0 && data.grouped.length === 0 && (
				<div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
					<p>Keine Kostenstellen vorhanden.</p>
					<p className="text-sm">Erstelle eine neue Kostenstelle, um zu beginnen.</p>
				</div>
			)}
		</div>
	);
}

interface CostUnitSectionProps {
	title: string;
	costUnits: {
		id: string;
		tag: string;
		title: string;
		examples: string[];
		costUnitGroupId: string | null;
	}[];
}

function CostUnitSection({ title, costUnits }: CostUnitSectionProps) {
	return (
		<section>
			<h2 className="mb-4 font-semibold text-lg">{title}</h2>
			<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
				{costUnits.map((costUnit) => (
					<CostUnitCard costUnit={costUnit} key={costUnit.id} />
				))}
			</div>
		</section>
	);
}

interface CostUnitCardProps {
	costUnit: {
		id: string;
		tag: string;
		title: string;
		examples: string[];
		costUnitGroupId: string | null;
	};
}

function CostUnitCard({ costUnit }: CostUnitCardProps) {
	const [isEditing, setIsEditing] = useState(false);
	const [isDeleteOpen, setIsDeleteOpen] = useState(false);
	const utils = api.useUtils();

	const deleteCostUnit = api.costUnit.delete.useMutation({
		onSuccess: () => {
			utils.costUnit.listGrouped.invalidate();
			setIsDeleteOpen(false);
			toast.success("Kostenstelle erfolgreich gelöscht");
		},
		onError: (error) => {
			toast.error("Fehler beim Löschen der Kostenstelle", {
				description: error.message ?? "Ein unerwarteter Fehler ist aufgetreten",
			});
		},
	});

	return (
		<Card size="sm">
			<CardHeader>
				<CardDescription>{costUnit.tag}</CardDescription>
				<CardTitle>{costUnit.title}</CardTitle>
			</CardHeader>
			{costUnit.examples.length > 0 && (
				<CardContent>
					<p className="mb-1 text-muted-foreground text-xs">Beispiele:</p>
					<ul className="list-inside list-disc text-sm">
						{costUnit.examples.map((example) => (
							<li key={example}>{example}</li>
						))}
					</ul>
				</CardContent>
			)}
			<CardFooter className="justify-end gap-2">
				<Dialog onOpenChange={setIsEditing} open={isEditing}>
					<DialogTrigger
						render={
							<Button size="sm" variant="outline">
								Bearbeiten
							</Button>
						}
					/>
					<DialogContent className="sm:max-w-2xl">
						<DialogHeader>
							<DialogTitle>Kostenstelle bearbeiten</DialogTitle>
							<DialogDescription>
								Passe Tag, Titel, Gruppe und Beispiele an.
							</DialogDescription>
						</DialogHeader>
						<UpdateCostUnit costUnit={costUnit} onClose={() => setIsEditing(false)} />
					</DialogContent>
				</Dialog>
				<AlertDialog onOpenChange={setIsDeleteOpen} open={isDeleteOpen}>
					<AlertDialogTrigger
						render={
							<Button size="sm" variant="destructive">
								Löschen
							</Button>
						}
					/>
					<AlertDialogContent className="w-full max-w-xs">
						<AlertDialogHeader>
							<AlertDialogTitle>Kostenstelle löschen?</AlertDialogTitle>
							<AlertDialogDescription>
								Die Kostenstelle "{costUnit.title}" wird dauerhaft gelöscht. Diese
								Aktion kann nicht rückgängig gemacht werden.
							</AlertDialogDescription>
						</AlertDialogHeader>
						<AlertDialogFooter>
							<AlertDialogCancel>Abbrechen</AlertDialogCancel>
							<AlertDialogAction
								disabled={deleteCostUnit.isPending}
								onClick={() => deleteCostUnit.mutate({ id: costUnit.id })}
								variant="destructive"
							>
								Löschen
							</AlertDialogAction>
						</AlertDialogFooter>
					</AlertDialogContent>
				</AlertDialog>
			</CardFooter>
		</Card>
	);
}
