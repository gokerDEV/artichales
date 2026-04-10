type PipelineModule = typeof import("@/lib/document-pipeline");
let pipelineModulePromise: Promise<PipelineModule> | null = null;

function decodeHtmlEntity(entity: string): string {
	const numeric = entity.match(/^&#(\d+);$/);
	if (numeric) {
		const codePoint = Number.parseInt(numeric[1], 10);
		return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : entity;
	}

	const hex = entity.match(/^&#x([0-9a-fA-F]+);$/);
	if (hex) {
		const codePoint = Number.parseInt(hex[1], 16);
		return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : entity;
	}

	const named: Record<string, string> = {
		"&amp;": "&",
		"&lt;": "<",
		"&gt;": ">",
		"&quot;": "\"",
		"&apos;": "'",
		"&nbsp;": "\u00A0",
	};
	return named[entity] ?? entity;
}

function ensureWorkerDocumentPolyfill(): void {
	const globalAny = globalThis as any;

	if (typeof globalAny.$RefreshSig$ === "undefined") {
		globalAny.$RefreshSig$ = () => (type: unknown) => type;
	}
	if (typeof globalAny.$RefreshReg$ === "undefined") {
		globalAny.$RefreshReg$ = () => undefined;
	}

	if (typeof globalAny.window === "undefined") {
		globalAny.window = globalAny;
	}
	if (typeof globalAny.self === "object" && globalAny.self) {
		if (typeof globalAny.self.window === "undefined") {
			globalAny.self.window = globalAny.window;
		}
	}
	if (typeof globalAny.location === "undefined") {
		globalAny.location = { href: "worker://pipeline" };
	}
	if (typeof globalAny.navigator === "undefined") {
		globalAny.navigator = { userAgent: "worker" };
	}
	if (typeof globalAny.document !== "undefined") return;

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

	globalAny.document = {
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
			const { runDocumentPipeline } = await getPipelineModule();
			const result = runDocumentPipeline(event.data.files, event.data.target);
			self.postMessage({
				type: "PIPELINE_SUCCESS",
				requestId: event.data.requestId,
				payload: {
					ast: result.ast, // make sure runDocumentPipeline produces an AST instead of/in addition to raw html!
					content: result.content,
					frontmatter: result.frontmatter,
					citations: result.citations,
					validatedBibEntries: result.validatedBibEntries,
					plots: result.plots,
					template: result.template,
					citationStyle: result.template?.default?.citationStyle || "numeric",
					referenceRegistry: result.resolvedReferences,
					referenceTargets: result.referenceTargets,
					diagnostics: [
						...result.templateDiagnostics,
						...result.bibDiagnostics,
						...result.assetDiagnostics,
						...result.articleDiagnostics,
						...result.pipelineDiagnostics,
					],
					activePluginIds: result.activePluginIds,
				},
			});
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : "Unknown error";
			self.postMessage({
				type: "PIPELINE_ERROR",
				requestId: event.data.requestId,
				error: errorMessage,
			});
		}
	}
};
