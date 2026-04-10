import type { Components } from "react-markdown";
import { cn } from "@/lib/utils";
import type { PluginDefinition, RenderHookContext } from "./plugin.contract";

function registerCodeRenderRuntime(_: RenderHookContext): Partial<Components> {
	return {
		code: CodeRender,
	};
}

export const codeRenderPlugin: PluginDefinition = {
	id: "code-render",
	category: "code",
	name: "Code Render",
	hooks: {
		render: registerCodeRenderRuntime,
	},
};

export const CodeRender: Components["code"] = ({
	className,
	children,
	...props
}) => {
	const isInline = !className || !className.includes("language-");

	if (isInline) {
		return (
			<code
				className={cn(
					"rounded bg-muted px-1.5 py-0.5 font-mono text-[0.85em]",
					className,
				)}
				{...props}
			>
				{children}
			</code>
		);
	}

	return (
		<code className={cn("block font-mono text-sm", className)} {...props}>
			{children}
		</code>
	);
};
