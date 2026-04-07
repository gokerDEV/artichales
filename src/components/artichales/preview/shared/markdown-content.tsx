import * as React from "react";
import ReactMarkdown from "react-markdown";
import rehypeKatex from "rehype-katex";
import remarkDirective from "remark-directive";
import remarkGfm from "remark-gfm";
import { remarkAbstract } from "@/components/artichales/plugins/abstract.parser.plugin";
import { remarkCitation } from "@/components/artichales/plugins/citation.parser.plugin";
import { CitationRender } from "@/components/artichales/plugins/citation.render.plugin";
import { CodeRender } from "@/components/artichales/plugins/code.render.plugin";
import { remarkDatatable } from "@/components/artichales/plugins/datatable.parser.plugin";
import { remarkMathEquation } from "@/components/artichales/plugins/math.parser.plugin";
import { remarkPlotty } from "@/components/artichales/plugins/plotty.parser.plugin";
import { createDirectiveDivRender } from "@/components/artichales/plugins/plotty.render.plugin";
import { createRefRender } from "@/components/artichales/plugins/ref.render.plugin";
import "katex/dist/katex.min.css";

type MarkdownContentProps = {
	content: string;
	plotFiles: Record<string, unknown>;
};

export function MarkdownContent({ content, plotFiles }: MarkdownContentProps) {
	const { plotIndexById, datatableIndexById, refIndexById } =
		React.useMemo(() => {
			const regex = /:::(plotty|datatable)\[(.+?)\]/g;
			const plotMap: Record<string, number> = {};
			const datatableMap: Record<string, number> = {};
			const refMap: Record<
				string,
				{
					kind: "plot" | "datatable";
					index: number;
				}
			> = {};
			let match: RegExpExecArray | null = null;
			let plotIdx = 1;
			let datatableIdx = 1;

			while (true) {
				match = regex.exec(content);
				if (match === null) break;
				const kind = match[1]?.trim();
				const source = match[2]?.trim() || "";
				const id = source.replace(/\.[^/.]+$/, "");
				if (!id) continue;

				if (kind === "plotty" && plotMap[id] === undefined) {
					plotMap[id] = plotIdx;
					refMap[id] = { kind: "plot", index: plotIdx };
					plotIdx++;
					continue;
				}
				if (kind === "datatable" && datatableMap[id] === undefined) {
					datatableMap[id] = datatableIdx;
					refMap[id] = { kind: "datatable", index: datatableIdx };
					datatableIdx++;
				}
			}

			return {
				plotIndexById: plotMap,
				datatableIndexById: datatableMap,
				refIndexById: refMap,
			};
		}, [content]);

	const divRenderer = React.useMemo(
		() =>
			createDirectiveDivRender(plotFiles, plotIndexById, datatableIndexById),
		[plotFiles, plotIndexById, datatableIndexById],
	);
	const refRenderer = React.useMemo(
		() => createRefRender(refIndexById),
		[refIndexById],
	);

	return (
		<ReactMarkdown
			remarkPlugins={[
				remarkCitation,
				remarkAbstract,
				remarkPlotty,
				remarkDatatable,
				remarkGfm,
				remarkMathEquation,
				remarkDirective,
			]}
			rehypePlugins={[rehypeKatex]}
			components={{
				cite: CitationRender,
				code: CodeRender,
				div: divRenderer,
				span: refRenderer,
			}}
		>
			{content}
		</ReactMarkdown>
	);
}
