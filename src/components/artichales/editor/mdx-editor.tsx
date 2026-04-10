import { autocompletion } from "@codemirror/autocomplete";
import { json } from "@codemirror/lang-json";
import { markdown } from "@codemirror/lang-markdown";
import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import * as React from "react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { EditorCompletions } from "@/types/editor";
import {
	BIBTEX_LANGUAGE,
	buildArticleCompletions,
	buildBibliographyCompletions,
	buildTemplateCompletions,
} from "./config/completions";
import { getBaseExtensions } from "./config/extensions";

type EditorFileKind = "article" | "template" | "bibliography" | "asset";

export type MdxEditorProps = {
	fileName: string;
	value: string;
	onChange: (value: string) => void;
	onBlur?: () => void;
	onCursorOffsetChange?: (offset: number) => void;
	jumpToOffset?: number | null;
	jumpToOffsetSignal?: number;
	className?: string;
	label?: string;
	completions?: EditorCompletions;
};

function resolveEditorFileKind(fileName: string): EditorFileKind {
	if (fileName === "template.json") return "template";
	if (fileName === "references.bib") return "bibliography";
	if (fileName === "article.mda") return "article";
	return "asset";
}

function createEditorState(
	content: string,
	fileKind: EditorFileKind,
	onChangeRef: React.MutableRefObject<(value: string) => void>,
	onBlurRef: React.MutableRefObject<(() => void) | undefined>,
	onCursorOffsetChangeRef: React.MutableRefObject<
		((offset: number) => void) | undefined
	>,
	completions: EditorCompletions,
): EditorState {
	const languageByFileKind = {
		article: markdown(),
		template: json(),
		bibliography: BIBTEX_LANGUAGE,
		asset: markdown(),
	} as const;

	const completionByFileKind = {
		article: buildArticleCompletions(completions),
		template: buildTemplateCompletions(),
		bibliography: buildBibliographyCompletions(),
		asset: buildTemplateCompletions(),
	} as const;

	return EditorState.create({
		doc: content,
		extensions: [
			...getBaseExtensions(),
			languageByFileKind[fileKind],
			autocompletion({ override: [completionByFileKind[fileKind]] }),
			EditorView.updateListener.of((update) => {
				if (update.docChanged) {
					onChangeRef.current(update.state.doc.toString());
				}
				if (update.selectionSet || update.docChanged) {
					onCursorOffsetChangeRef.current?.(update.state.selection.main.head);
				}
				if (update.focusChanged && !update.view.hasFocus) {
					onBlurRef.current?.();
				}
			}),
		],
	});
}

export function MdxEditor({
	fileName,
	value,
	onChange,
	onBlur,
	onCursorOffsetChange,
	jumpToOffset = null,
	jumpToOffsetSignal = 0,
	className,
	label = "Source",
	completions = { bibKeys: [], referenceSelectors: [] },
}: MdxEditorProps) {
	void jumpToOffsetSignal;
	const id = React.useId();
	const editorHostRef = React.useRef<HTMLDivElement | null>(null);
	const viewRef = React.useRef<EditorView | null>(null);
	const statesByFileRef = React.useRef(new Map<string, EditorState>());
	const lastFileNameRef = React.useRef(fileName);
	const onChangeRef = React.useRef(onChange);
	const onBlurRef = React.useRef(onBlur);
	const onCursorOffsetChangeRef = React.useRef(onCursorOffsetChange);

	React.useEffect(() => {
		onChangeRef.current = onChange;
	}, [onChange]);

	React.useEffect(() => {
		onBlurRef.current = onBlur;
	}, [onBlur]);

	React.useEffect(() => {
		onCursorOffsetChangeRef.current = onCursorOffsetChange;
	}, [onCursorOffsetChange]);

	React.useEffect(() => {
		const host = editorHostRef.current;
		if (!host) return;

		const previousFile = lastFileNameRef.current;
		if (previousFile === fileName && viewRef.current) {
			return;
		}
		if (previousFile !== fileName && viewRef.current) {
			statesByFileRef.current.set(previousFile, viewRef.current.state);
		}
		lastFileNameRef.current = fileName;

		const fileKind = resolveEditorFileKind(fileName);
		const existingState = statesByFileRef.current.get(fileName);
		const nextState =
			existingState ||
			createEditorState(
				value,
				fileKind,
				onChangeRef,
				onBlurRef,
				onCursorOffsetChangeRef,
				completions,
			);

		if (!viewRef.current) {
			const view = new EditorView({
				state: nextState,
				parent: host,
			});
			viewRef.current = view;
			statesByFileRef.current.set(fileName, nextState);
			onCursorOffsetChangeRef.current?.(view.state.selection.main.head);
			return;
		}

		viewRef.current.setState(nextState);
		statesByFileRef.current.set(fileName, nextState);
		onCursorOffsetChangeRef.current?.(viewRef.current.state.selection.main.head);
	}, [completions, fileName, value]);

	React.useEffect(() => {
		const currentView = viewRef.current;
		if (!currentView || currentView.hasFocus) return;

		const currentContent = currentView.state.doc.toString();
		if (currentContent !== value) {
			currentView.dispatch({
				changes: { from: 0, to: currentView.state.doc.length, insert: value },
			});
		}
	}, [value]);

	React.useEffect(() => {
		if (typeof jumpToOffset !== "number") return;
		const view = viewRef.current;
		if (!view) return;
		const clampedOffset = Math.max(
			0,
			Math.min(jumpToOffset, view.state.doc.length),
		);
		view.dispatch({
			selection: { anchor: clampedOffset },
			effects: EditorView.scrollIntoView(clampedOffset, { y: "center" }),
		});
		view.focus();
	}, [jumpToOffset]);

	React.useEffect(() => {
		return () => {
			if (viewRef.current) {
				statesByFileRef.current.set(
					lastFileNameRef.current,
					viewRef.current.state,
				);
				viewRef.current.destroy();
				viewRef.current = null;
			}
		};
	}, []);

	return (
		<div className={cn("flex h-full min-h-0 flex-col gap-3", className)}>
			<div className="flex h-[48px] w-full shrink-0 items-center justify-between border-border border-b bg-card px-4">
				<Label
					htmlFor={id}
					className="text-muted-foreground text-xs uppercase tracking-wide"
				>
					{label}
				</Label>
			</div>
			<div
				id={id}
				ref={editorHostRef}
				className="min-h-full border-none bg-card font-mono text-sm [&_.cm-content]:min-h-full [&_.cm-editor]:h-auto [&_.cm-editor]:min-h-full [&_.cm-editor]:outline-none [&_.cm-gutters]:border-border [&_.cm-gutters]:border-r [&_.cm-scroller]:overflow-visible [&_.cm-scroller]:font-mono"
			/>
		</div>
	);
}
