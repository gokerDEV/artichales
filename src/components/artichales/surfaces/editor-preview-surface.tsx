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
import { CORE_ARTICLE_FILE, WORKSPACE_UI_STATE_KEY } from "@/lib/workspace";
import { workspaceRepository } from "@/services/workspace.repository";

const SAMPLE_MARKDOWN = `---
title: "Artichales Markdown Showcase"
authors:
  - name: "Goker Cebeci"
    affiliation: "KODKAFA"
    orcid: "0000-0002-1825-0097"
keywords:
  - markdown
  - scientific-writing
  - reproducibility
references:
  - source: "./refs.bib"
---

:::abstract
This document demonstrates core Markdown features, citation and reference tokens, code blocks, math equations, and custom Artichales directives.
:::

# Heading Level 1
Regular paragraph with **bold**, *italic*, ~~strikethrough~~, and \`inline code\`.

## Heading Level 2
Link examples: [Artichales](https://github.com/goker/artichales) and [local ref](#heading-level-3).

### Heading Level 3
Citation tokens: [cite:knuth1984, goker] and [cite: knuth1984, goker].
Cross refs: [ref:plot_1], [ref: plot_1], [ref:datatable_1].

#### Heading Level 4
- Unordered item
- Another item
  - Nested item

##### Heading Level 5
1. Ordered item one
2. Ordered item two
3. Ordered item three

###### Heading Level 6
- [x] Task item checked
- [ ] Task item unchecked

> Blockquote line one.
> Blockquote line two with \`inline\` code.
>
> - Quote list item A
> - Quote list item B

---

## Table Sample

| Metric | Control | Treatment |
| ------ | ------- | --------- |
| Mean   | 0.24    | 0.39      |
| Std    | 0.03    | 0.04      |

## Code Sample

~~~ts
type Result = {
  sample: string;
  od: number;
};

const computeMean = (rows: Result[]): number => {
  const total = rows.reduce((acc, row) => acc + row.od, 0);
  return Number((total / rows.length).toFixed(3));
};
~~~

~~~bash
npm run lint
npm run build
~~~

## Math Sample

Inline math: $E = mc^2$ and $alpha + \beta = gamma$.

Block equation:

$$
\\nabla \\cdot \\vec{E} = \\frac{\\rho}{\\varepsilon_0}
$$

$$
\\int_0^1 x^2\\,dx = \\frac{1}{3}
$$

## Custom Directives

:::plotty[plot_1.json]
caption: "Full-width ribbon plot in two-column print layout"
span: page
breakBefore: page
breakAfter: page
:::

:::datatable[datatable_1.json]
caption: "Column-flow datatable after full-width figure"
span: column
:::

## Footnotes

Footnote example [^note1].

[^note1]: This is a sample footnote rendered by GFM.

## Long Flow Demo

This section intentionally extends content length to force a multi-page print preview.
In two-column mode, text should continue in columns, break into the next page, and keep
header/footer repeated with page numbering.

Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer vehicula, dolor id
euismod tincidunt, sem lorem volutpat velit, in faucibus massa arcu sit amet nibh.

Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer vehicula, dolor id
euismod tincidunt, sem lorem volutpat velit, in faucibus massa arcu sit amet nibh.

Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer vehicula, dolor id
euismod tincidunt, sem lorem volutpat velit, in faucibus massa arcu sit amet nibh.

Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer vehicula, dolor id
euismod tincidunt, sem lorem volutpat velit, in faucibus massa arcu sit amet nibh.

Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer vehicula, dolor id
euismod tincidunt, sem lorem volutpat velit, in faucibus massa arcu sit amet nibh.

Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer vehicula, dolor id
euismod tincidunt, sem lorem volutpat velit, in faucibus massa arcu sit amet nibh.

Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer vehicula, dolor id
euismod tincidunt, sem lorem volutpat velit, in faucibus massa arcu sit amet nibh.
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

@inproceedings{goker,
  author = {Goker Cebeci},
  title = {Composable Markdown Pipelines for Academic Publishing},
  booktitle = {Proceedings of the Open Writing Systems Workshop},
  year = {2025},
  pages = {12--21}
}
`;

const SAMPLE_PLOT = `{
  "data": [
    {
      "type": "surface",
      "x": [1, 2, 3, 4, 5, 6],
      "y": [400, 450, 500, 550, 600, 650],
      "z": [
        [0.2, 0.25, 0.21, 0.18, 0.14, 0.1],
        [0.28, 0.34, 0.3, 0.24, 0.2, 0.16],
        [0.35, 0.42, 0.37, 0.3, 0.24, 0.2],
        [0.31, 0.39, 0.34, 0.28, 0.23, 0.19],
        [0.26, 0.33, 0.29, 0.23, 0.19, 0.15],
        [0.2, 0.27, 0.23, 0.19, 0.15, 0.12]
      ],
      "colorscale": "Viridis",
      "showscale": true
    }
  ],
  "layout": {
    "showlegend": false,
    "autosize": true,
    "width": 600,
    "height": 600,
    "scene": {
      "xaxis": { "title": { "text": "Sample #" } },
      "yaxis": { "title": { "text": "Wavelength" } },
      "zaxis": { "title": { "text": "OD" } }
    }
  },
  "config": {
    "displayModeBar": true
  }
}
`;

