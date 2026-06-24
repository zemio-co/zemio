import { logger } from "@/lib/logger";

type EventHandler<TEvent> = (event: TEvent) => void | Promise<void>;

/**
 * Minimal typed in-process event bus.
 *
 * Handlers run out-of-band (scheduled on the microtask queue) so emitting never
 * blocks the request path, and a failing handler can never fail the originating
 * mutation. This is intentionally NOT durable — see
 * `docs/trpc-migration-report-slice.md` for the outbox follow-up.
 */
export class EventBus<TEventMap extends Record<string, unknown>> {
	private readonly handlers: {
		[K in keyof TEventMap]?: Array<EventHandler<TEventMap[K]>>;
	} = {};

	on<K extends keyof TEventMap>(
		type: K,
		handler: EventHandler<TEventMap[K]>,
	): void {
		const existing = this.handlers[type];
		if (existing) {
			existing.push(handler);
			return;
		}
		this.handlers[type] = [handler];
	}

	emit<K extends keyof TEventMap>(type: K, event: TEventMap[K]): void {
		const handlers = this.handlers[type];
		if (!handlers) {
			return;
		}

		for (const handler of handlers) {
			void Promise.resolve()
				.then(() => handler(event))
				.catch((error) => {
					logger.error("event.handler_failed", {
						type: String(type),
						error,
					});
					void logger.flush();
				});
		}
	}
}
