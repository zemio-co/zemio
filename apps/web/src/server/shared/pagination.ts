import { z } from "zod";

const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 100;

/**
 * Shared cursor-pagination input. Default contract for list endpoints that feed
 * infinite-scroll views.
 */
export const cursorPaginationInput = z.object({
	limit: z.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
	cursor: z.string().nullish(),
});

export type CursorPaginationInput = z.infer<typeof cursorPaginationInput>;

export type CursorPage<TItem> = {
	items: TItem[];
	nextCursor: string | undefined;
	totalCount: number;
};

/**
 * Splits an over-fetched result set (`limit + 1` rows) into the page plus the
 * next cursor. Pass the rows fetched with `take: limit + 1` and a selector for
 * the cursor field. Pure: it does not mutate the input array.
 */
export function toCursorPage<TItem>(
	rows: TItem[],
	limit: number,
	totalCount: number,
	getCursor: (item: TItem) => string,
): CursorPage<TItem> {
	if (rows.length <= limit) {
		return { items: rows, nextCursor: undefined, totalCount };
	}

	const nextItem = rows[limit];
	return {
		items: rows.slice(0, limit),
		nextCursor: nextItem ? getCursor(nextItem) : undefined,
		totalCount,
	};
}
