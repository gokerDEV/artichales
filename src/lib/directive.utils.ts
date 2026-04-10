import { isRecord, type UnknownRecord } from "@/lib/artichales.utils";

export function getDirectiveNodeProperty(node: unknown, key: string): unknown {
	if (!isRecord(node) || !isRecord(node.properties)) return undefined;
	const properties = node.properties as UnknownRecord;
	return properties[key];
}

export function getDirectivePropertyWithFallback(
	node: unknown,
	props: UnknownRecord,
	key: string,
	fallbackKey?: string,
): unknown {
	return (
		getDirectiveNodeProperty(node, key) ??
		props[key] ??
		(fallbackKey ? props[fallbackKey] : undefined)
	);
}

export function getDirectiveString(
	node: unknown,
	props: UnknownRecord,
	key: string,
	fallbackKey?: string,
): string {
	const value = getDirectivePropertyWithFallback(node, props, key, fallbackKey);
	return typeof value === "string" ? value : "";
}
