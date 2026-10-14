import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
	plugins: [react()],
	test: {
		environment: "node",
		globals: true,
		// The suites stub `fetch`; restore it so a stub cannot outlive its test.
		unstubGlobals: true,
	},
});
