import type { DirectiveCategory } from "./plugin.contract";

export type DirectiveCaptionProps = {
	primitive: DirectiveCategory;
	caption: string;
	number?: number;
	labelPrefix?: string;
	utilityClasses?: Record<string, string>;
};

function getCaptionClasses(
	primitive: DirectiveCategory,
	utilityClasses?: Record<string, string>,
) {
	const prefix = primitive === "table" ? "table" : "figure";
	return {
		caption: utilityClasses?.[`${prefix}Caption`] || "",
		label: utilityClasses?.[`${prefix}CaptionLabel`] || "",
	};
}

export function DirectiveCaption({
	primitive,
	caption,
	number,
	labelPrefix,
	utilityClasses,
}: DirectiveCaptionProps) {
	if (!caption.trim()) return null;
	const classes = getCaptionClasses(primitive, utilityClasses);
	const effectiveLabelPrefix =
		typeof labelPrefix === "string" && labelPrefix.trim() !== ""
			? labelPrefix.trim()
			: "?";
	return (
		<p className={classes.caption}>
			{number ? (
				<span
					className={classes.label}
				>{`${effectiveLabelPrefix} ${number}. `}</span>
			) : null}
			{caption}
		</p>
	);
}
