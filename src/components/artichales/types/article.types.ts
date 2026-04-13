export type HeadingEntry = {
	id: string;
	pluginId: "section" | "subsection" | "subsubsection";
	label: string;
	title: string;
	level: 1 | 2 | 3;
	number: string;
	parentId?: string;
};

export type LabeledBlockEntry = {
	id: string;
	pluginId: string;
	label: string;
	number: number;
};
