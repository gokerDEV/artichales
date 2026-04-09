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
	range: SourceRange;
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
	children?: RenderTreeNode[];
}

export interface RenderRequest {
	target: RenderTarget;
	mode: "full" | "partial";
	fragmentId?: string;
	pluginOverrides?: Record<string, unknown>;
}

export interface RenderResult {
	target: RenderTarget;
	mode: "full" | "partial";
	tree: RenderTreeNode[];
	fragments?: Record<string, RenderTreeNode[]>;
	diagnostics?: Diagnostic[];
}

export type FlowSpan = "column" | "page";
export type FlowBreak = "auto" | "page";

export interface PrintLayoutHint {
	span: FlowSpan;
	breakBefore: FlowBreak;
	breakAfter: FlowBreak;
}

export interface PrintFlowNode {
	id: string;
	kind: "title" | "markdown" | "references";
	markdown?: string;
	layoutHint: PrintLayoutHint;
	estimatedHeightPx: number;
}

export type PageRegion =
	| {
			type: "header";
			left: string;
			center: string;
			right: string;
	  }
	| {
			type: "body";
			columns: number;
			nodes: PrintFlowNode[];
	  }
	| {
			type: "footer";
			left: string;
			center: string;
			right: string;
			pageNumber: number;
	  };

export interface Page {
	number: number;
	regions: PageRegion[];
}

export interface PaginatedPageTree {
	target: "print";
	pageBox: {
		width: string;
		height: string;
		headerHeightPx: number;
		footerHeightPx: number;
		bodyHeightPx: number;
		columns: number;
	};
	pages: Page[];
}
