#!/usr/bin/env node
// Runs as the release step of release-master.yml: no npm packages are
// published (every workspace package is private), so this replaces `changeset
// publish` with a git tag + GitHub release per app, using the version that
// `changeset version` wrote to apps/<app>/package.json. web and api version
// independently (no "fixed" group in .changeset/config.json), so each app is
// tagged and released on its own — a change to one doesn't tag the other.
//
// The release body is taken from the generated CHANGELOG.md rather than from
// `gh release create --generate-notes`, so the GitHub release and the
// changelog are the same text derived from the same changesets, instead of
// two competing descriptions of one release.
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

// Apps released independently. Each gets its own tag: `<app>-v<version>`.
const RELEASED_APPS = ["web", "api"];

function git(args) {
	return execFileSync("git", args, { encoding: "utf8" }).trim();
}

/**
 * Extracts the body of one version's section from a changesets-generated
 * CHANGELOG.md.
 *
 * A section runs from its `## <version>` heading to the next `## ` heading
 * (`### Minor Changes` and friends are nested inside it and do not terminate
 * it). Returns null when the version has no section or an empty one.
 *
 * @param {string} changelog Raw CHANGELOG.md contents.
 * @param {string} version Version to extract, without a leading "v".
 * @returns {string | null}
 */
export function extractVersionSection(changelog, version) {
	const lines = changelog.split("\n");
	const start = lines.findIndex((line) => line.trim() === `## ${version}`);
	if (start === -1) {
		return null;
	}

	const rest = lines.slice(start + 1);
	const end = rest.findIndex((line) => line.startsWith("## "));
	const body = (end === -1 ? rest : rest.slice(0, end)).join("\n").trim();

	return body.length > 0 ? body : null;
}

/**
 * Reads one app's changelog section for the given version.
 *
 * @param {string} app Directory name under apps/.
 * @param {string} version Version to extract.
 * @returns {string | null}
 */
function readAppSection(app, version) {
	const path = `apps/${app}/CHANGELOG.md`;
	if (!existsSync(path)) {
		return null;
	}
	return extractVersionSection(readFileSync(path, "utf8"), version);
}

/**
 * Tags and releases a single app if its current version isn't already
 * tagged. Skips (without error) when there's nothing new to release — the
 * normal case for the app that didn't change in this release cycle.
 *
 * @param {string} app Directory name under apps/.
 */
function releaseApp(app) {
	const { version } = JSON.parse(
		readFileSync(`apps/${app}/package.json`, "utf8"),
	);
	const tag = `${app}-v${version}`;

	if (git(["tag", "-l", tag]) === tag) {
		console.log(`Tag ${tag} already exists; skipping @zemio/${app}.`);
		return;
	}

	const notes = readAppSection(app, version);
	if (notes === null) {
		console.log(
			`No changelog entry for @zemio/${app} in ${version}; skipping release.`,
		);
		return;
	}

	execFileSync("git", ["tag", tag], { stdio: "inherit" });
	execFileSync("git", ["push", "origin", tag], { stdio: "inherit" });
	execFileSync(
		"gh",
		["release", "create", tag, "--title", tag, "--notes", notes],
		{
			stdio: "inherit",
		},
	);

	console.log(`Released ${tag}.`);
}

function main() {
	for (const app of RELEASED_APPS) {
		releaseApp(app);
	}
}

// Guarded so the pure helpers above can be imported by a test without the
// import triggering a release.
if (process.argv[1]?.endsWith("release-tag.mjs")) {
	main();
}
