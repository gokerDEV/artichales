import type { DocumentSource } from "@/hooks/use-document";
import { cn } from "@/lib/utils";
import type { PluginDefinition } from "./plugin.contract";

export const referencesCorePlugin: PluginDefinition = {
	id: "references-core",
	category: "core",
	name: "References Core",
	hooks: {},
};

export function ReferencesCorePlugin({
	document,
	target,
	className,
}: {
	document: DocumentSource;
	target: "web" | "print";
	className?: string;
}) {
	const { template, citations } = document;
	const isPrint = target === "print";
	const docStyle = template?.document || {};

	if (Object.keys(citations).length === 0) return null;

	return (
		<div
			className={cn("mt-8 border-t pt-8", isPrint ? "pt-6" : "", className)}
			style={{ borderColor: "var(--ac-border-color)" }}
		>
			<h2
				className={cn(
					"font-semibold",
					isPrint ? "mb-4 text-sm" : "mb-6 text-xl",
				)}
				style={{
					color: "var(--ac-text-color)",
					fontFamily: docStyle.fontFamily?.heading,
				}}
			>
				{"References"}
			</h2>
			<div className="flex flex-col gap-2">
				{Object.values(citations).map((ref, idx) => (
					<div
						key={ref.id}
						id={`ref-${ref.id}`}
						className={cn(
							"flex gap-4",
							isPrint
								? "text-[10px] leading-relaxed"
								: "text-sm leading-relaxed",
						)}
						style={{ color: "var(--ac-muted-color)" }}
					>
						<span
							className="shrink-0 font-medium"
							style={{ color: "var(--ac-text-color)" }}
						>
							[{idx + 1}]
						</span>
						<span>
							{ref.author && <span className="mr-1">{ref.author}.</span>}
							{ref.title && (
								<span className="mr-1 font-medium italic">{ref.title}.</span>
							)}
							{ref.journal && <span className="mr-1">{ref.journal},</span>}
							{ref.year && <span>{ref.year}.</span>}
						</span>
					</div>
				))}
			</div>
		</div>
	);
}
