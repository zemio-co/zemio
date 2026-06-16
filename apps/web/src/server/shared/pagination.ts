/** Prisma `skip`/`take` for a 1-based offset page. The shared offset contract. */
export function offsetPageArgs(input: { page: number; pageSize: number }): {
	skip: number;
	take: number;
} {
	return {
		skip: (input.page - 1) * input.pageSize,
		take: input.pageSize,
	};
}

/** Total number of pages for an offset-paginated result. */
export function pageCount(totalCount: number, pageSize: number): number {
	return Math.ceil(totalCount / pageSize);
}
