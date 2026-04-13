export type FrontmatterAuthor = {
	name: string;
	affiliation?: string | null;
	orcid?: string | null;
	email?: string | readonly string[] | null;
	url?: string | readonly string[] | null;
	address?: string | readonly string[] | null;
	corresponding?: boolean;
};

export type FrontmatterLicense = {
	name?: string | null;
	text?: string | null;
	url?: string | null;
};

export type FrontmatterJournal = {
	name?: string | null;
	issn?: string | null;
	eissn?: string | null;
	volume?: string | number | null;
	issue?: string | number | null;
	pages?: string | null;
};

export type FrontmatterConference = {
	name?: string | null;
	location?: string | null;
	date?: string | null;
	proceedings?: string | null;
	pages?: string | null;
};

export type ArticleFrontmatter = {
	title: string;
	shortTitle?: string | null;
	authors?: readonly FrontmatterAuthor[];
	keywords?: readonly string[];
	doi?: string | null;
	receivedAt?: string | null;
	acceptedAt?: string | null;
	publishedAt?: string | null;
	versionDate?: string | null;
	type?: string | null;
	license?: FrontmatterLicense;
	journal?: FrontmatterJournal;
	conference?: FrontmatterConference;
	editors?: readonly FrontmatterAuthor[];
};
