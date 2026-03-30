import type { Components } from "react-markdown";
import type { CitationEntry } from "@/lib/bibtex";
import { cn } from "@/lib/utils";
import { useCitations } from "./citation.context";

export const citationRenderPlugin = {
	id: "citation-render",
	kind: "render",
	name: "Citation Render",
};

type CitationFormatter = (
	id: string,
	entry: CitationEntry,
	entries: Record<string, CitationEntry>,
) => string;

type CitationStyleConfig = {
	formatter: CitationFormatter;
	joiner: string;
};

const authorYearFormatter: CitationFormatter = (_, entry) => {
	const parts = entry.author.split(",");
	const lastName =
		parts.length > 1
			? parts[0].trim()
			: entry.author.split(" ").pop() || entry.author;
	return `${lastName}, ${entry.year}`;
};

const numericFormatter: CitationFormatter = (id, _, entries) => {
	const idx = Object.keys(entries).indexOf(id);
	return idx >= 0 ? `${idx + 1}` : `?${id}`;
};

const STYLE_REGISTRY: Record<string, CitationStyleConfig> = {
	"author-year": { formatter: authorYearFormatter, joiner: "; " },
	apa: { formatter: authorYearFormatter, joiner: "; " },
	numeric: { formatter: numericFormatter, joiner: ", " },
	ieee: { formatter: numericFormatter, joiner: ", " },
};

const DEFAULT_STYLE_CONFIG = STYLE_REGISTRY["author-year"];

export const CitationRender: Components["cite"] = ({
	node,
	children,
	className,
	...rest
}) => {
	const { entries, style } = useCitations();

	// Safely retrieve IDs passed from the parser
	const idsString =
		node?.properties?.dataCiteIds || node?.properties?.["data-cite-ids"] || "";

	const ids =
		typeof idsString === "string" && idsString.trim() !== ""
			? idsString.split(",")
			: [];

	const styleKey = (style || "").toLowerCase().trim();
	const config = STYLE_REGISTRY[styleKey] || DEFAULT_STYLE_CONFIG;

	const labels =
		ids.length > 0
			? ids
					.map((id) => {
						const entry = entries[id];
						return entry ? config.formatter(id, entry, entries) : `?${id}`;
					})
					.join(config.joiner)
			: null;

	return (
		<cite
			className={cn(
				"mx-0.5 cursor-pointer rounded border border-emerald-200 bg-emerald-100/50 px-1 py-0.5 font-mono text-[0.85em] text-emerald-800 not-italic transition-colors hover:bg-emerald-200/50 dark:border-emerald-800/50 dark:bg-emerald-900/30 dark:text-emerald-300",
				className,
			)}
			title={ids.length > 0 ? `Citations: ${ids.join(", ")}` : "Citation"}
			{...rest}
		>
			[{labels ? labels : children}]
		</cite>
	);
};
