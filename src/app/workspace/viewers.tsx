import { TriangleAlert } from "lucide-react";
import { startTransition, useDeferredValue, useEffect, useState } from "react";
import { parseArtichale } from "@/components/artichale/core/artichale.parser";
import { renderArtichale } from "@/components/artichale/core/artichale.render";
import type { EdithorViewerProps } from "@/components/edithor";
import {
	CORE_ARTICLE_FILE,
	CORE_BIB_FILE,
	CORE_TEMPLATE_FILE,
} from "@/lib/workspace";
import { PrintView } from "./print.view";
import { WebView } from "./web.view";

type ViewerMode = "web" | "print";

type ViewerState = {
	status: "idle" | "loading" | "ready" | "error";
	message: string | null;
	parseDiagnostics: string[];
	renderDiagnostics: string[];
	result: Awaited<ReturnType<typeof renderArtichale>> | null;
	template: ReturnType<typeof parseArtichale>["template"] | null;
};

type ViewersProps = EdithorViewerProps & {
	mode: ViewerMode;
	tab: "viewer" | "diagnostics";
};

function inferMimeType(fileName: string): string {
	const ext = fileName.toLowerCase().slice(fileName.lastIndexOf("."));
	if (ext === ".svg") return "image/svg+xml";
	if (ext === ".png") return "image/png";
	if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
	if (ext === ".gif") return "image/gif";
	if (ext === ".json") return "application/json";
	return "text/plain";
}

export function Viewers({ files, methods, mode, tab }: ViewersProps) {
	const deferredFiles = useDeferredValue(files);
	const [state, setState] = useState<ViewerState>({
		status: "idle",
		message: null,
		parseDiagnostics: [],
		renderDiagnostics: [],
		result: null,
		template: null,
	});

	useEffect(() => {
		let cancelled = false;

		startTransition(() => {
			setState((prev) => ({
				...prev,
				status: "loading",
				message: null,
			}));
		});

		const run = async () => {
			try {
				const parse = parseArtichale({
					markdown: (await methods.readAssetText(CORE_ARTICLE_FILE)) ?? {
						data: "",
						lastModified: "",
					},
					template: (await methods.readAssetText(CORE_TEMPLATE_FILE)) ?? {
						data: "",
						lastModified: "",
					},
					bibliography: (await methods.readAssetText(CORE_BIB_FILE)) ?? {
						data: "",
						lastModified: "",
					},
				});

				const render = await renderArtichale({
					target: mode,
					template: parse.template,
					bibliography: parse.bibliography,
					frontmatter: parse.frontmatter,
					ast: parse.ast,
					headings: parse.headings,
					labeledBlocks: parse.labeledBlocks,
					citations: parse.citations,
					fnJSONAssetReader: async <T,>(fileName: string) => {
						const asset = await methods.readJsonAsset<T>(fileName);
						// if (!asset) throw new Error(`Missing JSON asset: ${fileName}`);
						return { data: asset.data, lastModified: asset.lastModified };
					},
					fnAssetResolver: async (fileName: string) => {
						const asset = await methods.readAssetDataUrl(fileName);
						// if (!asset) return null;
						return {
							fileName,
							resolvedSrc: asset.data,
							mimeType: inferMimeType(fileName),
							lastModified: asset.lastModified,
						};
					},
				});

				if (cancelled) return;
				startTransition(() => {
					setState({
						status: "ready",
						message: null,
						parseDiagnostics: parse.diagnostics.map((diag) => diag.message),
						renderDiagnostics: render.diagnostics.map((diag) => diag.message),
						result: render,
						template: parse.template,
					});
				});
			} catch (error) {
				if (cancelled) return;
				startTransition(() => {
					setState({
						status: "error",
						message: error instanceof Error ? error.message : String(error),
						parseDiagnostics: [],
						renderDiagnostics: [],
						result: null,
						template: null,
					});
				});
			}
		};

		void run();
		return () => {
			cancelled = true;
		};
	}, [deferredFiles, methods, mode]);

	const hasDiagnostics =
		state.parseDiagnostics.length > 0 || state.renderDiagnostics.length > 0;

	return (
		<div className="flex min-h-full flex-col gap-3 bg-muted">
			{tab === "diagnostics" ? (
				<div className="border border-amber-300 bg-amber-50 p-3">
					<div className="mb-1 flex items-center gap-2 font-medium text-amber-800 text-sm">
						<TriangleAlert className="h-4 w-4" />
						Diagnostics
					</div>
					{state.status === "loading" ? (
						<div className="text-amber-900 text-xs">
							Collecting diagnostics...
						</div>
					) : hasDiagnostics ? (
						<div className="space-y-1 text-amber-900 text-xs">
							{state.parseDiagnostics.map((message) => (
								<div key={`parse-${message}`}>[parse] {message}</div>
							))}
							{state.renderDiagnostics.map((message) => (
								<div key={`render-${message}`}>[render] {message}</div>
							))}
							{state.message ? <div>[runtime] {state.message}</div> : null}
						</div>
					) : (
						<div className="text-amber-900 text-xs">No diagnostics.</div>
					)}
				</div>
			) : null}

			{tab === "diagnostics" ? null : state.status === "ready" &&
				state.result &&
				state.template ? (
				mode === "print" ? (
					<PrintView template={state.template} result={state.result} />
				) : (
					<WebView template={state.template} result={state.result} />
				)
			) : (
				<div className="py-8 text-center text-muted-foreground text-sm">
					{state.status === "error"
						? "Preview is unavailable due to render failure."
						: "Waiting for render output..."}
				</div>
			)}
		</div>
	);
}
