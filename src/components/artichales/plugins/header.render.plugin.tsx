import * as React from "react";
import type {
	CoreRenderHookContext,
	PluginDefinition,
} from "./plugin.contract";
import {
	getFrontmatterString,
	getFrontmatterStringOr,
} from "./frontmatter.utils";

function HeaderRenderer({ context }: { context: CoreRenderHookContext }) {
	if (context.target !== "print") return null;

	const { frontmatter } = context.document;
	const journalName =
		getFrontmatterString(frontmatter, "journal.name") ??
		getFrontmatterString(frontmatter, "conference.name") ??
		"";
	const journalVolume = getFrontmatterString(frontmatter, "journal.volume");
	const journalIssue = getFrontmatterString(frontmatter, "journal.issue");
	const conferenceDate = getFrontmatterString(frontmatter, "conference.date");
	const issueInfo = journalVolume
		? `Vol ${journalVolume}${journalIssue ? `, Issue ${journalIssue}` : ""}`
		: conferenceDate
			? conferenceDate
			: "";
	const shortTitle =
		getFrontmatterString(frontmatter, "shortTitle") ??
		getFrontmatterStringOr(frontmatter, "title", "");

	return (
		<div className="ac-running-header flex w-full justify-between pb-2 text-[10pt] text-muted-foreground">
			<div>
				{journalName ? <strong>{journalName}</strong> : null}
				{issueInfo ? <span className="ml-2">({issueInfo})</span> : null}
			</div>
			<div>
				{shortTitle ? (
					<span className="italic">{shortTitle}</span>
				) : null}
				<span className="ac-page-counter ml-4 font-mono font-bold" />
			</div>
		</div>
	);
}

export const headerRenderPlugin: PluginDefinition = {
	id: "running-header",
	category: "document",
	name: "Running Header",
	hooks: {
		coreRender: (context) => (
			<HeaderRenderer key="running-header" context={context} />
		),
	},
};
