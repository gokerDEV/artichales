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
	type RefreshSig = () => (type: unknown) => unknown;
	type RefreshReg = () => void;
	type WorkerLikeLocation = { href: string };
	type WorkerLikeNavigator = { userAgent: string };
	type StubElement = {
		textContent: string;
		innerHTML: string;
		appendChild: (node: unknown) => void;
		removeChild: (node: unknown) => void;
		setAttribute: (name: string, value: string) => void;
		getAttribute: (name: string) => string | null;
		querySelector: (selectors: string) => StubElement | null;
		querySelectorAll: (selectors: string) => StubElement[];
	};
	type StubDocument = {
		createElement: (tagName: string) => StubElement;
		createElementNS: (
			namespaceURI: string,
			qualifiedName: string,
		) => StubElement;
		querySelector: (selectors: string) => StubElement | null;
		querySelectorAll: (selectors: string) => StubElement[];
		body: StubElement;
		head: StubElement;
	};
	const globalScope = globalThis as unknown as Record<string, unknown>;

	if (typeof globalScope.$RefreshSig$ === "undefined") {
		const refreshSig: RefreshSig = () => (type: unknown) => type;
		globalScope.$RefreshSig$ = refreshSig;
	}
	if (typeof globalScope.$RefreshReg$ === "undefined") {
		const refreshReg: RefreshReg = () => undefined;
		globalScope.$RefreshReg$ = refreshReg;
	}

	if (typeof globalScope.window === "undefined") {
		globalScope.window = globalScope;
	}
	if (typeof globalScope.self === "object" && globalScope.self) {
		const selfScope = globalScope.self as Record<string, unknown>;
		if (typeof selfScope.window === "undefined") {
			selfScope.window = globalScope.window;
		}
	} else {
		globalScope.self = globalScope;
	}
	if (typeof globalScope.location === "undefined") {
		const location: WorkerLikeLocation = { href: "worker://pipeline" };
		globalScope.location = location;
	}
	if (typeof globalScope.navigator === "undefined") {
		const navigator: WorkerLikeNavigator = { userAgent: "worker" };
		globalScope.navigator = navigator;
	}
	if (typeof globalScope.document !== "undefined") return;

	const createStubElement = (): StubElement => {
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

	const documentPolyfill: StubDocument = {
		createElement: createStubElement,
		createElementNS: createStubElement,
		querySelector: () => null,
		querySelectorAll: () => [],
		body: createStubElement(),
		head: createStubElement(),
	};

	globalScope.document = documentPolyfill;
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
			const payload: PipelineResultPayload = {
				parsedTemplate: result.template,
				parsedBibliography: result.bibliography,
				parsedArticle: result.article,
				diagnostics: result.diagnostics,
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
