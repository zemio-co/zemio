import "server-only";

import { Logger } from "@logtail/next";

/**
 * Server-side structured logger backed by Better Stack Logs.
 *
 * Use this in any server-only code (tRPC routers, storage clients, PDF generation, etc.).
 * Always call `void logger.flush()` after logging in fire-and-forget contexts, or
 * `await logger.flush()` before re-throwing errors to guarantee delivery.
 */
export const logger = new Logger();
