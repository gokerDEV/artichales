import type {
	DirectiveComponentProps,
	DirectiveRendererDefinition,
	PluginDefinition,
	RenderHookContext,
} from "./plugin.contract";

function registerAbstractRenderRuntime(
	_: RenderHookContext,
): DirectiveRendererDefinition {
	return {
		directive: "abstract",
		primitive: "abstract",
		component: AbstractRender,
	};
}

export const abstractRenderPlugin: PluginDefinition = {
	id: "abstract-render",
	category: "render",
	name: "Abstract Render",
	hooks: {
		directiveRender: registerAbstractRenderRuntime,
	},
};

export const AbstractRender = ({
	children,
	...rest
}: DirectiveComponentProps) => (
	<div className="mx-auto my-8 max-w-[85%]" {...rest}>
		<hr
			className="mb-4 border-t-2"
			style={{ borderColor: "var(--ac-border-color)" }}
		/>
		<div className="flex flex-col items-center">
			<h3
				className="mb-2 font-bold text-sm uppercase tracking-widest"
				style={{ color: "var(--ac-muted-color)" }}
			>
				Abstract
			</h3>
			<div
				className="text-justify text-sm italic leading-relaxed opacity-90"
				style={{ color: "var(--ac-text-color)" }}
			>
				{children}
			</div>
		</div>
		<hr
			className="mt-4 border-t-2"
			style={{ borderColor: "var(--ac-border-color)" }}
		/>
	</div>
);
