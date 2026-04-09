import type { Components } from "react-markdown";
import type { CitationEntry } from "@/lib/bibtex";
import { cn } from "@/lib/utils";
import { useCitations } from "./citation.context";
import type { PluginDefinition } from "./plugin.contract";

function registerCitationRenderRuntime(): void {}

export const citationRenderPlugin: PluginDefinition = {
	id: "citation-render",
	category: "render",
	name: "Citation Render",
	hooks: {
		render: registerCitationRenderRuntime,
	},
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
	const { entries, style, citeClassName } = useCitations();

	// Safely retrieve IDs passed from the parser
	const idsString =
		node?.properties?.dataCiteId ||
		node?.properties?.["data-cite-id"] ||
		node?.properties?.dataCiteIds ||
		node?.properties?.["data-cite-ids"] ||
		"";

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

	const firstId = ids[0];
	const href = firstId ? `#ref-${firstId}` : undefined;

	return (
		<a
			href={href}
			className={cn(citeClassName, className)}
			title={ids.length > 0 ? `Citation: ${ids.join(", ")}` : "Citation"}
		>
			<cite {...rest}>[{labels ? labels : children}]</cite>
		</a>
	);
};
