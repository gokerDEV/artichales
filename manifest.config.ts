import { defineManifest } from "@crxjs/vite-plugin";
import packageJson from "./package.json";

const { version, description } = packageJson;

const [major, minor, patch, label = "0"] = version
	.replace(/[^\d.-]+/g, "")
	.split(/[.-]/);

export default defineManifest((env) => ({
	manifest_version: 3,
	name: env.mode === "staging" ? "[INTERNAL] Artichales" : "Artichales",
	description: description || "Offline-first academic writing system",
	version: `${major}.${minor}.${patch}.${label}`,
	version_name: version,
	action: {
		default_icon: {
			"16": "icons/icon-16.png",
			"32": "icons/icon-32.png",
			"48": "icons/icon-48.png",
			"128": "icons/icon-128.png",
		},
	},
	icons: {
		"16": "icons/icon-16.png",
		"32": "icons/icon-32.png",
		"48": "icons/icon-48.png",
		"128": "icons/icon-128.png",
	},
	background: {
		service_worker: "src/background/index.ts",
		type: "module",
	},
	permissions: [
		"storage",
		"downloads",
	],
	content_security_policy: {
		extension_pages: "script-src 'self' 'wasm-unsafe-eval'; object-src 'self'",
	},
}));
