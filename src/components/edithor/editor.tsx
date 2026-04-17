import { json } from "@codemirror/lang-json";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import type { Extension } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import CodeMirror from "@uiw/react-codemirror";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area.tsx";
import { Switch } from "@/components/ui/switch";
import { debounce, getEditorLanguage } from "@/lib/edithor.utils";
import { createAutocompleteExtension } from "./auto-completer";
import type { EdithorAdapter, EdithorConfig, EdithorFile } from "./types";

export interface EdithorEditorProps {
	file: EdithorFile;
	adapter: EdithorAdapter;
	config?: EdithorConfig;
	isLivePreviewEnabled: boolean;
	onLivePreviewChange: (enabled: boolean) => void;
	onContentChange?: (fileId: string, content: string) => void;
	onFileSaved?: (fileId: string, content: string) => void;
	onEditorBlur?: (fileId: string, content: string) => void;
}

export function EdithorEditor({
	file,
	adapter,
	config,
	isLivePreviewEnabled,
	onLivePreviewChange,
	onContentChange,
	onFileSaved,
	onEditorBlur,
}: EdithorEditorProps) {
	const [content, setContent] = useState<string>("");
	const [isLoading, setIsLoading] = useState<boolean>(true);
	const [error, setError] = useState<string | null>(null);
	const latestContentRef = useRef<string>("");

	useEffect(() => {
		let isMounted = true;
		setIsLoading(true);
		setError(null);

		adapter
			.onReadFile(file.id)
			.then((data) => {
				if (isMounted) {
					setContent(data);
					latestContentRef.current = data;
					setIsLoading(false);
				}
			})
			.catch((err) => {
				if (isMounted) {
					setError(err.message || "Failed to load file content.");
					setIsLoading(false);
				}
			});

		return () => {
			isMounted = false;
		};
	}, [file.id, adapter]);

	const handleSave = useCallback(
		async (newContent: string) => {
			try {
				await adapter.onSave(file.id, newContent);
				onFileSaved?.(file.id, newContent);
			} catch (err) {
				console.error("Auto-save failed:", err);
			}
		},
		[file.id, adapter, onFileSaved],
	);

	const debouncedSave = useMemo(
		() =>
			debounce((value: string) => {
				void handleSave(value);
			}, 800),
		[handleSave],
	);

	const handleChange = useCallback(
		(value: string) => {
			setContent(value);
			latestContentRef.current = value;
			onContentChange?.(file.id, value);
			debouncedSave(value);
		},
		[debouncedSave, file.id, onContentChange],
	);

	useEffect(() => {
		return () => {
			debouncedSave.cancel();
		};
	}, [debouncedSave]);

	const extensions = useMemo(() => {
		const exts: Extension[] = [];
		const lang = getEditorLanguage(file.name);

		if (lang === "markdown") {
			exts.push(markdown({ base: markdownLanguage }));
		} else if (lang === "json") {
			exts.push(json());
		}

		if (config?.autocompleteRules) {
			const autocompleteExt = createAutocompleteExtension(
				config.autocompleteRules,
			);
			if (autocompleteExt) {
				exts.push(autocompleteExt);
			}
		}
		if (config?.softWrap ?? true) {
			exts.push(EditorView.lineWrapping);
		}

		return exts;
	}, [file.name, config?.autocompleteRules, config?.softWrap]);

	if (isLoading) {
		return (
			<div className="flex flex-1 items-center justify-center bg-background text-muted-foreground text-sm">
				Loading {file.name}...
			</div>
		);
	}

	if (error) {
		return (
			<div className="flex flex-1 items-center justify-center bg-background text-destructive text-sm">
				{error}
			</div>
		);
	}

	return (
		<div className="flex h-full flex-col overflow-hidden bg-background">
			<div className="flex h-12 shrink-0 items-center justify-between border-border border-b bg-card px-4">
				<div className="truncate font-medium text-muted-foreground text-xs">
					{file.name}
				</div>
				<div className="flex items-center gap-2 text-muted-foreground text-xs">
					Live Preview
					<Switch
						size="sm"
						checked={isLivePreviewEnabled}
						onCheckedChange={(checked) => onLivePreviewChange(Boolean(checked))}
						aria-label="Live preview toggle"
					/>
				</div>
			</div>
			<ScrollArea className="relative flex-1 overflow-auto">
				<CodeMirror
					value={content}
					onChange={handleChange}
					onBlur={() => {
						debouncedSave.cancel();
						void handleSave(latestContentRef.current);
						onEditorBlur?.(file.id, latestContentRef.current);
					}}
					extensions={extensions}
					theme="none"
					className="inset-0 [&>.cm-editor]:max-w-full text-sm [&>.cm-editor]:h-full [&>.cm-editor]:outline-none [&_.cm-scroller]:font-mono"
					basicSetup={{
						lineNumbers: true,
						highlightActiveLineGutter: true,
						foldGutter: true,
						dropCursor: true,
						allowMultipleSelections: true,
						indentOnInput: true,
						syntaxHighlighting: true,
						bracketMatching: true,
						closeBrackets: true,
						autocompletion: true,
						rectangularSelection: true,
						crosshairCursor: true,
						highlightActiveLine: true,
						highlightSelectionMatches: true,
						closeBracketsKeymap: true,
						defaultKeymap: true,
						searchKeymap: true,
						historyKeymap: true,
						foldKeymap: true,
						completionKeymap: true,
						lintKeymap: true,
					}}
				/>
			</ScrollArea>
		</div>
	);
}
