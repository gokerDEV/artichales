import type { ReactNode } from "react";
import type { RenderTarget } from "@/components/artichale/types/render.types";

export function renderPage(input: {
	target: RenderTarget;
	children: ReactNode;
}): ReactNode {
	if (input.target === "web") {
		return <div className="art-web">{input.children}</div>;
	}

	return (
		<div
			data-art-print-document="true"
			className="art--print paged-print-content"
		>
			{input.children}
		</div>
	);
}