const SAMPLE_DATATABLE = `{
  "columns": [
    { "key": "sample", "label": "Sample" },
    { "key": "condition", "label": "Condition" },
    { "key": "mean_od", "label": "Mean OD" },
    { "key": "std_od", "label": "Std Dev" }
  ],
  "rows": [
    { "sample": "A1", "condition": "Control", "mean_od": 0.21, "std_od": 0.02 },
    { "sample": "A2", "condition": "Control", "mean_od": 0.24, "std_od": 0.03 },
    { "sample": "B1", "condition": "Treatment", "mean_od": 0.39, "std_od": 0.04 },
    { "sample": "B2", "condition": "Treatment", "mean_od": 0.42, "std_od": 0.04 },
    { "sample": "C1", "condition": "Recovery", "mean_od": 0.33, "std_od": 0.03 },
    { "sample": "C2", "condition": "Recovery", "mean_od": 0.30, "std_od": 0.03 }
  ]
}
`;

const SAMPLE_TEMPLATE = `{
  "version": 1,
  "journal": {
    "id": "demo-journal",
    "name": "Demo Journal"
  },
  "default": {
    "typography": {
      "fontFamily": {
        "body": "Source Serif 4",
        "heading": "Inter",
        "mono": "JetBrains Mono"
      },
      "fontSize": {
        "body": "11pt",
        "h1": "20pt",
        "h2": "15pt",
        "h3": "12pt"
      },
      "lineHeight": 1.55,
      "textAlign": "justify"
    },
    "colors": {
      "text": "#111111",
      "muted": "#666666",
      "border": "#d1d5db",
      "link": "#0f766e"
    },
    "components": {
      "figure": {
        "captionPosition": "bottom",
        "defaultSpan": "column",
        "spacingBefore": "0",
        "spacingAfter": "0"
      },
      "table": {
        "captionPosition": "bottom",
        "defaultSpan": "column",
        "spacingBefore": "0",
        "spacingAfter": "0"
      }
    },
    "utilities": {
      "cite": "cite",
      "ref": "ref",
      "plot": "plotty",
      "table": "datatable"
    },
    "citationStyle": "numeric"
  },
  "web": {
    "layout": {
      "containerWidth": "800px",
      "containerClass": "shrink-0 rounded-xl border border-border bg-card shadow-sm",
      "containerPaddingClass": "p-12 md:p-16",
      "contentClass": "max-w-none"
    }
  },
  "print": {
    "page": {
      "size": "A4",
      "orientation": "portrait",
      "margin": {
        "top": "24mm",
        "right": "20mm",
        "bottom": "24mm",
        "left": "20mm"
      }
    },
    "layout": {
      "firstPageColumns": 1,
      "defaultPageColumns": 2,
      "columnGap": "7mm"
    },
    "titleBlock": {
      "enabled": true,
      "align": "center",
      "showAuthors": true,
      "showAffiliations": true,
      "showKeywords": true,
      "spacingAfter": "12mm"
    },
    "headerFooter": {
      "enabled": true,
      "firstPage": {
        "header": {
          "left": "",
          "center": "",
          "right": "{title}"
        },
        "footer": {
          "left": "",
          "center": "{pageNumber}",
          "right": ""
        }
      },
      "defaultPage": {
        "header": {
          "left": "",
          "center": "",
          "right": "{title}"
        },
        "footer": {
          "left": "",
          "center": "{pageNumber}",
          "right": ""
        }
      }
    }
  }
}
`;

type WorkspaceUiState = {
	activeFile?: string;
	target?: PreviewTarget;
	scale?: number;
};

const DEFAULT_FILES: Record<string, string> = {
	"article.mda": SAMPLE_MARKDOWN,
	"references.bib": SAMPLE_BIB,
	"template.json": SAMPLE_TEMPLATE,
	"plot_1.json": SAMPLE_PLOT,
	"datatable_1.json": SAMPLE_DATATABLE,
};

const TypedResizableGroup = ResizablePanelGroup as unknown as React.FC<
	React.ComponentProps<typeof ResizablePanelGroup> & {
		direction: "horizontal" | "vertical";
		onLayout?: (sizes: number[]) => void;
	}
>;

