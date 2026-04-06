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
import "katex/dist/katex.min.css";

type MarkdownContentProps = {
	content: string;
	plotFiles: Record<string, unknown>;
};

export function MarkdownContent({ content, plotFiles }: MarkdownContentProps) {
	const divRenderer = React.useMemo(
		() => createDirectiveDivRender(plotFiles),
		[plotFiles],
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
			components={{ cite: CitationRender, div: divRenderer }}
		>
			{content}
		</ReactMarkdown>
	);
}
