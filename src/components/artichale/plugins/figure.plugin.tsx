import * as React from "react";
import {
	resolveBlockSpacingStyle,
	resolveComponentConfig,
	resolveFlowSpan,
} from "@/components/artichale/base/plugin.shared.ts";
import { parseDirectiveNode } from "@/components/artichale/core/artichale.util";
import type { PluginDefinition } from "@/components/artichale/types/plugin.types";
import {
	DirectiveKind,
	DisplayAs,
} from "@/components/artichale/types/plugin.types";

function isImageMimeType(mimeType: string | undefined): boolean {
	return typeof mimeType === "string" && mimeType.startsWith("image/");
}

type FigureResolvedAsset = {
	fileName: string;
	resolvedSrc: string;
	mimeType?: string;
	lastModified: string;
};

const FigureVisual = React.memo(
	function FigureVisual({
		resolved,
		altText,
		source,
	}: {
		resolved: FigureResolvedAsset | null;
		altText: string;
		source: string;
	}) {
		if (resolved && isImageMimeType(resolved.mimeType)) {
			return <img src={resolved.resolvedSrc} alt={altText} />;
		}

		if (resolved) {
			return (
				<p className="text-center text-sm">
					Asset loaded:{" "}
					<a className="art-ref" href={resolved.resolvedSrc}>
						{resolved.fileName}
					</a>
				</p>
			);
		}

		return (
			<p className="text-center text-sm">
				Unable to resolve figure asset{" "}
				<strong>{source || "(missing source)"}</strong>.
			</p>
		);
	},
	(previousProps, nextProps) => {
		if (!previousProps.resolved || !nextProps.resolved) {
			return previousProps.resolved === nextProps.resolved;
		}
		if (
			typeof previousProps.resolved.lastModified === "number" &&
			typeof nextProps.resolved.lastModified === "number"
		) {
			return (
				previousProps.resolved.lastModified === nextProps.resolved.lastModified
			);
		}
		return (
			previousProps.resolved.resolvedSrc === nextProps.resolved.resolvedSrc
		);
	},
);

export const figurePlugin: PluginDefinition = {
	id: "figure",
	name: "Figure",
	displayAs: DisplayAs.FIGURE,
	kind: DirectiveKind.CONTAINER,
	autocomplete: true,
	async render({ node, fnAssetResolver, template }) {
		const parsed = parseDirectiveNode(node);
		const source = parsed.dataFile || parsed.label || "";
		const resolved = (await fnAssetResolver(source)) as FigureResolvedAsset;
		const config = resolveComponentConfig(template, "figure");
		const fallbackSpan = config.defaultSpan === "page" ? "page" : "column";
		const span = resolveFlowSpan(node, fallbackSpan);
		const altText = parsed.caption || source || "figure";

		return (
			<figure
				className="art-figure"
				data-flow-span={span}
				style={resolveBlockSpacingStyle(config)}
			>
				<FigureVisual resolved={resolved} altText={altText} source={source} />
			</figure>
		);
	},
};
