import { readFileSync } from "node:fs";
import { join } from "node:path";

function collectKeys(value: unknown, prefix = ""): string[] {
	if (typeof value !== "object" || value === null) {
		return [prefix];
	}
	return Object.entries(value).flatMap(([key, child]) =>
		collectKeys(child, prefix ? `${prefix}.${key}` : key),
	);
}

const messagesDir = join(import.meta.dirname, "..", "messages");
const de = JSON.parse(readFileSync(join(messagesDir, "de.json"), "utf8"));
const en = JSON.parse(readFileSync(join(messagesDir, "en.json"), "utf8"));

const deKeys = new Set(collectKeys(de));
const enKeys = new Set(collectKeys(en));

const missingInEn = [...deKeys].filter((key) => !enKeys.has(key));
const missingInDe = [...enKeys].filter((key) => !deKeys.has(key));

if (missingInEn.length > 0 || missingInDe.length > 0) {
	if (missingInEn.length > 0) {
		console.error("Keys present in de.json but missing in en.json:");
		for (const key of missingInEn) {
			console.error(`  - ${key}`);
		}
	}
	if (missingInDe.length > 0) {
		console.error("Keys present in en.json but missing in de.json:");
		for (const key of missingInDe) {
			console.error(`  - ${key}`);
		}
	}
	process.exit(1);
}

console.log(`messages parity ok (${deKeys.size} keys)`);
