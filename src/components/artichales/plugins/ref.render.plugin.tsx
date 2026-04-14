import type React from "react";
import type { Components } from "react-markdown";
import type { ResolvedReference } from "@/lib/render-document";
import type { PluginDefinition, RenderHookContext } from "./plugin.contract";

type RefRenderProps = {
	node?: {
		properties?: Record<string, unknown>;
	};
	children?: React.ReactNode;
} & React.HTMLAttributes<HTMLSpanElement>;
function registerRefRenderRuntime(
	context: RenderHookContext,
): Partial<Components> {
	return {
		span: createRefRender(
			context.resolvedReferences,
			context.utilityClasses?.ref || "ref",
		),
	};
}

export const refRenderPlugin: PluginDefinition = {
	id: "ref-render",
	name: "Ref Render",
	category: "ref",
	hooks: {
		render: registerRefRenderRuntime,
	},
};

function normalizeRefId(raw: string): string {
	const trimmed = raw.trim();
	return trimmed.replace(/\.[^/.]+$/, "");
}

export function createRefRender(
	resolvedReferences: Record<string, ResolvedReference>,
	refClassName: string,
): Components["span"] {
	return function RefRender({ node, children, ...rest }: RefRenderProps) {
		const restProps = rest as Record<string, unknown>;
		const rawRefId =
			node?.properties?.dataRefId ||
			node?.properties?.["data-ref-id"] ||
			restProps.dataRefId ||
			restProps["data-ref-id"] ||
			"";
		const refId = typeof rawRefId === "string" ? rawRefId.trim() : "";
		const normalizedRefId = normalizeRefId(refId);
		const hasRefId = normalizedRefId !== "";

		const resolved = resolvedReferences[normalizedRefId];
		const label = resolved?.label || "?";
		const href = resolved?.href || "#";

		return (
			<span {...rest}>
				{hasRefId ? (
					<a
						href={href}
						className={refClassName}
						title={`Go to ${normalizedRefId}`}
					>
						{label || children || "?"}
					</a>
				) : (
					children
				)}
			</span>
		);
	};
}
