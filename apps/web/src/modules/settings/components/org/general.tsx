"use client";

import { Dialog as DialogPrimitive, ScrollArea } from "@base-ui/react";
import { useForm } from "@tanstack/react-form";
import { format } from "date-fns";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import React from "react";
import { toast } from "sonner";
import z from "zod";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
	Field,
	FieldDescription,
	FieldError,
	FieldGroup,
	FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import type { WithHandle } from "@/lib/types";
import { cn } from "@/lib/utils";
import { api } from "@/trpc/react";

function OrgSettingsGeneral() {
	const t = useTranslations("modules.settings.general");

	return (
		<section className="container">
			<header className="flex flex-wrap items-start justify-between gap-8">
				<div className="space-y-1">
					<h1 className="font-bold text-2xl text-zinc-800">{t("title")}</h1>
					<p className="text-sm text-zinc-700">{t("description")}</p>
				</div>
			</header>
			<section className="mt-12">
				<OrgGeneralContent />
			</section>
			<section className="mt-24">
				<OrgReviewerContent />
			</section>
		</section>
	);
}

/* begin OrgGeneralContent ========================================================================  */

function OrgGeneralContent({
	className,
	...props
}: React.ComponentProps<"div">) {
	const t = useTranslations("modules.settings.general");
	const orgQuery = api.settings.getOrg.useQuery();

	const updateHandleRef = React.useRef<UpdateOrgGeneralHandle | null>(null);
	if (!updateHandleRef.current)
		updateHandleRef.current = createUpdateOrgGeneralHandle();
	const updateHandle = updateHandleRef.current;

	if (orgQuery.isPending) {
		return <OrgGeneralContentSkeleton className={className} {...props} />;
	}

	if (orgQuery.error) {
		return <OrgGeneralContentError className={className} {...props} />;
	}

	const { data: org } = orgQuery;

	return (
		<div className={cn("", className)} data-slot="org-general-content" {...props}>
			<div className="mb-6 flex justify-between">
				<p className="font-semibold text-slate-800">{t("sections.general")}</p>
				<DialogPrimitive.Trigger
					handle={updateHandle}
					render={
						<Button size={"xs"} variant={"outline"}>
							{t("editButton")}
						</Button>
					}
				/>
			</div>
			<div className="space-y-4">
				<Separator />
				<OrgContentRow
					title={t("rows.logo")}
					value={
						<Avatar className={"size-12 after:rounded-md"}>
							<AvatarImage className={"rounded-md"} src={org.logo ?? undefined} />
							<AvatarFallback className={"rounded-md"}>
								{org.name.charAt(0).toUpperCase()}
							</AvatarFallback>
						</Avatar>
					}
				/>
				<Separator />
				<OrgContentRow title={t("rows.name")} value={org.name} />
				<Separator />
				<OrgContentRow title={t("rows.id")} value={org.id} />
				<Separator />
				<OrgContentRow title={t("rows.tenantId")} value={org.microsoftTenantId} />
				<Separator />
				<OrgContentRow title={t("rows.slug")} value={`/${org.slug}`} />
				<Separator />
				<OrgContentRow
					title={t("rows.createdAt")}
					value={format(org.createdAt, "dd.MM.yyyy '-' HH:mm")}
				/>
				<Separator />
			</div>
			<OrgGeneralEdit
				defaultValues={{ name: org.name, logo: org.logo ?? "" }}
				handle={updateHandle}
			/>
		</div>
	);
}

function OrgGeneralContentSkeleton({
	className,
	...props
}: React.ComponentProps<"div">) {
	return (
		<div
			className={cn("", className)}
			data-slot="org-general-content-skeleton"
			{...props}
		/>
	);
}

function OrgGeneralContentError({
	className,
	...props
}: React.ComponentProps<"div">) {
	return (
		<div
			className={cn("", className)}
			data-slot="org-general-content-skeleton"
			{...props}
		/>
	);
}

/* end OrgGeneralContent ==========================================================================  */

/* begin OrgGeneralEdit ===========================================================================  */

type UpdateOrgGeneralFormValues = z.infer<typeof updateOrgGeneralSchema>;
type UpdateOrgGeneralHandle = ReturnType<typeof DialogPrimitive.createHandle>;

