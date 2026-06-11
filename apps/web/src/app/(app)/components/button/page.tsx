import { ArrowRightIcon, PencilIcon, PlusIcon, TrashIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

export default async function ServerPage() {
	return (
		<main className="p-20">
			<div className="flex items-center justify-start gap-4">
				<Button>
					<PlusIcon />
					Hinzufügen
				</Button>
				<Button variant={"outline"}>
					<PencilIcon />
					Bearbeiten
				</Button>
				<Button variant={"destructive"}>
					<TrashIcon />
					Löschen
				</Button>
				<Button variant={"ghost"}>
					Next Page
					<ArrowRightIcon />
				</Button>
				<Button size={"icon-sm"} variant={"outline"}>
					<ArrowRightIcon />
				</Button>
				<Button size={"sm"} variant={"outline"}>
					Bearbeiten
				</Button>
			</div>
		</main>
	);
}
