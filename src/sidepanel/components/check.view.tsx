import type React from "react";
import { useEffect, useRef, useState } from "react";
import { XIcon } from "lucide-react";
import { HeatmapRow, MATCH_COLUMNS } from "@/components/common/heatmap.row";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { generateReport } from "@/lib/report.utils";
import type { Inputs, Metrics } from "@/lib/types/engine";
import type {
	RUN_ANALYSIS_MESSAGE,
	RUN_ANALYSIS_RESPONSE,
} from "@/services/messaging";
import { MetaTab } from "./tabs/meta.tab";
import { AccessibilityTab } from "./tabs/accessibility.tab";
import { TechnicalTab } from "./tabs/technical.tab";
import { ContextualTab } from "./tabs/contextual.tab";
import { HierarchyTab } from "./tabs/hierarchy.tab";
import { cn } from "@/lib/utils";

// ── Constants ──────────────────────────────────────────────────────────────

const SESSION_TAB_KEY = "match_last_tab_id";

// Maps each MATCH column letter to its detail tab component
const TAB_COMPONENTS: Record<string, React.FC<{ metrics: Metrics | null }>> = {
	M: MetaTab,
	A: AccessibilityTab,
	T: TechnicalTab,
	C: ContextualTab,
	H: HierarchyTab,
};

// ── Helpers ────────────────────────────────────────────────────────────────

const fetchActiveTab = async (): Promise<{
	tabId: number;
	url: string;
} | null> => {
	try {
		const result = await chrome.storage.session.get(SESSION_TAB_KEY);
		const tabId = result[SESSION_TAB_KEY];
		if (typeof tabId !== "number") return null;
		const tab = await chrome.tabs.get(tabId);
		if (tab?.id && tab.url) return { tabId: tab.id, url: tab.url };
		return null;
	} catch {
		return null;
	}
};

// ── Component ──────────────────────────────────────────────────────────────