const updateOrgGeneralSchema = z.object({
	name: z.string().min(1),
	logo: z
		.string()
		.refine(
			(val) => val === "" || z.url().safeParse(val).success,
			"Must be a valid URL",
		)
		.transform((val) => (val === "" ? null : val))
		.nullable()
		.optional(),
});
const UPDATE_GENERAL_FORM_ID = "org-update-general-form";

function createUpdateOrgGeneralHandle(): UpdateOrgGeneralHandle {
	return DialogPrimitive.createHandle();
}

function OrgGeneralEdit({
	handle,
	defaultValues,
	...props
}: Omit<React.ComponentProps<typeof DialogPrimitive.Root>, "handle"> &
	WithHandle & { defaultValues: UpdateOrgGeneralFormValues }) {
	const t = useTranslations("modules.settings.general");
	const tActions = useTranslations("modules.settings.actions");
	const utils = api.useUtils();
	const [open, setOpen] = React.useState<boolean>(props.defaultOpen ?? false);

	const updateMutation = api.settings.updateOrgGeneral.useMutation({
		onSuccess: () => {
			toast.success(t("savedToast"));
			utils.settings.getOrg.invalidate();
			handleOpenChange(false);
		},
		onError: (error) => {
			toast.error(t("saveErrorTitle"), {
				description: error.message ?? t("saveErrorFallback"),
			});
		},
	});

	const form = useForm({
		defaultValues,
		validators: {
			onSubmit: updateOrgGeneralSchema,
		},
		onSubmit: ({ value }) => {
			updateMutation.mutate({
				...value,
			});
		},
	});

	const handleOpenChange = (open: boolean) => {
		if (!open) {
			form.reset();
		}

		setOpen(open);
	};

	return (
		<DialogPrimitive.Root
			handle={handle}
			onOpenChange={handleOpenChange}
			open={open}
			{...props}
		>
			<DialogPrimitive.Portal>
				<DialogPrimitive.Backdrop className="data-closed:fade-out-0 data-open:fade-in-0 fixed inset-0 isolate z-50 bg-black/10 duration-100 data-closed:animate-out data-open:animate-in supports-backdrop-filter:backdrop-blur-xs" />
				<DialogPrimitive.Viewport className="fixed inset-0 z-60 flex items-center justify-center overflow-hidden py-6 [@media(min-height:600px)]:pt-8 [@media(min-height:600px)]:pb-12">
					<DialogPrimitive.Popup className="relative flex max-h-full min-h-0 w-[min(40rem,calc(100vw-2rem))] max-w-full flex-col rounded-lg border border-slate-200 bg-white text-slate-800 transition-[scale,opacity] duration-100 ease-out data-ending-style:scale-[0.98] data-starting-style:scale-[0.98] data-ending-style:opacity-0 data-starting-style:opacity-0 dark:border-white dark:bg-neutral-950 dark:text-white dark:shadow-none">
						<div className="flex flex-col gap-1 border-slate-200 border-b px-4 py-5">
							<DialogPrimitive.Title
								className={"font-semibold text-slate-800 text-xl leading-none"}
							>
								{t("updateDialog.title")}
							</DialogPrimitive.Title>
						</div>
						<ScrollArea.Root className="relative flex min-h-0 flex-auto overflow-hidden has-[>_:first-child:focus-visible]:outline-2 has-[>_:first-child:focus-visible]:outline-blue-200 has-[>_:first-child:focus-visible]:outline-offset-0 dark:has-[>_:first-child:focus-visible]:outline-white">
							<ScrollArea.Viewport className="min-h-0 flex-auto overflow-y-auto overscroll-contain outline-none">
								<ScrollArea.Content className="flex flex-col">
									<form
										className="px-4 py-6"
										id={UPDATE_GENERAL_FORM_ID}
										onSubmit={(e) => {
											e.preventDefault();
											form.handleSubmit();
										}}
									>
										<FieldGroup>
											<div className="flex flex-nowrap gap-4">
												<form.Field name={"logo"}>
													{({ state, ...field }) => {
														const isInvalid = !state.meta.isValid && state.meta.isTouched;

														return (
															<Field className="grow" data-invalid={isInvalid}>
																<FieldLabel htmlFor={field.name}>
																	{t("updateDialog.logoLabel")}
																</FieldLabel>
																<Input
																	aria-invalid={isInvalid}
																	id={field.name}
																	name={field.name}
																	onBlur={field.handleBlur}
																	onChange={(e) => field.handleChange(e.currentTarget.value)}
																	placeholder={t("updateDialog.logoPlaceholder")}
																	value={state.value ?? ""}
																/>
																<FieldDescription>
																	{t("updateDialog.logoDescription")}
																</FieldDescription>
																{isInvalid && <FieldError errors={state.meta.errors} />}
															</Field>
														);
													}}
												</form.Field>
												<div className="shrink-0">
													<form.Subscribe selector={(s) => ({ values: s.values })}>
														{({ values: { logo, name } }) => (
															<Avatar className={"size-[3.71875rem] after:rounded-md"}>
																<AvatarImage
																	className={"rounded-md"}
																	src={logo && logo !== "" ? logo : undefined}
																/>
																<AvatarFallback className={"rounded-md"}>
																	{name.charAt(0).toUpperCase()}
																</AvatarFallback>
															</Avatar>
														)}
													</form.Subscribe>
												</div>
											</div>
											<form.Field name={"name"}>
												{({ state, ...field }) => {
													const isInvalid = !state.meta.isValid && state.meta.isTouched;

													return (
														<Field data-invalid={isInvalid}>
															<FieldLabel htmlFor={field.name}>
																{t("updateDialog.nameLabel")}
															</FieldLabel>
															<Input
																aria-invalid={isInvalid}
																id={field.name}
																name={field.name}
																onBlur={field.handleBlur}
																onChange={(e) => field.handleChange(e.currentTarget.value)}
																placeholder={t("updateDialog.namePlaceholder")}
																value={state.value}
															/>
															<FieldDescription>
																{t("updateDialog.nameDescription")}
															</FieldDescription>
															{isInvalid && <FieldError errors={state.meta.errors} />}
														</Field>
													);
												}}
											</form.Field>
										</FieldGroup>
									</form>
								</ScrollArea.Content>
							</ScrollArea.Viewport>
							<ScrollArea.Scrollbar>
								<ScrollArea.Thumb />
							</ScrollArea.Scrollbar>
						</ScrollArea.Root>
						<div className="flex justify-end gap-3 rounded-b-lg border-slate-200 border-t bg-slate-50 px-4 py-3 dark:border-white">
							<DialogPrimitive.Close
								render={
									<Button size={"sm"} variant={"outline"}>
										{tActions("cancel")}
									</Button>
								}
							/>
							<form.Subscribe
								selector={(s) => ({
									canSubmit: s.canSubmit,
									isSubmitting: s.isSubmitting,
									isDefaultValue: s.isDefaultValue,
								})}
							>
								{({ canSubmit, isSubmitting, isDefaultValue }) => (
									<Button
										disabled={
											!canSubmit ||
											isSubmitting ||
											isDefaultValue ||
											updateMutation.isPending
										}
										form={UPDATE_GENERAL_FORM_ID}
										size={"sm"}
										type="submit"
									>
										{tActions("save")}
									</Button>
								)}
							</form.Subscribe>
						</div>
					</DialogPrimitive.Popup>
				</DialogPrimitive.Viewport>
			</DialogPrimitive.Portal>
		</DialogPrimitive.Root>
	);
}

