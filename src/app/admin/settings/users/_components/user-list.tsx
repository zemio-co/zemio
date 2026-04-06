"use client";

import { useForm } from "@tanstack/react-form";
import {
	EllipsisIcon,
	MailPlusIcon,
	ShieldUserIcon,
	ShieldXIcon,
	UserMinusIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	Field,
	FieldError,
	FieldGroup,
	FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { authClient } from "@/server/better-auth/client";

type ListMembersResponse = Awaited<
	ReturnType<typeof authClient.organization.listMembers>
>;
type MemberRecord = NonNullable<ListMembersResponse["data"]>["members"][number];
type InvitationRole = "admin" | "member";

export function UserList() {
	const activeOrganization = authClient.useActiveOrganization();
	const session = authClient.useSession();

	const inviteDefaultValues: { email: string; role: InvitationRole } = {
		email: "",
		role: "member",
	};

	const inviteForm = useForm({
		defaultValues: {
			...inviteDefaultValues,
		},
		onSubmit: async ({ value }) => {
			const organizationId = activeOrganization.data?.id;
			if (!organizationId) {
				toast.error("Keine aktive Organisation ausgewählt");
				return;
			}

			const result = await authClient.organization.inviteMember({
				email: value.email,
				role: value.role,
				organizationId,
			});

			if (result.error) {
				toast.error("Einladung konnte nicht gesendet werden", {
					description:
						result.error.message ?? "Ein unerwarteter Fehler ist aufgetreten",
				});
				return;
			}

			toast.success("Einladung wurde versendet");
			inviteForm.reset();
			void activeOrganization.refetch();
		},
	});

	const handleRoleChange = async (
		memberId: string,
		role: "admin" | "member",
	) => {
		const result = await authClient.organization.updateMemberRole({
			memberId,
			role,
		});

		if (result.error) {
			toast.error("Rolle konnte nicht aktualisiert werden", {
				description:
					result.error.message ?? "Ein unerwarteter Fehler ist aufgetreten",
			});
			return;
		}

		toast.success("Rolle wurde aktualisiert");
		void activeOrganization.refetch();
	};

	const handleRemoveMember = async (memberIdOrEmail: string) => {
		const result = await authClient.organization.removeMember({
			memberIdOrEmail,
		});

		if (result.error) {
			toast.error("Mitglied konnte nicht entfernt werden", {
				description:
					result.error.message ?? "Ein unerwarteter Fehler ist aufgetreten",
			});
			return;
		}

		toast.success("Mitglied wurde entfernt");
		void activeOrganization.refetch();
	};

	if (!activeOrganization.data) {
		return null;
	}

	const currentUserId = session.data?.user.id;
	const members = activeOrganization.data.members;
	const isLoadingMembers =
		activeOrganization.isPending || activeOrganization.isRefetching;

	return (
		<div className="space-y-10">
			<section className="rounded-lg border p-6 shadow-sm">
				<h2 className="font-semibold text-lg">Mitglied einladen</h2>
				<p className="mt-1 text-muted-foreground text-sm">
					Lade weitere Personen in {activeOrganization.data.name} ein.
				</p>
				<form
					className="mt-6"
					onSubmit={(event) => {
						event.preventDefault();
						void inviteForm.handleSubmit();
					}}
				>
					<FieldGroup>
						<div className="grid gap-4 md:grid-cols-[1fr_180px_auto]">
							<inviteForm.Field
								name="email"
								validators={{
									onSubmit: ({ value }) => {
										const email = value.trim();
										if (email.length === 0) {
											return {
												message: "Bitte gib eine E-Mail-Adresse ein.",
											};
										}
										if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
											return {
												message: "Bitte gib eine gültige E-Mail-Adresse ein.",
											};
										}
										return undefined;
									},
								}}
							>
								{(field) => (
									<Field data-invalid={!field.state.meta.isValid}>
										<FieldLabel htmlFor={field.name}>E-Mail</FieldLabel>
										<Input
											id={field.name}
											name={field.name}
											onBlur={field.handleBlur}
											onChange={(event) => field.handleChange(event.target.value)}
											placeholder="max@move-ev.de"
											value={field.state.value}
										/>
										<FieldError errors={field.state.meta.errors} />
									</Field>
								)}
							</inviteForm.Field>
							<inviteForm.Field name="role">
								{(field) => (
									<Field>
										<FieldLabel htmlFor={field.name}>Rolle</FieldLabel>
										<Select
											onValueChange={(value) =>
												field.handleChange(value === "admin" ? "admin" : "member")
											}
											value={field.state.value}
										>
											<SelectTrigger className="w-full">
												<SelectValue />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value="member">Mitglied</SelectItem>
												<SelectItem value="admin">Admin</SelectItem>
											</SelectContent>
										</Select>
									</Field>
								)}
							</inviteForm.Field>
							<div className="flex items-end">
								<Button disabled={inviteForm.state.isSubmitting} type="submit">
									<MailPlusIcon />
									Einladen
								</Button>
							</div>
						</div>
					</FieldGroup>
				</form>
			</section>

			<section className="overflow-x-auto rounded-lg border shadow-sm">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Name</TableHead>
							<TableHead>E-Mail</TableHead>
							<TableHead>Rolle</TableHead>
							<TableHead className="text-right">Aktionen</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{isLoadingMembers ? (
							<TableRow>
								<TableCell className="text-muted-foreground" colSpan={4}>
									Mitglieder werden geladen...
								</TableCell>
							</TableRow>
						) : (
							members.map((member) => {
								const initials = member.user.name
									?.split(" ")
									.map((name: string) => name.charAt(0))
									.join("");

								return (
									<TableRow key={member.id}>
										<TableCell className="flex gap-2 font-medium">
											<Avatar className="size-5">
												<AvatarImage src={member.user.image ?? undefined} />
												<AvatarFallback>{initials}</AvatarFallback>
											</Avatar>
											{member.user.name}
										</TableCell>
										<TableCell>{member.user.email}</TableCell>
										<TableCell>{member.role}</TableCell>
										<TableCell className="text-right">
											<MemberActions
												currentUserId={currentUserId}
												member={member}
												onRemove={handleRemoveMember}
												onRoleChange={handleRoleChange}
											/>
										</TableCell>
									</TableRow>
								);
							})
						)}
					</TableBody>
				</Table>
			</section>

			<section className="rounded-lg border p-6 shadow-sm">
				<h2 className="font-semibold text-lg">Ausstehende Einladungen</h2>
				<div className="mt-4 space-y-3">
					{activeOrganization.data.invitations.length === 0 ? (
						<p className="text-muted-foreground text-sm">
							Keine ausstehenden Einladungen.
						</p>
					) : (
						activeOrganization.data.invitations.map((invitation) => (
							<div
								className="flex flex-col gap-1 rounded-md border p-3 text-sm"
								key={invitation.id}
							>
								<span className="font-medium">{invitation.email}</span>
								<span className="text-muted-foreground">
									Rolle: {invitation.role ?? "member"} · Status: {invitation.status}
								</span>
							</div>
						))
					)}
				</div>
			</section>
		</div>
	);
}

