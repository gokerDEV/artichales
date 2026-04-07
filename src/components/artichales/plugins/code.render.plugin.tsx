import type { Components } from "react-markdown";
import { cn } from "@/lib/utils";

export const codeRenderPlugin = {
	id: "code-render",
	kind: "render",
	name: "Code Render",
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
