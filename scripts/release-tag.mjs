#!/usr/bin/env node
// Runs as the changesets/action "publish" step on master: no npm packages are
// published (all workspace packages are private), so this replaces `changeset
// publish` with a git tag + GitHub release for the version that `changeset
// version` just wrote to apps/web and apps/api (kept in sync via the "fixed"
// group in .changeset/config.json).
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

function run(command, args) {
	return execFileSync(command, args, { encoding: "utf8", stdio: "pipe" }).trim();
}

const { version } = JSON.parse(readFileSync("apps/web/package.json", "utf8"));
const tag = `v${version}`;

const existingTags = run("git", ["tag", "-l", tag]);
if (existingTags === tag) {
	console.log(`Tag ${tag} already exists, skipping release.`);
	process.exit(0);
}

execFileSync("git", ["tag", tag], { stdio: "inherit" });
execFileSync("git", ["push", "origin", tag], { stdio: "inherit" });
execFileSync(
	"gh",
	["release", "create", tag, "--title", tag, "--generate-notes"],
	{
		stdio: "inherit",
	},
);

console.log(`Released ${tag}.`);