export const CheckView: React.FC = () => {
	const [url, setUrl] = useState("");
	const [searchTerm, setSearchTerm] = useState("");
	const [isAnalyzing, setIsAnalyzing] = useState(false);
	const [scores, setScores] = useState<number[] | null>(null);
	const [fullMetrics, setFullMetrics] = useState<Metrics | null>(null);
	const [fullInputs, setFullInputs] = useState<Inputs | null>(null);
	const [error, setError] = useState<string | null>(null);

	// The letter of the currently open column detail panel (null = closed)
	const [activeTab, setActiveTab] = useState<string | null>(null);

	// Ref to the button row — overlay starts from here
	const buttonRowRef = useRef<HTMLDivElement>(null);
	const [overlayTop, setOverlayTop] = useState(0);

	useEffect(() => {
		fetchActiveTab().then((tab) => {
			if (tab) setUrl(tab.url);
		});
	}, []);

	// Recalculate overlay top whenever a tab is opened
	const handleOpenTab = (letter: string) => {
		if (buttonRowRef.current) {
			const rect = buttonRowRef.current.getBoundingClientRect();
			setOverlayTop(rect.top);
		}
		setActiveTab((prev) => (prev === letter ? null : letter));
	};

	const handleAnalyze = async (e?: React.FormEvent | React.MouseEvent) => {
		if (e) e.preventDefault();

		let isForce = false;
		if (e && "nativeEvent" in e && e.nativeEvent instanceof MouseEvent) {
			isForce = e.nativeEvent.ctrlKey || e.nativeEvent.metaKey;
		} else if (e && "ctrlKey" in e) {
			isForce =
				(e as React.MouseEvent).ctrlKey || (e as React.MouseEvent).metaKey;
		}

		setIsAnalyzing(true);
		setError(null);
		setScores(null);
		setActiveTab(null);

		try {
			if (typeof chrome === "undefined" || !chrome.tabs || !chrome.runtime) {
				throw new Error(
					"Chrome APIs are not available. Please run inside the extension.",
				);
			}

			const tab = await fetchActiveTab();
			if (!tab) {
				throw new Error(
					"No active browser tab found. Please make sure a regular web page is open.",
				);
			}

			setUrl(tab.url);

			const message: RUN_ANALYSIS_MESSAGE = {
				type: "RUN_ANALYSIS",
				payload: {
					searchTerm,
					tabId: tab.tabId,
					url: tab.url,
					force: isForce,
				},
			};

			const response = await chrome.runtime.sendMessage<
				RUN_ANALYSIS_MESSAGE,
				RUN_ANALYSIS_RESPONSE
			>(message);

			if (
				response?.success &&
				response.scores &&
				response.metrics &&
				response.inputs
			) {
				setScores(response.scores);
				setFullMetrics(response.metrics);
				setFullInputs(response.inputs);
			} else {
				throw new Error(
					response?.error ||
					"Analysis failed. Make sure the page has fully loaded and is a valid HTTP(s) URL.",
				);
			}
		} catch (err: unknown) {
			setError(err instanceof Error ? err.message : "Unknown error occurred.");
		} finally {
			setIsAnalyzing(false);
		}
	};

	const handleDownload = () => {
		if (!scores || !fullMetrics || !fullInputs) return;
		const report = generateReport(fullInputs, fullMetrics);
		const blob = new Blob([JSON.stringify(report, null, 2)], {
			type: "application/json",
		});
		const blobUrl = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = blobUrl;
		a.download = `match-report-${Date.now()}.json`;
		a.click();
		URL.revokeObjectURL(blobUrl);
	};

	const activeCol = activeTab
		? MATCH_COLUMNS.find((c) => c.letter === activeTab)
		: null;
	const ActiveTabComponent = activeTab ? TAB_COMPONENTS[activeTab] : null;

	return (
		<div className="relative flex h-full flex-col bg-background overflow-hidden">
			{/* ── Main scrollable content ── */}
			<div className="flex flex-col gap-4 overflow-y-auto p-4 flex-1">
				{/* Heatmap + clickable column headers */}
				<div className="mt-2 flex flex-col gap-2">
					<div className="grid grid-cols-5 gap-1 text-center font-bold text-[8px] text-muted-foreground uppercase tracking-wider">
						{MATCH_COLUMNS.map((col) => (
							<button
								key={col.letter}
								type="button"
								onClick={() => handleOpenTab(col.letter)}
								className={cn(
									"flex flex-col items-center justify-end gap-0.5 rounded transition-opacity",
									"hover:opacity-75 active:opacity-50 uppercase",
									activeTab === col.letter && "opacity-100",
								)}
								aria-label={`View ${col.title} metrics`}
							>
								<span>{col.short}</span>
								<div
									className="flex h-5 w-full items-center justify-center rounded-sm font-extrabold text-sm text-white"
									style={{ backgroundColor: col.ideal }}
								>
									{col.title.charAt(0)}
								</div>
							</button>
						))}
					</div>
					<HeatmapRow
						scores={scores || []}
						loading={isAnalyzing}
						onColumnClick={handleOpenTab}
					/>
				</div>

				{/* Analysis form */}
				<form onSubmit={handleAnalyze} className="flex flex-col gap-4">
					<div className="flex flex-col gap-2">
						<Label
							htmlFor="url-input"
							className="text-muted-foreground text-xs"
						>
							Active URL
						</Label>
						<Input
							id="url-input"
							type="text"
							readOnly
							value={url}
							className="bg-muted/50 text-xs"
						/>
					</div>
					<div className="flex flex-col gap-2">
						<Label
							htmlFor="search-input"
							className="text-muted-foreground text-xs"
						>
							Search Term Context{" "}
							<span className="font-normal opacity-70">(Optional)</span>
						</Label>
						<Input
							id="search-input"
							type="text"
							value={searchTerm}
							onChange={(e) => setSearchTerm(e.target.value)}
							placeholder="Enter keyword for relevancy check..."
							className="text-sm"
						/>
					</div>

					{/* This row is the overlay anchor point */}
					<div ref={buttonRowRef}>
						<Button
							type="submit"
							onClick={handleAnalyze}
							disabled={isAnalyzing || !url}
							className="w-full"
						>
							{isAnalyzing ? "Analyzing..." : "Start Analysis"}
						</Button>
					</div>
				</form>

				{error && (
					<div className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-destructive text-xs leading-relaxed">
						<strong>Error:</strong> {error}
					</div>
				)}

				<div className="flex items-center justify-between border-t pt-2 text-xs">
					<Button
						size="xs"
						onClick={() => {
							chrome.storage.local.set(
								{ dashboard_sync: { url, searchTerm, scores } },
								() => {
									window.open(chrome.runtime.getURL("app.html"), "_blank");
								},
							);
						}}
					>
						Open Dashboard
					</Button>
					<Button
						variant="outline"
						size="xs"
						disabled={!scores}
						onClick={handleDownload}
					>
						Download JSON
					</Button>
				</div>
			</div>

			{/* ── Detail overlay panel ──
			    Starts from the top of the "Start Analysis" button row and fills
			    the rest of the panel to the bottom. Slides in from below. */}
			{ActiveTabComponent && activeCol && (
				<div
					className="absolute inset-x-0 bottom-0 z-20 flex flex-col bg-background shadow-lg border-t"
					style={{ top: `${overlayTop}px` }}
				>
					{/* Overlay header */}
					<div
						className="flex items-center justify-between px-4 py-2 border-b"
						style={{ borderColor: activeCol.ideal + "44" }}
					>
						<div className="flex items-center gap-2">
							<span
								className="flex h-5 w-5 items-center justify-center rounded-sm text-xs font-extrabold text-white"
								style={{ backgroundColor: activeCol.ideal }}
							>
								{activeCol.letter}
							</span>
							<span className="text-sm font-semibold">{activeCol.title}</span>
						</div>
						<button
							type="button"
							onClick={() => setActiveTab(null)}
							aria-label="Close"
							className="rounded-sm p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
						>
							<XIcon className="size-4" />
						</button>
					</div>

					{/* Scrollable metric list */}
					<div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
						<ActiveTabComponent metrics={fullMetrics} />
					</div>
				</div>
			)}
		</div>
	);
};
