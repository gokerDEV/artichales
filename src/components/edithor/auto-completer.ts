import {
	autocompletion,
	CompletionContext,
	type Completion,
} from "@codemirror/autocomplete";
import type { Extension } from "@codemirror/state";
import type { AutocompleteRule, AutocompleteItem } from "./types";

function escapeRegExp(str: string): string {
	return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function createAutocompleteExtension(
	rules?: AutocompleteRule[],
): Extension {
	if (!rules || rules.length === 0) {
		return [];
	}

	const completionSources = rules.map((rule) => {
		return async (context: CompletionContext) => {
			const triggerRegex =
				typeof rule.trigger === "string"
					? new RegExp(`${escapeRegExp(rule.trigger)}[\\w-]*$`)
					: rule.trigger;

			const match = context.matchBefore(triggerRegex);

			if (!match) {
				return null;
			}

			const isExplicitOrMatched = context.explicit || match.text.length > 0;
			if (!isExplicitOrMatched) {
				return null;
			}

			let query = match.text;
			if (
				typeof rule.trigger === "string" &&
				match.text.startsWith(rule.trigger)
			) {
				query = match.text.slice(rule.trigger.length);
			}

			let items: AutocompleteItem[] = [];

			try {
				items = await Promise.resolve(rule.provideItems(query));
			} catch (error) {
				console.error("Autocomplete provideItems failed:", error);
				return null;
			}

			if (!items || items.length === 0) {
				return null;
			}

			return {
				from: match.from,
				options: items.map(
					(item) =>
						({
							label: item.label,
							detail: item.detail,
							apply: item.insertText,
							type: "variable" as const,
						}) satisfies Completion,
				),
			} as const;
		};
	});

	return autocompletion({
		override: completionSources,
		closeOnBlur: true,
	});
}
