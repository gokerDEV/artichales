import * as React from "react";
import ReactMarkdown from "react-markdown";
import rehypeKatex from "rehype-katex";
import remarkDirective from "remark-directive";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import { remarkAbstract } from "@/components/artichales/plugins/abstract.parser.plugin";
import { remarkCitation } from "@/components/artichales/plugins/citation.parser.plugin";
import { CitationRender } from "@/components/artichales/plugins/citation.render.plugin";
import { remarkPlotty } from "@/components/artichales/plugins/plotty.parser.plugin";
import { createDirectiveDivRender } from "@/components/artichales/plugins/plotty.render.plugin";
import { createRefRender } from "@/components/artichales/plugins/ref.render.plugin";
import "katex/dist/katex.min.css";

type MarkdownContentProps = {
	content: string;
	plotFiles: Record<string, unknown>;
};

export function MarkdownContent({ content, plotFiles }: MarkdownContentProps) {
	const plotIndexById = React.useMemo(() => {
		const regex = /:::plotty\[(.+?)\]/g;
		const indexMap: Record<string, number> = {};
		let match: RegExpExecArray | null = null;
		let idx = 1;

		while (true) {
			match = regex.exec(content);
			if (match === null) break;
			const source = match[1]?.trim() || "";
			const id = source.replace(/\.[^/.]+$/, "");
			if (id && indexMap[id] === undefined) {
				indexMap[id] = idx;
				idx++;
			}
		}

		return indexMap;
	}, [content]);

	const divRenderer = React.useMemo(
		() => createDirectiveDivRender(plotFiles, plotIndexById),
		[plotFiles, plotIndexById],
	);
	const refRenderer = React.useMemo(
		() => createRefRender(plotIndexById),
		[plotIndexById],
	);

	return (
		<ReactMarkdown
			remarkPlugins={[
				remarkCitation,
				remarkAbstract,
				remarkPlotty,
				remarkGfm,
				remarkMath,
				remarkDirective,
			]}
			rehypePlugins={[rehypeKatex]}
			components={{ cite: CitationRender, div: divRenderer, span: refRenderer }}
		>
			{content}
		</ReactMarkdown>
	);
}
