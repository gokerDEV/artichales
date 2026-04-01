import ReactMarkdown from "react-markdown";
import rehypeKatex from "rehype-katex";
import remarkDirective from "remark-directive";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import { remarkAbstract } from "@/components/artichales/plugins/abstract.parser.plugin";
import { AbstractRender } from "@/components/artichales/plugins/abstract.render.plugin";
import { remarkCitation } from "@/components/artichales/plugins/citation.parser.plugin";
import { CitationRender } from "@/components/artichales/plugins/citation.render.plugin";
import "katex/dist/katex.min.css";

type MarkdownContentProps = {
	content: string;
};

export function MarkdownContent({ content }: MarkdownContentProps) {
	return (
		<ReactMarkdown
			remarkPlugins={[
				remarkCitation,
				remarkAbstract,
				remarkGfm,
				remarkMath,
				remarkDirective,
			]}
			rehypePlugins={[rehypeKatex]}
			components={{ cite: CitationRender, div: AbstractRender }}
		>
			{content}
		</ReactMarkdown>
	);
}
