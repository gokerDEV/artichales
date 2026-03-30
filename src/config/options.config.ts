import type { QRGrouping } from "@/lib/types";

export const HISTORY_KEY = "artichales_history";
export const SETTINGS_KEY = "artichales_settings";

export interface ConfigOption<T> {
	label: string;
	value: T;
}

interface RotationConfig {
	min: number;
	max: number;
	step: number;
	values?: number[]; // Explicit values if step isn't sufficient
}

export interface TierConfig {
	grouping: ConfigOption<QRGrouping>[];
	historyLimit: number;
	globalRotation: RotationConfig;
	moduleRotation: RotationConfig;
}

export const TIER_CONFIG: Record<"free" | "premium", TierConfig> = {
	free: {
		historyLimit: 10,
		grouping: [
			{ label: "Dot", value: "dot" },
			{ label: "Column", value: "col" },
			{ label: "Row", value: "row" },
			{ label: "Blob", value: "blob" },
		],
		globalRotation: {
			min: 0,
			max: 180,
			step: 90,
			values: [0, 90, 180],
		},
		moduleRotation: {
			min: 0,
			max: 180,
			step: 90,
			values: [0, 90, 180],
		},
	},
	premium: {
		historyLimit: 100,
		grouping: [
			{ label: "Dot", value: "dot" },
			{ label: "Column", value: "col" },
			{ label: "Row", value: "row" },
			{ label: "Blob", value: "blob" },
			{ label: "45°", value: "45" },
			{ label: "-45°", value: "-45" },
		],
		globalRotation: {
			min: 0,
			max: 360,
			step: 15,
		},
		moduleRotation: {
			min: 0,
			max: 360,
			step: 15,
		},
	},
};

// Helper to get default options based on 'free' tier (first values)
export const DEFAULT_TIER = "free";

export const getTierDefaults = (tier: "free" | "premium" = DEFAULT_TIER) => ({
	grouping: TIER_CONFIG[tier].grouping[0].value,
	rotateDeg: TIER_CONFIG[tier].globalRotation.values
		? TIER_CONFIG[tier].globalRotation.values[0]
		: 0,
});
