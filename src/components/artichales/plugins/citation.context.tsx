import * as React from "react";
import type { CitationEntry } from "@/lib/bibtex";

export type CitationContextType = {
	entries: Record<string, CitationEntry>;
	style: string;
};

export const CitationContext = React.createContext<CitationContextType>({
	entries: {},
	style: "author-year",
});

export function useCitations() {
	return React.useContext(CitationContext);
}
