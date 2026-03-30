import type { Components } from "react-markdown";

export const abstractRenderPlugin = {
	id: "abstract-render",
	kind: "render",
	name: "Abstract Render",
};

export const AbstractRender: Components["div"] = ({
	node,
	children,
	...rest
}) => {
	const isAbstract =
		node?.properties?.["data-directive"] === "abstract" ||
		node?.properties?.dataDirective === "abstract";

	if (isAbstract) {
		return (
			<div className="mx-auto my-8 max-w-[85%]" {...rest}>
				<hr className="mb-4 border-neutral-200 border-t-2 dark:border-neutral-800" />
				<div className="flex flex-col items-center">
					<h3 className="mb-2 font-bold text-neutral-500 text-sm uppercase tracking-widest">
						Abstract
					</h3>
					<div className="text-justify text-sm italic leading-relaxed opacity-90">
						{children}
					</div>
				</div>
				<hr className="mt-4 border-neutral-200 border-t-2 dark:border-neutral-800" />
			</div>
		);
	}

	return <div {...rest}>{children}</div>;
};
