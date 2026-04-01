import * as React from "react";
import { MdxEditor } from "@/components/artichales/editor/mdx-editor";
import { FileTree } from "@/components/artichales/panels/file-tree";
import {
	PreviewHeader,
	type PreviewTarget,
} from "@/components/artichales/panels/preview-header";
import { CitationContext } from "@/components/artichales/plugins/citation.context";
import { PrintPreview } from "@/components/artichales/preview/print/print-preview";
import { WebPreview } from "@/components/artichales/preview/web/web-preview";
import {
	ResizableHandle,
	ResizablePanel,
	ResizablePanelGroup,
} from "@/components/ui/resizable";
import { useDocument } from "@/hooks/use-document";
import { useSettings } from "@/hooks/use-settings";

const SAMPLE_MARKDOWN = `---
title: "A Shared Markdown Pipeline"
authors:
  - name: "Goker Cebeci"
    affiliation: "KODKAFA"
    orcid: "0000-0002-1825-0097"
keywords:
  - markdown
  - publishing
template: "classic"
references:
  - style: "ieee"
  - source: "./refs.bib"
---

:::abstract
Lorem ipsum dolor sit amet.
:::

# Introduction
Lorem ipsum dolor sit amet [cite:knuth1984].
`;

const SAMPLE_BIB = `@article{knuth1984,
  author = {Donald E. Knuth},
  title = {Literate Programming},
  journal = {The Computer Journal},
  year = {1984},
  volume = {27},
  number = {2},
  pages = {97--111}
}
`;

const STORAGE_KEY = "artichales-editor-autosave";

const TypedResizableGroup = ResizablePanelGroup as unknown as React.FC<
	React.ComponentProps<typeof ResizablePanelGroup> & {
		direction: "horizontal" | "vertical";
		onLayout?: (sizes: number[]) => void;
	}
>;

export function EditorPreviewSurface() {
	const [files, setFiles] = React.useState<Record<string, string>>(() => {
		try {
			const saved = localStorage.getItem(STORAGE_KEY);
			if (saved) return JSON.parse(saved);
		} catch {}
		return {
			"article.mdx": SAMPLE_MARKDOWN,
			"references.bib": SAMPLE_BIB,
		};
	});
	const [activeFile, setActiveFile] = React.useState("article.mdx");
	const [target, setTarget] = React.useState<PreviewTarget>("print");
	const [scale, setScale] = React.useState(100);
	const pendingPdfExportRef = React.useRef(false);

	React.useEffect(() => {
		const timeout = setTimeout(() => {
			localStorage.setItem(STORAGE_KEY, JSON.stringify(files));
		}, 800);
		return () => clearTimeout(timeout);
	}, [files]);

	const { settings, updateSettings, loading } = useSettings();
	const layoutTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(
		null,
	);

	const handleFileChange = (content: string) => {
		setFiles((prev) => ({ ...prev, [activeFile]: content }));
	};

	const savedSizes = settings.ux?.editorPanelSizes || [15, 40, 45];
	const sizesRef = React.useRef<number[]>([...savedSizes]);

	const handleResize = React.useCallback(
		(index: number, size: unknown) => {
			if (typeof size !== "number") return;
			sizesRef.current[index] = size;
			if (layoutTimerRef.current) clearTimeout(layoutTimerRef.current);
			layoutTimerRef.current = setTimeout(() => {
				console.log(
					"🟢 [Artichales] Valid Resize Captured! Saving =>",
					sizesRef.current,
				);
				updateSettings({
					ux: { ...settings.ux, editorPanelSizes: [...sizesRef.current] },
				});
			}, 300);
		},
		[settings.ux, updateSettings],
	);

	const docSource = useDocument(files, activeFile, target);

	const runPdfExport = React.useCallback(() => {
		globalThis.document.body.setAttribute("data-artichales-printing", "true");
		window.requestAnimationFrame(() => {
			window.print();
		});
	}, []);

	const handleExportPdf = React.useCallback(() => {
		if (target === "print") {
			runPdfExport();
			return;
		}
		pendingPdfExportRef.current = true;
		setTarget("print");
	}, [target, runPdfExport]);

	React.useEffect(() => {
		const resetPrintState = () => {
			globalThis.document.body.removeAttribute("data-artichales-printing");
		};

		window.addEventListener("afterprint", resetPrintState);
		return () => {
			window.removeEventListener("afterprint", resetPrintState);
		};
	}, []);

	React.useEffect(() => {
		if (target !== "print" || !pendingPdfExportRef.current) return;
		pendingPdfExportRef.current = false;

		const timeout = window.setTimeout(() => {
			runPdfExport();
		}, 50);

		return () => window.clearTimeout(timeout);
	}, [target, runPdfExport]);

	if (loading) {
		return (
			<div className="flex h-[calc(100vh-4rem)] items-center justify-center text-muted-foreground text-sm">
				Loading workspace...
			</div>
		);
	}

	return (
		<CitationContext.Provider
			value={{ entries: docSource.citations, style: docSource.citationStyle }}
		>
			<TypedResizableGroup
				direction="horizontal"
				className="h-[calc(100vh-4rem)] overflow-hidden"
			>
				<ResizablePanel
					defaultSize={savedSizes[0] || 15}
					minSize={10}
					className="flex flex-col p-2"
					onResize={(size) => handleResize(0, size)}
				>
					<FileTree
						activeFile={activeFile}
						files={Object.keys(files)}
						onSelectFile={setActiveFile}
					/>
				</ResizablePanel>
				<ResizableHandle withHandle />
				<ResizablePanel
					defaultSize={savedSizes[1] || 40}
					minSize={25}
					className="flex flex-col border-border border-r bg-muted/30"
					onResize={(size) => handleResize(1, size)}
				>
					<MdxEditor
						value={files[activeFile]}
						onChange={handleFileChange}
						label={activeFile}
					/>
				</ResizablePanel>
				<ResizableHandle withHandle />
				<ResizablePanel
					defaultSize={savedSizes[2] || 45}
					minSize={30}
					className="flex flex-col bg-muted/30"
					onResize={(size) => handleResize(2, size)}
				>
					<PreviewHeader
						target={target}
						onTargetChange={setTarget}
						scale={scale}
						onScaleChange={setScale}
						onExportPdf={handleExportPdf}
					/>
					<div className="relative grow overflow-hidden">
						{target === "web" ? (
							<WebPreview document={docSource} scale={scale} />
						) : (
							<PrintPreview document={docSource} scale={scale} />
						)}
					</div>
				</ResizablePanel>
			</TypedResizableGroup>
		</CitationContext.Provider>
	);
}
