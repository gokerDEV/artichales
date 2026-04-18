import type { ReactNode } from "react";
import { createLastModifiedCache } from "@/components/artichale/core/last-modified.cache";
import type { RenderTarget } from "@/components/artichale/types/render.types";

const pageRenderCache = createLastModifiedCache<ReactNode>();

export function renderPage(input: {
	target: RenderTarget;
	children: ReactNode;
	lastModified: string;
}): ReactNode {
	const cached = pageRenderCache.get(input.lastModified);
	if (cached !== undefined) return cached;

	let result: ReactNode;

	if (input.target === "web") {
		result = <div className="art-web">{input.children}</div>;
		pageRenderCache.set(input.lastModified, result);
		return result;
	}

	result = (
		<div className="art--print">{input.children}</div>
	);

	pageRenderCache.set(input.lastModified, result);
	return result;
}
