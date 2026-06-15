"use client";

import { ArrowRightIcon, PencilIcon, PlusIcon, TrashIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	InputGroup,
	InputGroupAddon,
	InputGroupInput,
	InputGroupText,
} from "@/components/ui/input-group";
import { Textarea } from "@/components/ui/textarea";
import { CreateReport } from "@/modules/report";

export default function ServerPage() {
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
			<div className="mt-20">
				<Input placeholder="Hello world" />
				<Textarea className="my-12" placeholder="Type something here..." />
				<InputGroup>
					<InputGroupInput placeholder="hello world" />
					<InputGroupAddon>
						<InputGroupText>Hello world</InputGroupText>
					</InputGroupAddon>
				</InputGroup>
			</div>
			<div className="mt-20">
				<CreateReport open />
			</div>
		</main>
	);
}