function MemberActions({
	currentUserId,
	member,
	onRemove,
	onRoleChange,
}: {
	currentUserId: string | undefined;
	member: MemberRecord;
	onRemove: (memberIdOrEmail: string) => Promise<void>;
	onRoleChange: (memberId: string, role: "admin" | "member") => Promise<void>;
}) {
	const isCurrentUser = currentUserId === member.userId;
	const isOwner = member.role === "owner";

	return (
		<DropdownMenu>
			<DropdownMenuTrigger render={<Button size="icon" variant="ghost" />}>
				<EllipsisIcon />
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="w-full min-w-48 max-w-72">
				<DropdownMenuItem
					disabled={isCurrentUser || isOwner || member.role === "admin"}
					onClick={() => onRoleChange(member.id, "admin")}
				>
					<ShieldUserIcon /> Zu Admin machen
				</DropdownMenuItem>
				<DropdownMenuItem
					disabled={isCurrentUser || isOwner || member.role !== "admin"}
					onClick={() => onRoleChange(member.id, "member")}
				>
					<ShieldXIcon /> Admin entziehen
				</DropdownMenuItem>
				<DropdownMenuItem
					disabled={isCurrentUser || isOwner}
					onClick={() => onRemove(member.id)}
					variant="destructive"
				>
					<UserMinusIcon /> Entfernen
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
