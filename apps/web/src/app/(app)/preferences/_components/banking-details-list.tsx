"use client";

import type { BankingDetails } from "@zemio/db";
import { format } from "date-fns";
import { PencilIcon, PlusIcon, TrashIcon } from "lucide-react";
import { useTranslations } from "next-intl";
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
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { api } from "@/trpc/react";
import { CreateBankingDetailsForm } from "./create-banking-details";
import { EditBankingDetailsForm } from "./edit-banking-details";

export function BankingDetailsList({
	className,
	...props
}: React.ComponentProps<"ul"> & { className?: string }) {
	const t = useTranslations("modules.preferences.bankingDetailsList");
	const [items] = api.bankingDetails.list.useSuspenseQuery();

	return (
		<ul className={cn("grid gap-4", className)} {...props}>
			{items.map((item) => (
				<li key={item.id}>
					<BankingDetailsListItem details={item} />
				</li>
			))}
			<li>
				<CreateBankingDetailsForm
					className="min-h-16 w-full border-dashed"
					variant={"outline"}
				>
					<PlusIcon /> <span>{t("addNew")}</span>
				</CreateBankingDetailsForm>
			</li>
		</ul>
	);
}

export function BankingDetailsListItem({
	className,
	details,
	...props
}: React.ComponentProps<typeof Card> & {
	details: Pick<BankingDetails, "id" | "title" | "createdAt">;
}) {
	const t = useTranslations("modules.preferences.bankingDetailsList");
	const tActions = useTranslations("modules.settings.actions");
	const utils = api.useUtils();

	const deleteBankingDetails = api.bankingDetails.delete.useMutation({
		onSuccess: () => {
			toast.success(t("deleteSuccess"));
			utils.bankingDetails.list.invalidate();
		},
		onError: (error) => {
			toast.error(t("deleteError"), {
				description: error.message ?? t("unexpectedError"),
			});
		},
	});

	return (
		<Card
			className={cn("group/details-list-item rounded-md", className)}
			{...props}
		>
			<CardContent className="flex items-center justify-start gap-6">
				<div>
					<p className="font-medium text-foreground">{details.title}</p>
					<p className="mt-1 text-muted-foreground text-xs">
						{t("createdAt", {
							date: format(details.createdAt, "dd.MM.yyyy"),
							time: format(details.createdAt, "HH:mm"),
						})}
					</p>
				</div>
				<div className="ml-auto flex flex-nowrap gap-2 transition-opacity md:opacity-0 md:group-hover/details-list-item:opacity-100">
					<EditBankingDetailsForm
						className={"cursor-pointer"}
						detailsId={details.id}
						render={
							<Button size={"icon"} variant={"outline"}>
								<PencilIcon />
							</Button>
						}
						size={"icon"}
						variant={"outline"}
					/>
					<AlertDialog>
						<AlertDialogTrigger
							render={
								<Button
									className={"cursor-pointer"}
									size={"icon"}
									variant={"destructive"}
								>
									<TrashIcon />
								</Button>
							}
						/>
						<AlertDialogContent className="w-full md:max-w-lg!">
							<AlertDialogHeader>
								<AlertDialogTitle>{t("deleteDialogTitle")}</AlertDialogTitle>
								<AlertDialogDescription>
									{t("deleteDialogDescription", { title: details.title })}
								</AlertDialogDescription>
							</AlertDialogHeader>
							<AlertDialogFooter>
								<AlertDialogCancel>{tActions("cancel")}</AlertDialogCancel>
								<AlertDialogAction
									disabled={deleteBankingDetails.isPending}
									onClick={() => deleteBankingDetails.mutate({ id: details.id })}
									variant={"destructive"}
								>
									<TrashIcon />
									{tActions("delete")}
								</AlertDialogAction>
							</AlertDialogFooter>
						</AlertDialogContent>
					</AlertDialog>
				</div>
			</CardContent>
		</Card>
	);
}