/* end OrgGeneralEdit ==============================================================================  */

/* begin OrgReviewerContent ========================================================================  */

function OrgReviewerContent({
	className,
	...props
}: React.ComponentProps<"div">) {
	const t = useTranslations("modules.settings.general");
	const orgQuery = api.settings.get.useQuery();

	const updateHandleRef = React.useRef<UpdateOrgGeneralHandle | null>(null);
	if (!updateHandleRef.current)
		updateHandleRef.current = createUpdateOrgReviewerHandle();
	const updateHandle = updateHandleRef.current;

	if (orgQuery.isPending) {
		return <OrgReviewerContentSkeleton className={className} {...props} />;
	}

	if (orgQuery.error) {
		return <OrgReviewerContentError className={className} {...props} />;
	}

	const { data: org } = orgQuery;

	return (
		<div className={cn("", className)} data-slot="org-general-content" {...props}>
			<div className="mb-6 flex justify-between">
				<p className="font-semibold text-slate-800">{t("sections.reviewer")}</p>
				<DialogPrimitive.Trigger
					handle={updateHandle}
					render={
						<Button size={"xs"} variant={"outline"}>
							{t("editButton")}
						</Button>
					}
				/>
			</div>
			<div className="space-y-4">
				<Separator />
				<OrgContentRow
					title={t("rows.reviewer")}
					value={org.reviewerEmail ?? t("rows.reviewerEmpty")}
				/>
			</div>
			<OrgReviewerEdit
				defaultValues={{
					reviewerEmail: org.reviewerEmail ?? "",
				}}
				handle={updateHandle}
			/>
		</div>
	);
}

