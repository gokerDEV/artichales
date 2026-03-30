export interface Author {
	name: string;
	affiliation?: string;
	email?: string;
	orcid?: string;
	url?: string;
}

export interface BibliographySource {
	style: string;
	source: string;
}

export type PluginConfigMap = Record<string, unknown>;

export interface DocumentFrontmatter {
	title?: string;
	authors?: Author[];
	keywords?: string[];
	template?: string;
	bibliography?: BibliographySource;
	plugins?: PluginConfigMap;
}

export interface AssetRef {
	type: string;
	path: string;
}

export interface SourceRange {
	start: number;
	end: number;
}

export interface Diagnostic {
	code: string;
	message: string;
	severity: "error" | "warning" | "info";
	range?: SourceRange;
}

export interface DocumentBlock {
	id: string;
	type: string;
	range?: SourceRange; // optional just in case
	data?: Record<string, unknown>;
	children?: DocumentBlock[];
}

export interface ReferenceEntry {
	id: string;
	type: "article" | "book" | "inproceedings" | "online" | string;
	title: string;
	authors?: string[];
	year: string;
	fields: Record<string, string>;
}

export interface HeadingIndex {
	id: string;
	level: number;
	text: string;
	number?: string;
	range?: SourceRange;
}

export interface FigureIndex {
	id: string;
	label: string;
	number: number;
	range?: SourceRange;
}

export interface TableIndex {
	id: string;
	label: string;
	number: number;
	range?: SourceRange;
}

export interface CitationIndex {
	id: string;
	referenceId: string;
	range?: SourceRange;
}

export interface CrossReferenceIndex {
	id: string;
	targetId: string;
	range?: SourceRange;
}

export interface FragmentIndex {
	id: string;
	type:
		| "document"
		| "abstract"
		| "body"
		| "references"
		| "section"
		| "figure"
		| "table";
	range?: SourceRange;
	dependsOn: string[];
}

export interface DocumentIndexes {
	headings: HeadingIndex[];
	figures: FigureIndex[];
	tables: TableIndex[];
	citations: CitationIndex[];
	crossReferences: CrossReferenceIndex[];
	fragments: FragmentIndex[];
}

export interface DocumentSource {
	frontmatter: DocumentFrontmatter;
	markdown: string;
	bibtex: string;
	assets: AssetRef[];
}

export interface DocumentModel {
	frontmatter: DocumentFrontmatter;
	blocks: DocumentBlock[];
	references: ReferenceEntry[];
	indexes: DocumentIndexes;
	diagnostics: Diagnostic[];
}

export type RenderTarget = "print" | "web";

export interface RenderTreeNode {
	id: string;
	type: string;
	props?: Record<string, unknown>;
	children?: RenderTreeNode[] | string;
}

export interface RenderRequest {
	target: RenderTarget;
	mode: "full" | "partial";
	fragmentId?: string;
	templateName: string;
	pluginOverrides?: Record<string, unknown>;
}

export interface RenderResult {
	target: RenderTarget;
	mode: "full" | "partial";
	tree: RenderTreeNode[];
	fragments?: Record<string, RenderTreeNode[]>;
	diagnostics?: Diagnostic[];
}
