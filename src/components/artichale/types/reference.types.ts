export type ResolvedReference = {
	label: string;
	href: string;
};

export type ResolvedCaption = {
	label: string;
	href: string;
};

export type ReferenceSelectorTarget = {
	selector: string;
	mode: "full" | "partial";
};
