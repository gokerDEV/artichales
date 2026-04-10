import * as React from "react";
import type { CitationEntry, ValidatedBibEntry } from "@/lib/bibtex";

export type CitationContextType = {
	entries: Record<string, CitationEntry>;
	validatedEntries: Record<string, ValidatedBibEntry>;
	style: string;
	citeClassName: string;
};

export const CitationContext = React.createContext<CitationContextType>({
	entries: {},
	validatedEntries: {},
	style: "numeric",
	citeClassName: "cite",
});

export function useCitations() {
	return React.useContext(CitationContext);
}
