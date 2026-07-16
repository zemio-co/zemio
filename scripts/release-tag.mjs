#!/usr/bin/env node
// Runs as the "publish" step of release-master.yml: no npm packages are
// published (every workspace package is private), so this replaces `changeset
// publish` with a git tag + GitHub release for the version that `changeset
// version` wrote to apps/web and apps/api (kept in sync by the "fixed" group in
// .changeset/config.json).
//
// The release body is taken from the generated CHANGELOG.md files rather than
// from `gh release create --generate-notes`, so the GitHub release and the
// changelog are the same text derived from the same changesets, instead of two
// competing descriptions of one release.
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

// Apps sharing the single repo-wide version. Order determines the order of the
// sections in the release body.
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
 * it). Returns null when the version has no section or an empty one — the
 * normal case for an app that had no changesets of its own and was only bumped
 * to keep the fixed group aligned.
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
 * Builds the GitHub release body from every app's changelog section.
 *
 * @param {string} version Version being released.
 * @returns {string}
 * @throws When no app has a changelog entry for the version.
 */
function buildReleaseNotes(version) {
	const sections = [];

	for (const app of RELEASED_APPS) {
		const section = readAppSection(app, version);
		if (section === null) {
			console.log(
				`No changelog entry for @zemio/${app} in ${version}; omitting it from the release notes.`,
			);
			continue;
		}
		sections.push(`## @zemio/${app}\n\n${section}`);
	}

	if (sections.length === 0) {
		throw new Error(
			`No changelog entry for ${version} in any of: ${RELEASED_APPS.join(", ")}. ` +
				"Refusing to publish a release with an empty body.",
		);
	}

	return sections.join("\n\n");
}

function main() {
	const { version } = JSON.parse(readFileSync("apps/web/package.json", "utf8"));
	const tag = `v${version}`;

	if (git(["tag", "-l", tag]) === tag) {
		console.log(`Tag ${tag} already exists; skipping release.`);
		return;
	}

	// Built before tagging: a missing or empty changelog must fail the run
	// before it pushes a tag that would then need to be deleted by hand.
	const notes = buildReleaseNotes(version);

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

// Guarded so the pure helpers above can be imported by a test without the
// import triggering a release.
if (process.argv[1]?.endsWith("release-tag.mjs")) {
	main();
}
