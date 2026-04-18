import { TriangleAlert } from "lucide-react";
import { startTransition, useDeferredValue, useEffect, useState } from "react";
import { parseArtichale } from "@/components/artichale/core/artichale.parser";
import { renderArtichale } from "@/components/artichale/core/artichale.render";
import type { ParseDiagnostic } from "@/components/artichale/types/pipeline.types";
import type { RenderDiagnostic } from "@/components/artichale/types/render.types";
import type { EdithorViewerProps } from "@/components/edithor";
import {
	CORE_ARTICLE_FILE,
	CORE_BIB_FILE,
	CORE_TEMPLATE_FILE,
} from "@/lib/workspace";
import { PrintView } from "./print.view";
import { WebView } from "./web.view";

type ViewerMode = "web" | "print";

type RuntimeDiagnostic = {
	source: "runtime";
	severity: "error";
	code: "preview-render-failed";
	message: string;
	details?: string;
	stack?: string;
};

type ViewerState = {
	status: "idle" | "loading" | "ready" | "error";
	runtimeDiagnostic: RuntimeDiagnostic | null;
	parseDiagnostics: readonly ParseDiagnostic[];
	renderDiagnostics: readonly RenderDiagnostic[];
	result: Awaited<ReturnType<typeof renderArtichale>> | null;
	template: ReturnType<typeof parseArtichale>["template"] | null;
	templateLastModified: string;
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

function formatLocation(diagnostic: {
	line?: number;
	column?: number;
	offset?: number;
}): string | null {
	if (
		typeof diagnostic.line === "number" &&
		typeof diagnostic.column === "number"
	) {
		return `line ${diagnostic.line}, column ${diagnostic.column}`;
	}
	if (typeof diagnostic.line === "number") {
		return `line ${diagnostic.line}`;
	}
	if (typeof diagnostic.offset === "number") {
		return `offset ${diagnostic.offset}`;
	}
	return null;
}

function formatRuntimeDiagnostic(error: unknown): RuntimeDiagnostic {
	if (error instanceof Error) {
		return {
			source: "runtime",
			severity: "error",
			code: "preview-render-failed",
			message: error.message || error.name,
			details: error.name !== "Error" ? error.name : undefined,
			stack: error.stack,
		};
	}

	return {
		source: "runtime",
		severity: "error",
		code: "preview-render-failed",
		message: String(error),
	};
}

function DiagnosticCard({
	diagnostic,
}: {
	diagnostic: ParseDiagnostic | RenderDiagnostic | RuntimeDiagnostic;
}) {
	const location =
		"line" in diagnostic || "offset" in diagnostic
			? formatLocation(diagnostic)
			: null;

	return (
		<div className="rounded border border-amber-300 bg-white/70 p-3 text-amber-950">
			<div className="flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-wide">
				<span className="rounded bg-amber-100 px-1.5 py-0.5 font-semibold">
					{diagnostic.severity}
				</span>
				<span>{diagnostic.source}</span>
				<span>{diagnostic.code}</span>
				{"pluginId" in diagnostic && diagnostic.pluginId ? (
					<span>plugin: {diagnostic.pluginId}</span>
				) : null}
				{location ? <span>{location}</span> : null}
			</div>
			<div className="mt-2 font-medium text-sm">{diagnostic.message}</div>
			{"details" in diagnostic && diagnostic.details ? (
				<pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-words rounded bg-amber-50 p-2 text-xs">
					{diagnostic.details}
				</pre>
			) : null}
			{"stack" in diagnostic && diagnostic.stack ? (
				<pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-words rounded bg-amber-50 p-2 text-xs">
					{diagnostic.stack}
				</pre>
			) : null}
		</div>
	);
}

export function Viewers({ files, methods, mode, tab }: ViewersProps) {
	const deferredFiles = useDeferredValue(files);
	const [state, setState] = useState<ViewerState>({
		status: "idle",
		runtimeDiagnostic: null,
		parseDiagnostics: [],
		renderDiagnostics: [],
		result: null,
		template: null,
		templateLastModified: "",
	});

	useEffect(() => {
		let cancelled = false;

		startTransition(() => {
			setState((prev) => ({
				...prev,
				status: "loading",
				runtimeDiagnostic: null,
			}));
		});

		const run = async () => {
			try {
				const markdown = (await methods.readAssetText(CORE_ARTICLE_FILE)) ?? {
					data: "",
					lastModified: "",
				};
				const template = (await methods.readAssetText(CORE_TEMPLATE_FILE)) ?? {
					data: "",
					lastModified: "",
				};
				const bibliography = (await methods.readAssetText(CORE_BIB_FILE)) ?? {
					data: "",
					lastModified: "",
				};
				const parse = parseArtichale({
					markdown,
					template,
					bibliography,
				});

				const render = await renderArtichale({
					target: mode,
					lastModified: {
						markdown: markdown.lastModified,
						template: template.lastModified,
						bibliography: bibliography.lastModified,
					},
					template: parse.template,
					bibliography: parse.bibliography,
					frontmatter: parse.frontmatter,
					ast: parse.ast,
					headings: parse.headings,
					labeledBlocks: parse.labeledBlocks,
					citations: parse.citations,
					plugins: parse.plugins,
					fnJSONAssetReader: async <T,>(fileName: string) => {
						const asset = await methods.readJsonAsset<T>(fileName);
						if (!asset) {
							return { data: {} as T, lastModified: "" };
						}
						return {
							data: asset.data,
							lastModified: asset.lastModified ?? "",
						};
					},
					fnAssetResolver: async (fileName: string) => {
						const asset = await methods.readAssetDataUrl(fileName);
						if (!asset) return null;
						return {
							fileName,
							resolvedSrc: asset.data,
							mimeType: inferMimeType(fileName),
							lastModified: asset.lastModified ?? "",
						};
					},
				});

				if (cancelled) return;
				startTransition(() => {
					setState({
						status: "ready",
						runtimeDiagnostic: null,
						parseDiagnostics: parse.diagnostics,
						renderDiagnostics: render.diagnostics,
						result: render,
						template: parse.template,
						templateLastModified: template.lastModified,
					});
				});
			} catch (error) {
				if (cancelled) return;
				console.error("Artichale preview render failed:", error);
				const runtimeDiagnostic = formatRuntimeDiagnostic(error);
				startTransition(() => {
					setState({
						status: "error",
						runtimeDiagnostic,
						parseDiagnostics: [],
						renderDiagnostics: [],
						result: null,
						template: null,
						templateLastModified: "",
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
		state.parseDiagnostics.length > 0 ||
		state.renderDiagnostics.length > 0 ||
		Boolean(state.runtimeDiagnostic);

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
						<div className="space-y-2 text-xs">
							{state.parseDiagnostics.map((diagnostic, index) => (
								<DiagnosticCard
									key={`parse-${diagnostic.code}-${diagnostic.message}-${index}`}
									diagnostic={diagnostic}
								/>
							))}
							{state.renderDiagnostics.map((diagnostic, index) => (
								<DiagnosticCard
									key={`render-${diagnostic.code}-${diagnostic.message}-${index}`}
									diagnostic={diagnostic}
								/>
							))}
							{state.runtimeDiagnostic ? (
								<DiagnosticCard diagnostic={state.runtimeDiagnostic} />
							) : null}
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
					<PrintView
						template={state.template}
						templateLastModified={state.templateLastModified}
						result={state.result}
					/>
				) : (
					<WebView template={state.template} result={state.result} />
				)
			) : (
				<div className="py-8 text-center text-muted-foreground text-sm">
					{state.status === "error" ? (
						<div className="space-y-2">
							<div>Preview is unavailable due to render failure.</div>
							{state.runtimeDiagnostic ? (
								<pre className="mx-auto max-w-3xl whitespace-pre-wrap break-words rounded border border-amber-300 bg-amber-50 p-3 text-left text-xs text-amber-900">
									{[
										state.runtimeDiagnostic.message,
										state.runtimeDiagnostic.details,
										state.runtimeDiagnostic.stack,
									]
										.filter(Boolean)
										.join("\n\n")}
								</pre>
							) : null}
						</div>
					) : (
						"Waiting for render output..."
					)}
				</div>
			)}
		</div>
	);
}