function OrgReviewerContentSkeleton({
	className,
	...props
}: React.ComponentProps<"div">) {
	return (
		<div
			className={cn("", className)}
			data-slot="org-general-content-skeleton"
			{...props}
		/>
	);
}

function OrgReviewerContentError({
	className,
	...props
}: React.ComponentProps<"div">) {
	return (
		<div
			className={cn("", className)}
			data-slot="org-general-content-skeleton"
			{...props}
		/>
	);
}

/* end OrgGeneralContent ==========================================================================  */

/* begin OrgGeneralEdit ===========================================================================  */

type UpdateOrgReviewerFormValues = z.infer<typeof updateOrgReviewerSchema>;
type UpdateOrgReviewerHandle = ReturnType<typeof DialogPrimitive.createHandle>;

const updateOrgReviewerSchema = z.object({
	reviewerEmail: z
		.string()
		.refine(
			(val) => val === "" || z.email().safeParse(val).success,
			"Must be a valid E-Mail",
		)
		.transform((val) => (val === "" ? null : val))
		.nullable()
		.optional(),
});
const UPDATE_REVIEWER_FORM_ID = "org-update-reviewer-form";

function createUpdateOrgReviewerHandle(): UpdateOrgReviewerHandle {
	return DialogPrimitive.createHandle();
}

