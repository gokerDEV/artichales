import type { DocumentSource } from "@/hooks/use-document";
import { cn } from "@/lib/utils";
import { type Author, AuthorCorePlugin } from "./author.core.plugin";

export function TitleCorePlugin({
	document,
	target,
	className,
}: {
	document: DocumentSource;
	target: "web" | "print";
	className?: string;
}) {
	const { frontmatter, template } = document;

	const titleBlock = template?.titleBlock || {
		showAuthors: true,
		showAffiliations: true,
		align: "center",
	};

	const docStyle = template?.document || {};
	const isCenter = titleBlock.align === "center";
	const isRight = titleBlock.align === "right";

	const titleAlignClass = isCenter
		? "text-center"
		: isRight
			? "text-right"
			: "text-left";
	const authorAlignClass = isCenter
		? "justify-center text-center"
		: isRight
			? "justify-end text-right"
			: "justify-start text-left";

	const title =
		typeof frontmatter?.title === "string" ? frontmatter.title : "Untitled";

	const rawAuthors = frontmatter?.authors;
	const authors = Array.isArray(rawAuthors)
		? rawAuthors.map((a) =>
				typeof a === "string" ? { name: a } : (a as Record<string, unknown>),
			)
		: typeof rawAuthors === "string"
			? [{ name: rawAuthors }]
			: [];

	const keywords = Array.isArray(frontmatter?.keywords)
		? frontmatter.keywords.filter((k) => typeof k === "string")
		: [];

	if (titleBlock.enabled === false) return null;

	const isPrint = target === "print";

	return (
		<header
			className={cn(
				"flex flex-col gap-4",
				isPrint ? "mb-6" : "mb-8",
				titleAlignClass,
				className,
			)}
			style={isPrint ? { marginBottom: titleBlock.spacingAfter } : undefined}
		>
			<h1
				className={cn(
					"font-bold leading-tight",
					isPrint ? "text-2xl" : "text-3xl text-foreground",
				)}
				style={
					isPrint
						? {
								fontFamily: docStyle.fontFamily?.heading,
								fontSize: docStyle.fontSize?.h1,
							}
						: undefined
				}
			>
				{title}
			</h1>

			{titleBlock.showAuthors !== false && authors.length > 0 && (
				<div className={cn("flex flex-wrap gap-x-6 gap-y-2", authorAlignClass)}>
					{authors.map((author) => (
						<AuthorCorePlugin
							key={JSON.stringify(author)}
							author={author as unknown as Author}
							target={target}
							docStyle={docStyle}
							showAffiliations={titleBlock.showAffiliations !== false}
						/>
					))}
				</div>
			)}

			{titleBlock.showKeywords !== false && keywords.length > 0 && (
				<div className={cn("mt-2 flex flex-wrap gap-2", authorAlignClass)}>
					<span
						className={cn(
							"font-semibold text-xs uppercase tracking-wider",
							isPrint ? "text-neutral-500" : "text-muted-foreground",
						)}
					>
						Keywords:
					</span>
					{keywords.map((k) => (
						<span
							key={k}
							className={cn(
								"text-xs",
								isPrint
									? "font-medium text-neutral-700 italic"
									: "font-medium text-foreground italic",
							)}
						>
							{String(k)}
						</span>
					))}
				</div>
			)}
		</header>
	);
}
