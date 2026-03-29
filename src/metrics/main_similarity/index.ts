import { computeSimilarity } from "@/lib/ai/similarity";
import type {
	Extractions,
	Inputs,
	Metrics,
	Resolver,
} from "@/lib/types/engine";

export const resolver: Resolver = async (
	extractions: Extractions,
	_metrics: Metrics,
	inputs: Inputs,
) => {
	const searchTerm = (inputs.searchTerm || "").trim().toLowerCase();
	if (!searchTerm) return { raw: 0.0, normalized: 0.0 };

	const mainText =
		typeof extractions.mainText === "string"
			? extractions.mainText.toLowerCase()
			: "";
			
	if (!mainText) return { raw: 0.0, normalized: 0.0 };

	const similarity = await computeSimilarity(searchTerm, mainText);
	return { raw: similarity, normalized: similarity };
};