function OrgReviewerEdit({
	handle,
	defaultValues,
	...props
}: Omit<React.ComponentProps<typeof DialogPrimitive.Root>, "handle"> &
	WithHandle & { defaultValues: UpdateOrgReviewerFormValues }) {
	const t = useTranslations("modules.settings.general");
	const tActions = useTranslations("modules.settings.actions");
	const utils = api.useUtils();
	const [open, setOpen] = React.useState<boolean>(props.defaultOpen ?? false);

	const updateMutation = api.settings.update.useMutation({
		onSuccess: () => {
			toast.success(t("reviewerSavedToast"));
			utils.settings.get.invalidate();
			handleOpenChange(false);
		},
		onError: (error) => {
			toast.error(t("reviewerSaveErrorTitle"), {
				description: error.message ?? t("saveErrorFallback"),
			});
		},
	});

	const form = useForm({
		defaultValues,
		validators: {
			onSubmit: updateOrgReviewerSchema,
		},
		onSubmit: ({ value }) => {
			updateMutation.mutate({
				reviewerEmail: value.reviewerEmail,
			});
		},
	});

	const handleOpenChange = (open: boolean) => {
		if (!open) {
			form.reset();
		}

		setOpen(open);
	};

	return (
		<DialogPrimitive.Root
			handle={handle}
			onOpenChange={handleOpenChange}
			open={open}
			{...props}
		>
			<DialogPrimitive.Portal>
				<DialogPrimitive.Backdrop className="data-closed:fade-out-0 data-open:fade-in-0 fixed inset-0 isolate z-50 bg-black/10 duration-100 data-closed:animate-out data-open:animate-in supports-backdrop-filter:backdrop-blur-xs" />
				<DialogPrimitive.Viewport className="fixed inset-0 z-60 flex items-center justify-center overflow-hidden py-6 [@media(min-height:600px)]:pt-8 [@media(min-height:600px)]:pb-12">
					<DialogPrimitive.Popup className="relative flex max-h-full min-h-0 w-[min(40rem,calc(100vw-2rem))] max-w-full flex-col rounded-lg border border-slate-200 bg-white text-slate-800 transition-[scale,opacity] duration-100 ease-out data-ending-style:scale-[0.98] data-starting-style:scale-[0.98] data-ending-style:opacity-0 data-starting-style:opacity-0 dark:border-white dark:bg-neutral-950 dark:text-white dark:shadow-none">
						<div className="flex flex-col gap-1 border-slate-200 border-b px-4 py-5">
							<DialogPrimitive.Title
								className={"font-semibold text-slate-800 text-xl leading-none"}
							>
								{t("reviewerDialog.title")}
							</DialogPrimitive.Title>
						</div>
						<ScrollArea.Root className="relative flex min-h-0 flex-auto overflow-hidden has-[>_:first-child:focus-visible]:outline-2 has-[>_:first-child:focus-visible]:outline-blue-200 has-[>_:first-child:focus-visible]:outline-offset-0 dark:has-[>_:first-child:focus-visible]:outline-white">
							<ScrollArea.Viewport className="min-h-0 flex-auto overflow-y-auto overscroll-contain outline-none">
								<ScrollArea.Content className="flex flex-col">
									<form
										className="px-4 py-6"
										id={UPDATE_REVIEWER_FORM_ID}
										onSubmit={(e) => {
											e.preventDefault();
											form.handleSubmit();
										}}
									>
										<FieldGroup>
											<form.Field name={"reviewerEmail"}>
												{({ state, ...field }) => {
													const isInvalid = !state.meta.isValid && state.meta.isTouched;

													return (
														<Field data-invalid={isInvalid}>
															<FieldLabel htmlFor={field.name}>
																{t("reviewerDialog.fieldLabel")}
															</FieldLabel>
															<Input
																aria-invalid={isInvalid}
																id={field.name}
																name={field.name}
																onBlur={field.handleBlur}
																onChange={(e) => field.handleChange(e.currentTarget.value)}
																placeholder={t("reviewerDialog.placeholder")}
																value={state.value ?? ""}
															/>
															<FieldDescription>
																{t("reviewerDialog.fieldDescription")}
															</FieldDescription>
															{isInvalid && <FieldError errors={state.meta.errors} />}
														</Field>
													);
												}}
											</form.Field>
										</FieldGroup>
									</form>
								</ScrollArea.Content>
							</ScrollArea.Viewport>
							<ScrollArea.Scrollbar>
								<ScrollArea.Thumb />
							</ScrollArea.Scrollbar>
						</ScrollArea.Root>
						<div className="flex justify-end gap-3 rounded-b-lg border-slate-200 border-t bg-slate-50 px-4 py-3 dark:border-white">
							<DialogPrimitive.Close
								render={
									<Button size={"sm"} variant={"outline"}>
										{tActions("cancel")}
									</Button>
								}
							/>
							<form.Subscribe
								selector={(s) => ({
									canSubmit: s.canSubmit,
									isSubmitting: s.isSubmitting,
									isDefaultValue: s.isDefaultValue,
								})}
							>
								{({ canSubmit, isSubmitting, isDefaultValue }) => (
									<Button
										disabled={
											!canSubmit ||
											isSubmitting ||
											isDefaultValue ||
											updateMutation.isPending
										}
										form={UPDATE_REVIEWER_FORM_ID}
										size={"sm"}
										type="submit"
									>
										{tActions("save")}
									</Button>
								)}
							</form.Subscribe>
						</div>
					</DialogPrimitive.Popup>
				</DialogPrimitive.Viewport>
			</DialogPrimitive.Portal>
		</DialogPrimitive.Root>
	);
}

/* end OrgGeneralEdit =============================================================================  */

/* begin OrgContentRow ============================================================================  */

function OrgContentRow({
	className,
	title,
	value,
	...props
}: Omit<React.ComponentProps<"div">, "title"> & {
	title: ReactNode;
	value: ReactNode;
}) {
	return (
		<div
			className={cn("flex gap-4", className)}
			data-slot="org-general-content-row"
			{...props}
		>
			<div className="w-72">
				<span className="font-medium text-slate-800 text-sm">{title}</span>
			</div>
			<div>
				<span className="text-slate-500 text-sm">{value}</span>
			</div>
		</div>
	);
}

/* end OrgContentRow ==============================================================================  */

export { OrgSettingsGeneral };
