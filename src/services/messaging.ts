import type { Extractions, Inputs, Metrics } from "@/lib/types/engine";

export type MessageType = "EXTRACT_SIGNALS" | "RUN_ANALYSIS" | "GET_CACHED_EXTRACTIONS";

export interface EXTRACT_SIGNALS_MESSAGE {
	type: "EXTRACT_SIGNALS";
}

export interface EXTRACT_SIGNALS_RESPONSE {
	success: boolean;
	data?: Extractions;
	error?: string;
	debug?: string[];
}

export interface GET_CACHED_EXTRACTIONS_MESSAGE {
	type: "GET_CACHED_EXTRACTIONS";
	payload: {
		url: string;
	};
}

export interface GET_CACHED_EXTRACTIONS_RESPONSE {
	success: boolean;
	data?: Extractions;
	error?: string;
}

export interface RUN_ANALYSIS_MESSAGE {
	type: "RUN_ANALYSIS";
	payload: {
		searchTerm: string;
		tabId?: number;
		url?: string;
		force?: boolean;
	};
}

export interface RUN_ANALYSIS_RESPONSE {
	success: boolean;
	scores?: number[];
	metrics?: Metrics;
	inputs?: Inputs;
	logs?: string[];
	error?: string;
}
