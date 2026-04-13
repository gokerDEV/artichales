import type {
	DirectiveKind,
	DisplayAs,
} from "@/components/artichales/plugins/plugin.contract";

export type PluginMetadata = {
	id: string;
	displayAs?: DisplayAs;
	kind?: DirectiveKind;
	autocomplete?: boolean;
};

export type PluginRegistryMaps = {
	byId: ReadonlyMap<string, PluginMetadata>;
	displayAsByPluginId: ReadonlyMap<string, DisplayAs>;
	directiveKindByPluginId: ReadonlyMap<string, DirectiveKind>;
};
