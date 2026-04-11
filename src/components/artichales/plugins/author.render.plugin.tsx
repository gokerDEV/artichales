import * as React from "react";
import type { DocumentSource } from "@/hooks/use-document";
import { cn } from "@/lib/utils";
import type {
	CoreRenderHookContext,
	PluginDefinition,
} from "./plugin.contract";

export interface Author {
	name: string;
	affiliation?: string;
	email?: string;
	orcid?: string;
	url?: string;
}

type AuthorDocumentStyle = {
	fontFamily?: {
		body?: string;
	};
};

function renderAuthorCore(context: CoreRenderHookContext) {
	return (
		<AuthorBlockRender
			document={context.document}
			target={context.target}
			className={context.className}
		/>
	);
}

export const authorRenderPlugin: PluginDefinition = {
	id: "author",
	category: "author",
	name: "Author",
	hooks: {
		coreRender: renderAuthorCore,
	},
};

export const AuthorBlockRender = React.memo(
	function AuthorBlockRender({
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
			enabled: true,
			showAuthors: true,
			showAffiliations: true,
			showKeywords: true,
			align: "center",
		};

		if (titleBlock.enabled === false) return null;

		const docStyle = template?.document || {};
		const isCenter = titleBlock.align === "center";
		const isRight = titleBlock.align === "right";

		const authorAlignClass = isCenter
			? "justify-center text-center"
			: isRight
				? "justify-end text-right"
				: "justify-start text-left";

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

		if (authors.length === 0 && keywords.length === 0) return null;

		return (
			<section className={cn("mb-8 flex flex-col gap-4", className)}>
				{titleBlock.showAuthors !== false && authors.length > 0 && (
					<div
						className={cn("flex flex-wrap gap-x-6 gap-y-2", authorAlignClass)}
					>
						{authors.map((author) => (
							<AuthorNodeRender
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
							className="font-semibold text-xs uppercase tracking-wider"
							style={{ color: "var(--art-muted-color)" }}
						>
							Keywords:
						</span>
						{keywords.map((k) => (
							<span
								key={k}
								className="font-medium text-xs italic"
								style={{ color: "var(--art-text-color)" }}
							>
								{String(k)}
							</span>
						))}
					</div>
				)}
			</section>
		);
	},
	(prevProps, nextProps) => {
		return (
			prevProps.target === nextProps.target &&
			prevProps.className === nextProps.className &&
			prevProps.document.frontmatter?.authors ===
				nextProps.document.frontmatter?.authors &&
			prevProps.document.frontmatter?.keywords ===
				nextProps.document.frontmatter?.keywords &&
			prevProps.document.template?.titleBlock ===
				nextProps.document.template?.titleBlock &&
			prevProps.document.template?.document ===
				nextProps.document.template?.document
		);
	},
);

export const AuthorNodeRender = React.memo(function AuthorNodeRender({
	author,
	target,
	className,
	docStyle,
	showAffiliations = true,
}: {
	author: Author;
	target: "web" | "print";
	className?: string;
	docStyle?: AuthorDocumentStyle;
	showAffiliations?: boolean;
}) {
	const isPrint = target === "print";

	return (
		<div className={cn("flex flex-col", className)}>
			<span
				className="font-medium"
				style={{
					color: "var(--art-text-color)",
					fontFamily: docStyle?.fontFamily?.body,
				}}
			>
				{author.name}
				{author.orcid && (
					<a
						href={`https://orcid.org/${author.orcid}`}
						target="_blank"
						rel="noreferrer"
						className={cn("ml-1 hover:underline", isPrint ? "opacity-80" : "")}
						style={{ color: "var(--art-link-color)" }}
					>
						<span className="sr-only">ORCID</span>
						<svg
							role="img"
							viewBox="0 0 24 24"
							xmlns="http://www.w3.org/2000/svg"
							className="inline-block h-3 w-3"
							fill="currentColor"
						>
							<title>ORCID</title>
							<path d="M12 0C5.372 0 0 5.372 0 12s5.372 12 12 12 12-5.372 12-12S18.628 0 12 0zM7.369 4.378c.525 0 .947.431.947.947s-.422.947-.947.947a.95.95 0 0 1-.947-.947c0-.525.422-.947.947-.947zm-.722 3.038h1.444v10.041H6.647V7.416zm3.562 0h3.9c2.586 0 3.987 1.62 3.987 3.842 0 2.361-1.63 3.868-4.103 3.868h-3.784V7.416zm1.444 1.303v5.04h2.296c1.688 0 2.4-1.026 2.4-2.5 0-1.424-.712-2.54-2.4-2.54h-2.296z" />
						</svg>
					</a>
				)}
			</span>
			{showAffiliations !== false && author.affiliation && (
				<span
					className="whitespace-nowrap text-sm"
					style={{
						color: isPrint ? "var(--art-text-color)" : "var(--art-muted-color)",
						opacity: isPrint ? 0.8 : 1,
					}}
				>
					{author.affiliation}
				</span>
			)}
			{author.email && (
				<a
					href={`mailto:${author.email}`}
					className="text-xs hover:underline"
					style={{ color: "var(--art-muted-color)" }}
				>
					{author.email}
				</a>
			)}
		</div>
	);
});
