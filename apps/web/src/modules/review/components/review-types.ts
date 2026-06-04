import type { RouterOutputs } from "@/trpc/react";

type ReviewReadModel = RouterOutputs["admin"]["getReview"];
type ReviewReport = ReviewReadModel["report"];
type ReviewExpense = ReviewReadModel["expenses"][number];
type ReviewAttachment = ReviewReadModel["attachments"][number];

type ReviewLoadState = {
	loading?: boolean;
	errorMessage?: string;
};

export type {
	ReviewAttachment,
	ReviewExpense,
	ReviewLoadState,
	ReviewReadModel,
	ReviewReport,
};
