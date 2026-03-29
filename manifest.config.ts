import { defineManifest } from "@crxjs/vite-plugin";
import packageJson from "./package.json";

const { version, name, description } = packageJson;

// Convert from Semver (e.g., 0.1.0-beta.6) to Chrome Extension Manifest format (e.g., 0.1.0.6)
const [major, minor, patch, label = "0"] = version
	.replace(/[^\d.-]+/g, "")
	.split(/[.-]/);

export default defineManifest(async (env) => ({
	manifest_version: 3,
	name: env.mode === "staging" ? `[INTERNAL] ${name}` : "MATCH",
	description: description || "Web Quality Linter",
	version: `${major}.${minor}.${patch}.${label}`,
	version_name: version,
	action: {
		default_popup: "popup.html",
		default_icon: {
			"16": "icons/icon-16.png",
			"32": "icons/icon-32.png",
			"48": "icons/icon-48.png",
			"128": "icons/icon-128.png",
		},
	},
	side_panel: {
		default_path: "sidepanel.html",
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
		"activeTab",
		"tabs",
		"scripting",
		"storage",
		"downloads",
		"sidePanel",
		"contextMenus",
	],
	// Required for chrome.scripting.executeScript to inject content scripts
	// programmatically into any page (not just the user-gesture active tab).
	// The content_scripts "<all_urls>" match only covers automatic injection.
	host_permissions: ["<all_urls>"],
	content_scripts: [
		{
			matches: ["<all_urls>"],
			js: ["src/content/index.ts"],
		},
	],
	web_accessible_resources: [
		{
			resources: ["app.html"],
			matches: ["<all_urls>"],
		},
		{
			resources: ["models/**", "wasm/**"],
			matches: ["<all_urls>"],
		},
	],
	content_security_policy: {
		extension_pages: "script-src 'self' 'wasm-unsafe-eval'; object-src 'self'",
	},
}));
