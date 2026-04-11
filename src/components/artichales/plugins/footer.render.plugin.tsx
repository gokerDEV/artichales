import * as React from "react";
import type {
	CoreRenderHookContext,
	PluginDefinition,
} from "./plugin.contract";
import {
	getFrontmatterString,
	getFrontmatterStringOr,
} from "./frontmatter.utils";

function FooterRenderer({ context }: { context: CoreRenderHookContext }) {
	if (context.target !== "print") return null;

	const { frontmatter } = context.document;
	const license = getFrontmatterStringOr(
		frontmatter,
		"license.name",
		"All rights reserved.",
	);
	const doi = getFrontmatterString(frontmatter, "doi");
	const publishedAt = getFrontmatterString(frontmatter, "publishedAt");

	return (
		<div className="ac-running-footer flex w-full justify-between pt-2 border-t border-muted/30 text-[9pt] text-muted-foreground/80">
			<div>
				{license}
				{publishedAt ? (
					<span className="ml-2">Published: {publishedAt}</span>
				) : null}
			</div>
			<div>
				{doi ? `DOI: ${doi}` : ""}
				<span className="ac-page-counter ml-4 font-mono font-bold" />
			</div>
		</div>
	);
}

export const footerRenderPlugin: PluginDefinition = {
	id: "running-footer",
	category: "document",
	name: "Running Footer",
	hooks: {
		coreRender: (context) => (
			<FooterRenderer key="running-footer" context={context} />
		),
	},
};