export function EditorPreviewSurface() {
	const [files, setFiles] =
		React.useState<Record<string, string>>(DEFAULT_FILES);
	const [activeFile, setActiveFile] = React.useState(CORE_ARTICLE_FILE);
	const [target, setTarget] = React.useState<PreviewTarget>("print");
	const [scale, setScale] = React.useState(100);
	const [workspaceLoading, setWorkspaceLoading] = React.useState(true);
	const [saveError, setSaveError] = React.useState<string | null>(null);
	const pendingPdfExportRef = React.useRef(false);
	const hasLoadedWorkspaceRef = React.useRef(false);
	const isHydratingRef = React.useRef(true);

	React.useEffect(() => {
		let cancelled = false;
		const loadWorkspace = async () => {
			try {
				const loaded = await workspaceRepository.loadWorkspace(DEFAULT_FILES);
				if (cancelled) return;
				setFiles(loaded);

				try {
					const rawState = localStorage.getItem(WORKSPACE_UI_STATE_KEY);
					if (!rawState) return;
					const state = JSON.parse(rawState) as WorkspaceUiState;
					if (state.target === "web" || state.target === "print") {
						setTarget(state.target);
					}
					if (typeof state.scale === "number" && Number.isFinite(state.scale)) {
						setScale(Math.max(50, Math.min(200, Math.round(state.scale))));
					}
					if (
						typeof state.activeFile === "string" &&
						Object.hasOwn(loaded, state.activeFile)
					) {
						setActiveFile(state.activeFile);
					}
				} catch {
					// Ignore malformed UI state and continue with defaults.
				}
			} finally {
				if (!cancelled) {
					hasLoadedWorkspaceRef.current = true;
					isHydratingRef.current = false;
					setWorkspaceLoading(false);
				}
			}
		};

		loadWorkspace();
		return () => {
			cancelled = true;
		};
	}, []);

	React.useEffect(() => {
		if (!hasLoadedWorkspaceRef.current || isHydratingRef.current) return;
		const timeout = window.setTimeout(() => {
			workspaceRepository
				.saveWorkspace(files)
				.then(() => setSaveError(null))
				.catch((error) => {
					console.error("Failed to save workspace:", error);
					setSaveError(
						"Failed to save workspace files. Your latest changes may not persist.",
					);
				});
		}, 500);
		return () => window.clearTimeout(timeout);
	}, [files]);

	React.useEffect(() => {
		try {
			const state: WorkspaceUiState = { activeFile, target, scale };
			localStorage.setItem(WORKSPACE_UI_STATE_KEY, JSON.stringify(state));
		} catch {
			// Best-effort UI continuity state.
		}
	}, [activeFile, target, scale]);

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

	const docSource = useDocument(files, target);
	const blockingReason = docSource.blockingByFile[activeFile];
	const isFileSwitchLocked = typeof blockingReason === "string";

	const handleSelectFile = React.useCallback(
		(fileName: string) => {
			if (isFileSwitchLocked && fileName !== activeFile) return;
			setActiveFile(fileName);
		},
		[activeFile, isFileSwitchLocked],
	);

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

	if (loading || workspaceLoading) {
		return (
			<div className="flex h-[calc(100vh-4rem)] items-center justify-center text-muted-foreground text-sm">
				Loading workspace...
			</div>
		);
	}

	return (
		<CitationContext.Provider
			value={{
				entries: docSource.citations,
				style: docSource.citationStyle,
				citeClassName: docSource.template.utilities?.cite || "cite",
			}}
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
					{isFileSwitchLocked ? (
						<div className="mb-2 rounded-md border border-red-200 bg-red-50 p-2 text-red-700 text-xs">
							{blockingReason}
						</div>
					) : null}
					<FileTree
						activeFile={activeFile}
						files={Object.keys(files)}
						onSelectFile={handleSelectFile}
						disableFileSwitch={isFileSwitchLocked}
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
						value={files[activeFile] || ""}
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
						{saveError ? (
							<div className="border-red-300 border-b bg-red-50 p-3 text-red-700 text-sm">
								{saveError}
							</div>
						) : null}
						{docSource.templateDiagnostics.length > 0 ? (
							<div
								className={`border-b p-3 text-sm ${docSource.hasTemplateError ? "border-red-300 bg-red-50 text-red-700" : "border-amber-300 bg-amber-50 text-amber-700"}`}
							>
								{docSource.templateDiagnostics.map((diag) => (
									<p key={`${diag.code}:${diag.message}`}>
										{diag.message}
										{diag.details ? ` ${diag.details}` : ""}
									</p>
								))}
							</div>
						) : null}
						{docSource.bibDiagnostics.length > 0 ? (
							<div className="border-red-300 border-b bg-red-50 p-3 text-red-700 text-sm">
								{docSource.bibDiagnostics.map((diag) => (
									<p key={`${diag.code}:${diag.message}`}>{diag.message}</p>
								))}
							</div>
						) : null}
						{docSource.articleDiagnostics.length > 0 ? (
							<div className="border-red-300 border-b bg-red-50 p-3 text-red-700 text-sm">
								{docSource.articleDiagnostics.map((diag) => (
									<p key={`${diag.code}:${diag.message}`}>{diag.message}</p>
								))}
							</div>
						) : null}
						{docSource.hasBlockingError ? (
							<div className="flex h-full items-center justify-center p-6 text-center text-muted-foreground text-sm">
								Blocking diagnostics must be fixed before preview rendering can
								continue.
							</div>
						) : target === "web" ? (
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
