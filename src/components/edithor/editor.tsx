import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import CodeMirror from "@uiw/react-codemirror";
import type { Extension } from "@codemirror/state";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { json } from "@codemirror/lang-json";

import type { EdithorFile, EdithorAdapter, EdithorConfig } from "./types";
import { getEditorLanguage } from "@/lib/edithor.utils";
import { createAutocompleteExtension } from "./auto-completer";

export interface EdithorEditorProps {
    file: EdithorFile;
    adapter: EdithorAdapter;
    config?: EdithorConfig;
}

export function EdithorEditor({ file, adapter, config }: EdithorEditorProps) {
    const [content, setContent] = useState<string>("");
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    const saveTimeoutRef = useRef<number | null>(null);

    useEffect(() => {
        let isMounted = true;
        setIsLoading(true);
        setError(null);

        adapter
            .onReadFile(file.id)
            .then((data) => {
                if (isMounted) {
                    setContent(data);
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
        (newContent: string) => {
            adapter.onSave(file.id, newContent).catch((err) => {
                console.error("Auto-save failed:", err);
            });
        },
        [file.id, adapter]
    );

    const handleChange = useCallback(
        (value: string) => {
            setContent(value);

            if (saveTimeoutRef.current !== null) {
                window.clearTimeout(saveTimeoutRef.current);
            }

            saveTimeoutRef.current = window.setTimeout(() => {
                handleSave(value);
            }, 800);
        },
        [handleSave]
    );

    useEffect(() => {
        return () => {
            if (saveTimeoutRef.current !== null) {
                window.clearTimeout(saveTimeoutRef.current);
            }
        };
    }, []);

    const extensions = useMemo(() => {
        const exts: Extension[] = [];
        const lang = getEditorLanguage(file.name);

        if (lang === "markdown") {
            exts.push(markdown({ base: markdownLanguage }));
        } else if (lang === "json") {
            exts.push(json());
        }

        if (config?.autocompleteRules) {
            const autocompleteExt = createAutocompleteExtension(config.autocompleteRules);
            if (autocompleteExt) {
                exts.push(autocompleteExt);
            }
        }

        return exts;
    }, [file.name, config?.autocompleteRules]);

    if (isLoading) {
        return (
            <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground bg-background">
                Loading {file.name}...
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex-1 flex items-center justify-center text-sm text-destructive bg-background">
                {error}
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full overflow-hidden bg-background">
            <div className="px-4 py-2 border-b text-sm text-muted-foreground bg-muted/20 select-none flex justify-between items-center shrink-0">
                <span className="font-medium text-foreground">{file.name}</span>
                <span className="text-[10px] opacity-60 uppercase tracking-wider">Auto-saving</span>
            </div>
            <div className="flex-1 overflow-auto relative">
                <CodeMirror
                    value={content}
                    onChange={handleChange}
                    extensions={extensions}
                    theme="none"
                    className="absolute inset-0 text-sm [&>.cm-editor]:h-full [&>.cm-editor]:outline-none [&_.cm-scroller]:font-mono"
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
            </div>
        </div>
    );
}