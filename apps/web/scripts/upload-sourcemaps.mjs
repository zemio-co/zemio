#!/usr/bin/env node
/**
 * Uploads browser sourcemaps to AppSignal's private sourcemap endpoint.
 *
 * Private rather than public: the maps embed the original source
 * (`sourcesContent`), so serving them next to the chunks would publish the
 * frontend. The build strips them from the image; this puts them somewhere only
 * AppSignal can read.
 *
 * AppSignal resolves a backtrace by matching the *full URL* of the minified
 * file, so each map is uploaded against the public URL of the chunk it belongs
 * to — which is why the environment's origin is an input. Matching is also
 * scoped by `revision`: it must be the same commit that is baked into the image
 * as APP_REVISION, or a map is stored and never used.
 *
 * Plain Node with no dependencies on purpose — this runs in CI against the
 * exported maps, without installing the monorepo.
 *
 * Usage:
 *   APPSIGNAL_PUSH_API_KEY=... APPSIGNAL_APP_NAME="zemio-web" \
 *   APPSIGNAL_APP_ENV=staging APP_REVISION=<sha> \
 *   ASSET_ORIGIN=https://staging.zemio.co \
 *   node apps/web/scripts/upload-sourcemaps.mjs [sourcemapDir]
 */

import { readdir, readFile, stat } from "node:fs/promises";
import { join, relative, sep } from "node:path";

const ENDPOINT = "https://appsignal.com/api/sourcemaps";

/** AppSignal refuses anything larger. */
const MAX_FILE_BYTES = 100 * 1024 * 1024;

/** Concurrent uploads. One file per request, so this is the only lever. */
const CONCURRENCY = 4;

const MAX_ATTEMPTS = 3;

/** How much of a rejected response to quote. Enough for AppSignal's JSON. */
const MAX_ERROR_BODY_CHARS = 500;

function required(name) {
	const value = process.env[name];
	if (!value) {
		console.error(`Missing required environment variable: ${name}`);
		process.exit(1);
	}
	return value;
}

async function collectMaps(dir) {
	const found = [];
	for (const entry of await readdir(dir, { withFileTypes: true })) {
		const path = join(dir, entry.name);
		if (entry.isDirectory()) {
			found.push(...(await collectMaps(path)));
		} else if (entry.name.endsWith(".map")) {
			found.push(path);
		}
	}
	return found;
}

/**
 * Turns an exported map path into the public URL of the file it maps.
 *
 * The export preserves paths relative to `.next/static`, which Next serves at
 * `/_next/static` — so `chunks/abc.js.map` describes
 * `<origin>/_next/static/chunks/abc.js`.
 */
function assetUrlFor(mapPath, root, origin) {
	const relativePath = relative(root, mapPath).split(sep).join("/");
	return `${origin}/_next/static/${relativePath.replace(/\.map$/, "")}`;
}

/**
 * Whether another attempt could plausibly succeed.
 *
 * 5xx is AppSignal having a bad moment and 429 is it asking us to slow down.
 * Every other rejection is a configuration problem — a wrong key, or an app
 * name and environment that do not exist — which retrying cannot fix.
 */
function isRetryable(status) {
	return status >= 500 || status === 429;
}

/** Waits before the next attempt; a no-op once they are exhausted. */
async function backoff(attempt) {
	if (attempt >= MAX_ATTEMPTS) {
		return;
	}
	await new Promise((resolve) => setTimeout(resolve, 500 * 2 ** attempt));
}

/**
 * A rejected response as one line, its body included.
 *
 * The body is the only place AppSignal explains a 400, and a 404 does not mean
 * "endpoint missing" — it means the app name, environment and push key name no
 * app between them. Neither is guessable from the status alone, and this runs
 * unattended, so the response is the only evidence anyone will have.
 */
async function describeFailure(response) {
	const body = (await response.text().catch(() => "")).trim();
	const hint =
		response.status === 404
			? ` — no app "${process.env.APPSIGNAL_APP_NAME}" in environment ` +
				`"${process.env.APPSIGNAL_APP_ENV}" for this push API key`
			: "";
	const quoted = body ? `: ${body.slice(0, MAX_ERROR_BODY_CHARS)}` : "";
	return `${response.status} ${response.statusText}${hint}${quoted}`;
}

async function upload(mapPath, { root, origin, query, revision }) {
	const size = (await stat(mapPath)).size;
	if (size > MAX_FILE_BYTES) {
		throw new Error(
			`${mapPath} is ${size} bytes, over AppSignal's ${MAX_FILE_BYTES} limit`,
		);
	}

	const assetUrl = assetUrlFor(mapPath, root, origin);
	const body = new FormData();
	body.append("name[]", assetUrl);
	body.append("revision", revision);
	body.append(
		"file",
		new Blob([await readFile(mapPath)]),
		mapPath.split(sep).pop(),
	);

	let lastFailure = "upload failed";
	for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
		let response;
		try {
			response = await fetch(`${ENDPOINT}?${query}`, {
				method: "POST",
				body,
			});
		} catch (error) {
			// No response at all — DNS, TLS, a dropped connection. Always worth
			// another attempt.
			lastFailure = error instanceof Error ? error.message : String(error);
			await backoff(attempt);
			continue;
		}

		if (response.ok) {
			return assetUrl;
		}

		lastFailure = await describeFailure(response);
		if (!isRetryable(response.status)) {
			throw new Error(`${assetUrl}: ${lastFailure}`);
		}
		await backoff(attempt);
	}
	throw new Error(`${assetUrl}: ${lastFailure}`);
}

async function main() {
	const root = process.argv[2] ?? "sourcemaps";
	const origin = required("ASSET_ORIGIN").replace(/\/$/, "");
	const revision = required("APP_REVISION");
	const query = new URLSearchParams({
		push_api_key: required("APPSIGNAL_PUSH_API_KEY"),
		app_name: required("APPSIGNAL_APP_NAME"),
		environment: required("APPSIGNAL_APP_ENV"),
	}).toString();

	const maps = await collectMaps(root);
	if (maps.length === 0) {
		// Silence here would mean shipping a release whose backtraces stay
		// minified, with nothing to say why.
		console.error(`No .map files under ${root}/ — nothing to upload.`);
		process.exit(1);
	}

	console.log(
		`Uploading ${maps.length} sourcemaps to ${process.env.APPSIGNAL_APP_NAME} ` +
			`(${process.env.APPSIGNAL_APP_ENV}) at revision ${revision}`,
	);

	const queue = [...maps];
	const failures = [];
	let done = 0;

	await Promise.all(
		Array.from({ length: Math.min(CONCURRENCY, queue.length) }, async () => {
			for (let path = queue.shift(); path; path = queue.shift()) {
				try {
					await upload(path, { root, origin, query, revision });
					done += 1;
				} catch (error) {
					failures.push(error instanceof Error ? error.message : String(error));
				}
			}
		}),
	);

	console.log(`Uploaded ${done}/${maps.length}`);
	if (failures.length > 0) {
		console.error(`Failed:\n  ${failures.join("\n  ")}`);
		process.exit(1);
	}
}

await main();
