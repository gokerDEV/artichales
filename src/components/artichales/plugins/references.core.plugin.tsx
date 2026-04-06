import type { DocumentSource } from "@/hooks/use-document";
import { cn } from "@/lib/utils";

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

	const showRefs = template?.references?.enabled !== false;
	const docStyle = template?.document || {};

	if (!showRefs || Object.keys(citations).length === 0) return null;

	return (
		<div
			className={cn(
				"mt-8 border-border border-t",
				isPrint ? "border-neutral-200 pt-6" : "pt-8",
				className,
			)}
		>
			<h2
				className={cn(
					"font-semibold",
					isPrint ? "mb-4 text-sm" : "mb-6 text-foreground text-xl",
				)}
				style={
					isPrint ? { fontFamily: docStyle.fontFamily?.heading } : undefined
				}
			>
				{template?.references?.title || "References"}
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
								: "text-muted-foreground text-sm leading-relaxed",
						)}
					>
						<span
							className={cn(
								"shrink-0 font-medium",
								isPrint ? "text-neutral-500" : "text-foreground",
							)}
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
