import type { PipelineResultPayload } from "@/lib/document-pipeline";

type PipelineModule = typeof import("@/lib/document-pipeline");
let pipelineModulePromise: Promise<PipelineModule> | null = null;

function decodeHtmlEntity(entity: string): string {
	const numeric = entity.match(/^&#(\d+);$/);
	if (numeric) {
		const codePoint = Number.parseInt(numeric[1], 10);
		return Number.isFinite(codePoint)
			? String.fromCodePoint(codePoint)
			: entity;
	}

	const hex = entity.match(/^&#x([0-9a-fA-F]+);$/);
	if (hex) {
		const codePoint = Number.parseInt(hex[1], 16);
		return Number.isFinite(codePoint)
			? String.fromCodePoint(codePoint)
			: entity;
	}

	const named: Record<string, string> = {
		"&amp;": "&",
		"&lt;": "<",
		"&gt;": ">",
		"&quot;": '"',
		"&apos;": "'",
		"&nbsp;": "\u00A0",
	};
	return named[entity] ?? entity;
}

function ensureWorkerDocumentPolyfill(): void {
	const globalScope = globalThis as typeof globalThis & Record<string, unknown>;

	if (typeof globalScope.$RefreshSig$ === "undefined") {
		globalScope.$RefreshSig$ = () => (type: unknown) => type;
	}
	if (typeof globalScope.$RefreshReg$ === "undefined") {
		globalScope.$RefreshReg$ = () => undefined;
	}

	if (typeof globalScope.window === "undefined") {
		globalScope.window = globalScope;
	}
	if (typeof globalScope.self === "object" && globalScope.self) {
		const selfScope = globalScope.self as Record<string, unknown>;
		if (typeof selfScope.window === "undefined") {
			selfScope.window = globalScope.window;
		}
	}
	if (typeof globalScope.location === "undefined") {
		globalScope.location = { href: "worker://pipeline" };
	}
	if (typeof globalScope.navigator === "undefined") {
		globalScope.navigator = { userAgent: "worker" };
	}
	if (typeof globalScope.document !== "undefined") return;

	const createStubElement = () => {
		let textContent = "";
		return {
			get textContent() {
				return textContent;
			},
			set textContent(value: string) {
				textContent = value;
			},
			set innerHTML(value: string) {
				textContent = decodeHtmlEntity(value);
			},
			get innerHTML() {
				return textContent;
			},
			appendChild: () => undefined,
			removeChild: () => undefined,
			setAttribute: () => undefined,
			getAttribute: () => null,
			querySelector: () => null,
			querySelectorAll: () => [],
		};
	};

	globalScope.document = {
		createElement: createStubElement,
		createElementNS: createStubElement,
		querySelector: () => null,
		querySelectorAll: () => [],
		body: createStubElement(),
		head: createStubElement(),
	};
}

async function getPipelineModule(): Promise<PipelineModule> {
	if (!pipelineModulePromise) {
		ensureWorkerDocumentPolyfill();
		pipelineModulePromise = import("@/lib/document-pipeline");
	}
	return pipelineModulePromise;
}

self.onmessage = async (event: MessageEvent) => {
	if (event.data.type === "EXECUTE_PIPELINE") {
		try {
			const { buildDocumentModel, enrichDocumentModelForTarget } =
				await getPipelineModule();
			const model = buildDocumentModel(event.data.files);
			const result = enrichDocumentModelForTarget(model, event.data.target);
			const payload: PipelineResultPayload = {
				ast: result.ast,
				content: result.content,
				frontmatter: result.frontmatter,
				citations: result.citations,
				validatedBibEntries: result.validatedBibEntries,
				plots: result.plots,
				template: result.template,
				citationStyle: result.template?.default?.citationStyle || "numeric",
				referenceRegistry: result.resolvedReferences,
				captions: result.captions,
				referenceTargets: result.referenceTargets,
				diagnostics: [
					...result.templateDiagnostics,
					...result.bibDiagnostics,
					...result.assetDiagnostics,
					...result.articleDiagnostics,
					...result.pipelineDiagnostics,
				],
				activePluginIds: result.activePluginIds,
			};
			self.postMessage({
				type: "PIPELINE_SUCCESS",
				requestId: event.data.requestId,
				payload,
			});
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : "Unknown error";
			self.postMessage({
				type: "PIPELINE_ERROR",
				requestId: event.data.requestId,
				error: errorMessage,
			});
		}
	}
};
