"use client";

import {
	Avatar,
	AvatarFallback,
	AvatarImage,
	Properties,
	PropertiesLabel,
	PropertiesList,
	Property,
	PropertyLabel,
	PropertyValue,
} from "@zemio/ui";
import { formatDistanceToNow } from "date-fns";
import {
	CalendarPlusIcon,
	CalendarSyncIcon,
	CreditCardIcon,
	EuroIcon,
	IdCardIcon,
	LoaderIcon,
	TagIcon,
	UserIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useDateFnsLocale } from "@/hooks/use-date-fns-locale";
import { COST_UNIT_COLORS } from "@/lib/colors/cost-units";
import { reportStatusKeys } from "@/lib/i18n-labels";
import { cn } from "@/lib/utils";
import { api } from "@/trpc/react";

function ReviewSidebar({
	className,
	reportId,
	...props
}: React.ComponentProps<"aside"> & { reportId: string }) {
	const t = useTranslations("modules.review.sidebar");
	const tStatus = useTranslations("enums.reportStatus");
	const dateFnsLocale = useDateFnsLocale();

	const query = api.report.review.useQuery({
		id: reportId,
	});

	if (query.isPending) {
		return <div />;
	}

	if (query.error) {
		return <div />;
	}

	const { data: review } = query;
	return (
		<aside
			className={cn("w-fit border-base-200 border-l", className)}
			data-slot="review-sidebar"
			{...props}
		>
			<div className="border-b p-8 pt-11">
				<Properties>
					<PropertiesLabel>{t("propertiesLabel")}</PropertiesLabel>
					<PropertiesList>
						<Property>
							<PropertyLabel>
								<LoaderIcon /> {t("statusLabel")}
							</PropertyLabel>
							<PropertyValue
								format={() => tStatus(reportStatusKeys[review.report.status])}
								value={review.report.status}
							/>
						</Property>
						<Property>
							<PropertyLabel>
								<UserIcon /> {t("ownerLabel")}
							</PropertyLabel>
							<PropertyValue
								format={(value) => (
									<span className="flex items-center justify-center gap-2">
										<Avatar className={"size-4"}>
											<AvatarImage src={review.report.owner.image ?? undefined} />
											<AvatarFallback>{review.report.owner.name.charAt(0)}</AvatarFallback>
										</Avatar>
										<span>{value}</span>
									</span>
								)}
								value={review.report.owner.name}
							/>
						</Property>
						<Property>
							<PropertyLabel>
								<TagIcon /> {t("costUnitLabel")}
							</PropertyLabel>
							<PropertyValue
								format={(value) => (
									<span className="flex items-center justify-center gap-2">
										<span
											className="block size-2 rounded-xs"
											style={{
												backgroundColor:
													COST_UNIT_COLORS[review.report.costUnit.color].fill,
											}}
										/>
										{value}
									</span>
								)}
								value={`${review.report.costUnit.tag}: ${review.report.costUnit.title}`}
							/>
						</Property>

						<Property>
							<PropertyLabel>
								<CalendarPlusIcon /> {t("createdLabel")}
							</PropertyLabel>
							<PropertyValue
								format={(value) =>
									formatDistanceToNow(value, {
										locale: dateFnsLocale,
										addSuffix: true,
									})
								}
								suppressHydrationWarning
								value={review.report.createdAt}
							/>
						</Property>
						<Property>
							<PropertyLabel>
								<CalendarSyncIcon /> {t("lastUpdatedLabel")}
							</PropertyLabel>
							<PropertyValue
								format={(value) =>
									formatDistanceToNow(value, {
										locale: dateFnsLocale,
										addSuffix: true,
									})
								}
								suppressHydrationWarning
								value={review.report.lastUpdatedAt}
							/>
						</Property>
					</PropertiesList>
				</Properties>
			</div>
			<div className="border-base-200 border-b p-8">
				<Properties>
					<PropertiesLabel>{t("transferLabel")}</PropertiesLabel>
					<PropertiesList>
						<Property>
							<PropertyLabel>
								<CreditCardIcon /> {t("ibanLabel")}
							</PropertyLabel>
							<PropertyValue value={review.bankingSummary?.iban ?? ""} />
						</Property>
						<Property>
							<PropertyLabel>
								<IdCardIcon /> {t("accountNameLabel")}
							</PropertyLabel>
							<PropertyValue value={review.bankingSummary?.ownerName ?? ""} />
						</Property>

						<Property>
							<PropertyLabel>
								<EuroIcon /> {t("amountLabel")}
							</PropertyLabel>
							<PropertyValue
								format={(value) => `${value} €`}
								value={review.totalAmount.toFixed(2)}
							/>
						</Property>
					</PropertiesList>
				</Properties>
			</div>
		</aside>
	);
}

export { ReviewSidebar };
